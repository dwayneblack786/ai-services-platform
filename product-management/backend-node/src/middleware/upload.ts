/**
 * Multer upload middleware for RAG document ingestion.
 *
 * - Accepts a single `file` field (multipart/form-data)
 * - Stores the upload in memory (Buffer) — text is extracted and the buffer discarded
 * - Enforces a per-file size limit via RAG_MAX_FILE_SIZE_BYTES (default 1 GB)
 * - Validates MIME type: PDF, DOCX, TXT, MD only
 */

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const MAX_FILE_SIZE = parseInt(process.env.RAG_MAX_FILE_SIZE_BYTES || '1073741824', 10); // 1 GB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/markdown',
  'application/octet-stream' // fallback for some OS/browser combos sending .md files
]);

const ALLOWED_EXTENSIONS = /\.(pdf|docx|txt|md)$/i;

function fileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const extOk = ALLOWED_EXTENSIONS.test(file.originalname);
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);

  if (extOk || mimeOk) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT, MD`));
  }
}

/** Single-file upload middleware — field name: "file" */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
}).single('file');
