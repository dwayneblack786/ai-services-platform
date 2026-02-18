/**
 * RAG API Client — Phase 2.5
 *
 * Wraps all /api/pms/rag/* endpoints.
 */

import { ApiClient } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ragApiClient = new ApiClient({
  baseURL: API_BASE_URL,
  timeout: 30000, // scrape + chunk can be slow
  name: 'RagAPI'
});

// ---------------------------------------------------------------------------
// Types (mirrors backend shapes)
// ---------------------------------------------------------------------------

export interface RagSource {
  _id: string;
  type: string;           // 'website' | 'document' | 'api'
  name: string;
  enabled: boolean;
  config: Record<string, unknown>; // e.g. { url: 'https://...' }
  chunkSize: number;
  chunkOverlap: number;
  status: string;         // 'active' | 'error' | 'syncing'
  lastRefreshedAt?: string;
  stats?: {
    totalChunks: number;
    lastSyncDuration: number;
    errorCount: number;
  };
}

export interface RagConfig {
  enabled: boolean;
  sources?: RagSource[];
}

export interface RagDocumentSummary {
  _id: string;
  sourceId: string;
  filename: string;
  fileType: string;
  status: string;
  chunkCount: number;
  lastSynced?: string;
  extractedMetadata?: {
    title?: string;
    url?: string;
    [key: string]: unknown;
  };
}

export interface RetrievalResult {
  chunkId: string;
  text: string;
  score: number;
  sourceName: string;
  sourceId: string;
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

const ragApi = {
  /** Add a knowledge-base source to a prompt version. */
  async addSource(promptVersionId: string, source: {
    type: string;
    name: string;
    config: Record<string, unknown>;
    chunkSize?: number;
    chunkOverlap?: number;
  }): Promise<RagConfig> {
    const res = await ragApiClient.post(`/api/pms/rag/${promptVersionId}/sources`, source);
    return res.data.ragConfig as RagConfig;
  },

  /** List all sources (and full ragConfig) for a prompt version. */
  async getSources(promptVersionId: string): Promise<RagConfig> {
    const res = await ragApiClient.get(`/api/pms/rag/${promptVersionId}/sources`);
    return res.data.ragConfig as RagConfig;
  },

  /** Remove a source (and its indexed documents). */
  async removeSource(promptVersionId: string, sourceId: string): Promise<void> {
    await ragApiClient.delete(`/api/pms/rag/${promptVersionId}/sources/${sourceId}`);
  },

  /** Toggle a source's enabled flag. */
  async toggleSource(promptVersionId: string, sourceId: string, enabled: boolean): Promise<RagConfig> {
    const res = await ragApiClient.put(`/api/pms/rag/${promptVersionId}/sources/${sourceId}/toggle`, { enabled });
    return res.data.ragConfig as RagConfig;
  },

  /** Trigger a scrape + index for a website source.  Returns the synced document summary. */
  async syncSource(promptVersionId: string, sourceId: string): Promise<{ document: RagDocumentSummary }> {
    const res = await ragApiClient.post(`/api/pms/rag/${promptVersionId}/sources/${sourceId}/sync`);
    return res.data as { document: RagDocumentSummary };
  },

  /** List all indexed documents for a prompt version. */
  async getDocuments(promptVersionId: string): Promise<RagDocumentSummary[]> {
    const res = await ragApiClient.get(`/api/pms/rag/${promptVersionId}/documents`);
    return res.data.documents as RagDocumentSummary[];
  },

  /** Run a keyword retrieval query against all chunks. */
  async retrieve(promptVersionId: string, query: string, topK?: number, minScore?: number): Promise<RetrievalResult[]> {
    const res = await ragApiClient.post(`/api/pms/rag/${promptVersionId}/retrieve`, { query, topK, minScore });
    return res.data.results as RetrievalResult[];
  },

  /**
   * Upload a file (PDF, DOCX, TXT, MD) to an existing document source.
   * Uses fetch directly so we can send FormData without the ApiClient JSON wrapper.
   */
  async uploadDocument(
    promptVersionId: string,
    sourceId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<RagDocumentSummary> {
    const url = `${API_BASE_URL}/api/pms/rag/${promptVersionId}/sources/${sourceId}/upload`;
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      // Include cookies so authenticateSession middleware passes
      xhr.withCredentials = true;

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }

      xhr.onload = () => {
        if (xhr.status === 201) {
          const body = JSON.parse(xhr.responseText);
          resolve(body.document as RagDocumentSummary);
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* raw */ }
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  }
};

export default ragApi;
