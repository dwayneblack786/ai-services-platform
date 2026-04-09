# RAG Document Upload — Implementation Plan

## Context

The RAG system is ~60% complete. Website scraping, chunking, keyword retrieval, and the RAG source manager UI all exist. What is missing is **file upload** (PDF, DOCX, TXT), **vector embeddings**, **MongoDB vector search**, and **end-to-end injection of retrieved context into the chat pipeline**.

MongoDB is local (`localhost:27017`), not Atlas. Vector search will use MongoDB's built-in Atlas-compatible `$vectorSearch` aggregation, which is available in MongoDB 7.0+ with the Atlas Vector Search local emulation or via Atlas free-tier migration.

---

## Option A — MongoDB Native Vector Search (Recommended)

### What It Is
- Store embedding vectors directly in `rag_documents.chunks[].embedding` (already modeled)
- Create a MongoDB Atlas Vector Search index on that field
- Query via `$vectorSearch` aggregation pipeline at retrieval time
- Embeddings generated via LangChain + a local or cloud model

### Pros
- **No new infrastructure** — same MongoDB instance, same Mongoose models
- `RagDocument` schema already has `chunks[].embedding: number[]` and `vectorStore` fields ready
- `PromptVersion.content.ragConfig.vectorStore` schema already defined
- LangChain + `@langchain/community` already installed
- Single store for text chunks and vectors (no separate Pinecone/Weaviate service)
- Free on Atlas M0 (free tier); no extra cost on local dev with `mongod 7+`

### Cons
- Requires MongoDB 7.0+ (or Atlas) for `$vectorSearch`
- Local `mongod` may need upgrade or Atlas migration
- Embedding generation adds latency to the sync/upload step (not to retrieval)
- No built-in reranking (can add as a post-retrieval step)

---

## Option B — External Vector Store (Pinecone / Weaviate)

### What It Is
- Push chunks + embeddings to an external vector database
- Query that service at chat time for top-K results
- MongoDB stores source metadata; vectors live externally

### Pros
- Best-in-class ANN performance at scale
- Managed service, no index management

### Cons
- **New dependency** and API key management
- Additional network hop at query time
- `vectorStore.apiKey` / `endpoint` fields on the schema were placeholders for this
- Overkill for current scale (< 100 prompts, < 1GB documents)

---

## Option C — Keep Keyword Retrieval (No Vectors)

### What It Is
- Extend the existing TF-IDF keyword scorer to support uploaded files
- Skip embeddings entirely

### Pros
- Simplest; no model dependencies
- Works with current local MongoDB

### Cons
- Semantic misses — keyword search fails on paraphrases
- Cannot answer "what medications treat X?" from a document that says "drugs for X"
- Not scalable; ruled out for production AI context use

---

## Decision: Option A

MongoDB native vector search is the right fit. The schema already supports it, LangChain is already installed, and it keeps the stack unified.

## Confirmed Implementation Decisions

- **Embedding tier:** LM Studio local (`LM_STUDIO_URL`) — same client pattern already used in `prompt-testing.service.ts`; falls back to keyword retrieval if LM Studio is unavailable
- **File storage:** Extract text → store in `RagDocument.extractedText` → discard original file (no disk or GridFS overhead)

---

## Multi-Tenancy

All `rag_documents` records are tenant-scoped. The schema already has a `tenantId` field — every query, write, and vector search must enforce it.

### Data Isolation

- Every `RagDocument` created via upload or website sync must have `tenantId` set from the authenticated request context — never inferred from the document itself
- All `rag.service.ts` read methods (`retrieve()`, `retrieveForPrompt()`, `listSources()`) must include `{ tenantId }` as a mandatory filter — no query is permitted without it
- RAG routes must validate that the `promptVersionId` in the URL belongs to the requesting tenant before reading or writing any documents; cross-tenant access returns 403

### Vector Search Isolation

- MongoDB `$vectorSearch` does not automatically scope results by tenant
- Every `$vectorSearch` aggregation must include a pre-filter stage on `tenantId` — without this, a tenant's query could surface another tenant's chunks
- The pre-filter is applied before the ANN (approximate nearest neighbor) search, so it also improves performance by reducing the candidate set

### Index Design

- Existing compound index `{ tenantId: 1, promptVersionId: 1 }` on `rag_documents` already supports tenant-scoped lookups — confirm it is present and used for all non-vector retrieval paths
- Add `{ tenantId: 1, sourceId: 1 }` compound index for the source-level sync and status queries

### Storage Quotas

