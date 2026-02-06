import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRagDocument extends Document {
  tenantId: string;
  promptVersionId: Types.ObjectId;
  sourceId: Types.ObjectId;

  // Document Metadata
  filename: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'html' | 'md' | 'scraped_web';
  fileSize: number;
  uploadedBy?: string;
  uploadedAt: Date;

  // Storage
  storageLocation: string;
  checksum: string;

  // Processing Status
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  errorMessage?: string;

  // Content Extraction
  extractedText?: string;
  extractedMetadata?: {
    title?: string;
    author?: string;
    createdDate?: Date;
    language?: string;
    pageCount?: number;
    url?: string;
  };

  // Chunking Results
  chunks: Array<{
    chunkId: string;
    text: string;
    startIndex: number;
    endIndex: number;
    tokens: number;
    embedding?: number[];
    metadata?: Map<string, string>;
  }>;

  // Vector Store Sync
  vectorStore?: {
    provider: string;
    indexName: string;
    syncedAt?: Date;
    chunkCount: number;
    syncStatus: 'synced' | 'pending' | 'failed';
  };

  // Usage Tracking
  usage?: {
    retrievalCount: number;
    lastRetrievedAt?: Date;
  };
}

const RagDocumentSchema = new Schema<IRagDocument>({
  tenantId: {
    type: String,
    required: true,
    index: true
  },

  promptVersionId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },

  sourceId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },

  // Document Metadata
  filename: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'docx', 'txt', 'html', 'md', 'scraped_web']
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedBy: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Storage
  storageLocation: {
    type: String,
    required: true
  },
  checksum: {
    type: String,
    required: true
    // index covered by duplicate_detection index below
  },

  // Processing Status
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'indexed', 'failed'],
    default: 'uploaded',
    required: true,
    index: true
  },
  processingStartedAt: Date,
  processingCompletedAt: Date,
  errorMessage: String,

  // Content Extraction
  extractedText: String,
  extractedMetadata: {
    title: String,
    author: String,
    createdDate: Date,
    language: String,
    pageCount: Number,
    url: String
  },

  // Chunking Results
  chunks: [{
    chunkId: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    startIndex: Number,
    endIndex: Number,
    tokens: Number,
    embedding: [Number],
    metadata: Map
  }],

  // Vector Store Sync
  vectorStore: {
    provider: String,
    indexName: String,
    syncedAt: Date,
    chunkCount: Number,
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'failed']
      // index covered by sync_status index below
    }
  },

  // Usage Tracking
  usage: {
    retrievalCount: {
      type: Number,
      default: 0
    },
    lastRetrievedAt: Date
  }
}, {
  timestamps: true,
  collection: 'rag_documents'
});

// Indexes for efficient querying
RagDocumentSchema.index({
  tenantId: 1,
  promptVersionId: 1
}, { name: 'tenant_prompt_docs' });

RagDocumentSchema.index({
  sourceId: 1,
  status: 1
}, { name: 'source_status' });

RagDocumentSchema.index({
  checksum: 1
}, { name: 'duplicate_detection' });

RagDocumentSchema.index({
  'vectorStore.syncStatus': 1
}, { name: 'sync_status' });

export default mongoose.model<IRagDocument>('RagDocument', RagDocumentSchema);