- Track total `fileSize` per tenant as a derived sum across `rag_documents` — no extra field needed; query with `$group` on `tenantId`
- Enforce a per-tenant storage cap via env var `RAG_MAX_STORAGE_PER_TENANT_BYTES` (default: `5368709120` / 5 GB)
- Quota check runs at upload time before text extraction; returns 413 with a clear message if exceeded

### No Shared Embeddings

- Each tenant's document chunks are embedded and stored independently — there is no shared embedding pool
- Even if two tenants upload identical files, they produce separate `RagDocument` records and separate embeddings
- This prevents any indirect information leakage through embedding similarity scores

### Seed Script

- `seed-rag-medical-context.ts` must explicitly set `tenantId: 'tenant-default'` on every inserted `RagDocument` record
- The seed script must not insert documents without a `tenantId` — add a pre-insert assertion to catch this

### Audit Trail

- Every RAG document create, update, delete, and retrieval event should log `{ tenantId, promptVersionId, action, actor, timestamp }` — reuse the existing `prompt_audit_log` pattern or a dedicated `rag_audit_log` collection

---

## Implementation Phases

### Phase 1 — File Upload Backend

**Files to create / modify:**
- `backend-node/src/routes/rag-routes.ts` — add `POST /:promptVersionId/sources/:sourceId/upload`
- `backend-node/src/middleware/upload.ts` — new: multer config with 1 GB limit (env-configurable `RAG_MAX_FILE_SIZE_BYTES`)
- `backend-node/src/services/rag.service.ts` — add `uploadDocument()` method; add parsers per file type
- `backend-node/package.json` — add: `multer`, `pdf-parse`, `mammoth` (DOCX), `@types/multer`

**What it does:**
- Accept multipart/form-data with a single `file` field
- Validate MIME type (PDF, DOCX, TXT, MD only)
- Extract plain text per type: `pdf-parse` for PDF, `mammoth` for DOCX, `fs.readFile` for TXT/MD
- Store extracted text in `RagDocument.extractedText`
- Store file metadata: `filename`, `fileSize`, `fileType`, `checksum` (MD5), `storageLocation` (local temp path or inline)
- Set `status: 'uploaded'` immediately, trigger async chunking → `status: 'indexed'`
- File size limit: default 1 GB, read from `RAG_MAX_FILE_SIZE_BYTES` env var

**Source type:** add `'document'` to the existing source type alongside `'website'`

---

### Phase 2 — Chunking + Embedding Pipeline

**Files to modify:**
- `backend-node/src/services/rag.service.ts` — extend `syncSource()` to handle `type: 'document'`; add `generateEmbeddings()` method
- `backend-node/.env` — add `EMBEDDING_MODEL`, `LM_STUDIO_URL` (already present for testing)

**What it does:**
- Reuse the existing sliding-window chunker (already handles sentence boundaries)
- After chunking, call embedding model per chunk:
  - **Tier 1:** LM Studio local (`LM_STUDIO_URL`) — same pattern as `prompt-testing.service.ts`
  - **Tier 2:** OpenAI `text-embedding-3-small` if `OPENAI_API_KEY` set
  - **Tier 3:** Skip embeddings; fall back to keyword retrieval
- Store `embedding: number[]` on each chunk in `RagDocument.chunks[]`
- Set `vectorStore.syncStatus: 'synced'` after all chunks embedded

---

### Phase 3 — MongoDB Vector Index

**What to do:**
- Create a MongoDB Atlas Vector Search index on `rag_documents` collection:
  - Field path: `chunks.embedding`
  - Dimensions: 1536 (OpenAI) or 768 (local models — configurable)
  - Similarity: `cosine`
- Provide a migration/index creation script at `backend-node/src/scripts/create-vector-index.ts`
- Update `rag.service.ts` `retrieve()` method:
  - If embeddings exist → use `$vectorSearch` aggregation
  - If no embeddings → fall back to existing keyword scorer
- Index name stored in `PromptVersion.content.ragConfig.vectorStore.indexName`

---

### Phase 4 — RAG Context Injection at Chat Time

**Files to modify:**
- `backend-node/src/routes/chat-routes.ts` — `POST /chat/select-prompt` and `POST /chat/message`
- `backend-node/src/services/rag.service.ts` — add `retrieveForPrompt(promptVersionId, query)` helper

**What it does:**
- On `POST /chat/message`:
  - Check if selected prompt has `ragConfig.enabled: true`
  - Load relevant chunks via `retrieve()` (vector or keyword)
  - Prepend retrieved context to the message body sent to Java VA:
    - Format: `[CONTEXT]\n{chunks}\n[/CONTEXT]\n\nUser: {message}`
  - Use `contextInjection.maxTokens` from `ragConfig` to cap injected text
- Java VA service already checks `ragConfig.enabled` in `buildChannelConfigFromPrompt()` — no Java changes needed for basic injection

---

### Phase 5 — Seed RAG Context for Medical Prompts

**File to create:**
- `backend-node/src/scripts/seed-rag-medical-context.ts`

**What it does:**
- For each of the 5 chat prompts under product `69728bdb0959e1a2da517684`, tenant `tenant-default`:
  - Enable `ragConfig` on the prompt version
  - Insert sample `RagDocument` records with realistic medical admin content as pre-chunked text (no embedding yet — keyword retrieval will work immediately)
  - Content topics: medication reference, appointment policies, insurance FAQs, referral workflows, lab result interpretation guidelines
- Sets `ragConfig.enabled: true` and `ragConfig.retrieval.maxResults: 5` on each chat prompt

---

### Phase 6 — UI: File Upload in RAGSourceManager

**File to modify:**
- `frontend/src/components/RAGSourceManager.tsx`
- `frontend/src/services/ragApi.ts`

**What it does:**
- Add a `Document Upload` source type alongside the existing `Website` type in the "Add Source" panel
- File input: accepts `.pdf`, `.docx`, `.txt`, `.md`; shows filename + size after selection
- Upload via `ragApi.uploadDocument(promptVersionId, sourceId, file)` — `multipart/form-data`
- Progress indicator during upload + chunking
- After upload, triggers sync automatically (same flow as website sync)
- File size: client-side validation against `RAG_MAX_FILE_SIZE_BYTES` (exposed via a `/api/config/rag-limits` endpoint or hardcoded from env)

---

### Phase 7 — Verification

**End-to-end test sequence:**
1. Open a medical chat prompt in the editor → RAG tab → "Add Source" → choose Document → upload a `.pdf`
2. Verify `RagDocument` record created in MongoDB with `status: 'indexed'` and `chunks[]` populated
3. Use the Retrieval Tester in RAGSourceManager — query "appointment scheduling" → expect scored chunks
4. Open the chat assistant at `/products/69728bdb0959e1a2da517684/configure/assistant-chat`
5. Select a chat prompt → send a message related to uploaded content
6. Verify backend log shows `[RAG] Retrieved N chunks for promptVersionId …`
7. Verify AI response reflects document content (not hallucination)

---

## MongoDB Collection Changes

| Collection | Change |
|---|---|
| `rag_documents` | **No schema change needed** — `chunks[].embedding`, `vectorStore`, `fileType: 'document'` already modeled |
| `tenant_prompt_versions` | **No schema change** — `content.ragConfig` already in schema |
| `rag_documents` | **New index** — Atlas Vector Search index on `chunks.embedding` (create via script) |

---

## New Dependencies

| Package | Purpose |
|---|---|
| `multer` | Multipart file upload middleware |
| `@types/multer` | TypeScript types |
| `pdf-parse` | Extract text from PDF |
| `mammoth` | Extract text from DOCX |

LangChain (`@langchain/community`, `@langchain/openai`) already installed — used for embedding generation.

---

## New Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `RAG_MAX_FILE_SIZE_BYTES` | `1073741824` (1 GB) | Max upload size per file, read by multer config |
| `RAG_MAX_STORAGE_PER_TENANT_BYTES` | `5368709120` (5 GB) | Total storage cap per tenant across all RAG documents |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model name |
| `RAG_VECTOR_DIMENSIONS` | `1536` | Must match index dimensions |
| `RAG_INDEX_NAME` | `rag_chunks_vector_index` | MongoDB Atlas Vector Search index name |

---

## Critical Files

| File | Action |
|---|---|
| `backend-node/src/routes/rag-routes.ts` | Add upload route |
| `backend-node/src/middleware/upload.ts` | New — multer config |
| `backend-node/src/services/rag.service.ts` | Add upload, embedding, vector retrieve |
| `backend-node/src/scripts/create-vector-index.ts` | New — one-time index creation |
| `backend-node/src/scripts/seed-rag-medical-context.ts` | New — seed RAG content |
| `backend-node/src/routes/chat-routes.ts` | Inject RAG context at `/chat/message` |
| `frontend/src/components/RAGSourceManager.tsx` | Add document upload source type |
| `frontend/src/services/ragApi.ts` | Add `uploadDocument()` method |
| `backend-node/package.json` | Add multer, pdf-parse, mammoth |
