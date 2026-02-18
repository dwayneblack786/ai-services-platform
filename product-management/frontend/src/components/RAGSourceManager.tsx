/**
 * RAGSourceManager — Phase 2.5
 *
 * Manages knowledge-base sources for a PromptVersion's RAG configuration.
 *
 * Features:
 *   - Add / remove / toggle website sources
 *   - Manual sync (scrape + chunk) with live status feedback
 *   - Retrieval tester: query against indexed chunks, see scored results
 *   - Document inventory (what's indexed)
 */

import React, { useState, useEffect, useCallback } from 'react';
import ragApi, { RagSource, RagConfig, RagDocumentSummary, RetrievalResult } from '../services/ragApi';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RAGSourceManagerProps {
  promptVersionId: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single source row in the list. */
const SourceCard: React.FC<{
  source: RagSource;
  onToggle: (id: string, enabled: boolean) => void;
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
  syncing: boolean;
}> = ({ source, onToggle, onSync, onRemove, syncing }) => {
  const statusColor =
    source.status === 'active' ? '#2e7d32' :
    source.status === 'error'  ? '#d32f2f' : '#1976d2';

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      background: source.enabled ? '#fff' : '#fafafa',
      opacity: source.enabled ? 1 : 0.7,
      transition: 'all 0.2s'
    }}>
      {/* Header row: name + status + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>{source.type === 'website' ? '🌐' : '📄'}</span>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#222' }}>{source.name}</div>
            {source.type === 'website' && (source.config?.url as string | undefined) && (
              <div style={{ fontSize: '12px', color: '#888', wordBreak: 'break-all' }}>{source.config.url as string}</div>
            )}
            {source.type === 'document' && (source.config?.filename as string | undefined) && (
              <div style={{ fontSize: '12px', color: '#888' }}>{source.config.filename as string}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: statusColor, textTransform: 'uppercase' }}>{source.status}</span>
          <label style={{ position: 'relative', width: '40px', height: '22px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={source.enabled}
              onChange={() => onToggle(source._id, !source.enabled)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', inset: 0,
              background: source.enabled ? '#1976d2' : '#ccc',
              borderRadius: '22px',
              transition: 'background 0.2s'
            }} />
            <span style={{
              position: 'absolute', top: '2px',
              left: source.enabled ? '20px' : '2px',
              width: '18px', height: '18px',
              background: 'white', borderRadius: '50%',
              transition: 'left 0.2s'
            }} />
          </label>
        </div>
      </div>

      {/* Stats row */}
      {source.stats && (
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          <span>Chunks: <strong>{source.stats.totalChunks}</strong></span>
          {source.lastRefreshedAt && (
            <span>Last synced: <strong>{new Date(source.lastRefreshedAt).toLocaleString()}</strong></span>
          )}
          {source.stats.errorCount > 0 && (
            <span style={{ color: '#d32f2f' }}>Errors: <strong>{source.stats.errorCount}</strong></span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {source.type === 'website' && (
          <button
            onClick={() => onSync(source._id)}
            disabled={syncing}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: 'none',
              background: syncing ? '#ccc' : '#1976d2',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              cursor: syncing ? 'not-allowed' : 'pointer'
            }}
          >
            {syncing ? '⏳ Syncing…' : '🔄 Sync Now'}
          </button>
        )}
        <button
          onClick={() => onRemove(source._id)}
          style={{
            padding: '6px 14px',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
            background: 'white',
            color: '#d32f2f',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🗑 Remove
        </button>
      </div>
    </div>
  );
};

/** Retrieval tester panel. */
const RetrievalTester: React.FC<{ promptVersionId: string }> = ({ promptVersionId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ragApi.retrieve(promptVersionId, query.trim(), 5, 0.1);
      setResults(res);
    } catch (err: any) {
      setError(err.message || 'Retrieval failed');
    } finally {
      setLoading(false);
    }
  }, [promptVersionId, query]);

  return (
    <div style={{ marginTop: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
      <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>🧪 Test Retrieval</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Type a question to test retrieval…"
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: loading ? '#ccc' : '#1976d2',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '13px', color: '#856404' }}>
          {error}
        </div>
      )}

      {results.length === 0 && !loading && !error && query.trim() && (
        <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>No matching chunks found.</div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {results.map((r, i) => (
            <div key={r.chunkId} style={{
              padding: '12px',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>
                  #{i + 1} — {r.sourceName}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: r.score > 0.6 ? '#e8f5e9' : r.score > 0.3 ? '#fff3e0' : '#f5f5f5',
                  color: r.score > 0.6 ? '#2e7d32' : r.score > 0.3 ? '#e65100' : '#757575'
                }}>
                  Score: {(r.score * 100).toFixed(0)}%
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: '1.5', maxHeight: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.text.length > 300 ? r.text.slice(0, 300) + '…' : r.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const RAGSourceManager: React.FC<RAGSourceManagerProps> = ({ promptVersionId }) => {
  const [ragConfig, setRagConfig] = useState<RagConfig>({ enabled: false });
  const [documents, setDocuments] = useState<RagDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<Record<string, string>>({}); // sourceId → error message

  // "Add source" form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTab, setAddTab] = useState<'website' | 'file'>('website');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceChunkSize, setNewSourceChunkSize] = useState(1500);
  const [newSourceChunkOverlap, setNewSourceChunkOverlap] = useState(200);
  const [addingSource, setAddingSource] = useState(false);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadName, setUploadName] = useState('');

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [config, docs] = await Promise.all([
        ragApi.getSources(promptVersionId),
        ragApi.getDocuments(promptVersionId)
      ]);
      setRagConfig(config);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to load RAG configuration');
    } finally {
      setLoading(false);
    }
  }, [promptVersionId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAddSource = async () => {
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;
    setAddingSource(true);
    setError(null);
    try {
      const config = await ragApi.addSource(promptVersionId, {
        type: 'website',
        name: newSourceName.trim(),
        config: { url: newSourceUrl.trim() },
        chunkSize: newSourceChunkSize,
        chunkOverlap: newSourceChunkOverlap
      });
      setRagConfig(config);
      // Reset form
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceChunkSize(1500);
      setNewSourceChunkOverlap(200);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add source');
    } finally {
      setAddingSource(false);
    }
  };

  const handleToggle = async (sourceId: string, enabled: boolean) => {
    try {
      const config = await ragApi.toggleSource(promptVersionId, sourceId, enabled);
      setRagConfig(config);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle source');
    }
  };

  const handleSync = async (sourceId: string) => {
    setSyncingSourceId(sourceId);
    setSyncError(prev => ({ ...prev, [sourceId]: '' }));
    try {
      await ragApi.syncSource(promptVersionId, sourceId);
      // Refresh everything after sync
      await fetchAll();
    } catch (err: any) {
      setSyncError(prev => ({ ...prev, [sourceId]: err.message || 'Sync failed' }));
      // Refresh source list to pick up error status
      try { setRagConfig(await ragApi.getSources(promptVersionId)); } catch { /* ignore */ }
    } finally {
      setSyncingSourceId(null);
    }
  };

  const handleRemove = async (sourceId: string) => {
    if (!window.confirm('Remove this source and all its indexed content?')) return;
    try {
      await ragApi.removeSource(promptVersionId, sourceId);
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Failed to remove source');
    }
  };

  const handleUploadFile = async () => {
    if (!uploadFile || !uploadName.trim()) return;
    setAddingSource(true);
    setError(null);
    setUploadProgress(0);
    try {
      // Step 1: create a document source entry (no URL needed)
      const config = await ragApi.addSource(promptVersionId, {
        type: 'document',
        name: uploadName.trim(),
        config: { filename: uploadFile.name },
        chunkSize: newSourceChunkSize,
        chunkOverlap: newSourceChunkOverlap
      });
      setRagConfig(config);

      // Step 2: find the newly created source id (last in the list)
      const sources = config.sources || [];
      const newSource = sources[sources.length - 1];
      if (!newSource) throw new Error('Source was not created');

      // Step 3: upload the file
      await ragApi.uploadDocument(promptVersionId, newSource._id, uploadFile, setUploadProgress);

      // Refresh everything
      await fetchAll();

      // Reset form
      setUploadFile(null);
      setUploadName('');
      setUploadProgress(0);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setAddingSource(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return <div style={{ padding: '16px', color: '#888', fontSize: '14px' }}>Loading RAG configuration…</div>;
  }

  const sources = ragConfig.sources || [];

  return (
    <div>
      {/* Global error banner */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '13px', color: '#856404', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Source list */}
      {sources.length === 0 && !showAddForm && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '14px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #ddd' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📚</div>
          No knowledge sources configured yet.
          <br />
          Add a website URL or upload a document (PDF, DOCX, TXT, MD) to give your assistant access to external knowledge.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sources.map(source => (
          <SourceCard
            key={source._id}
            source={source}
            syncing={syncingSourceId === source._id}
            onToggle={handleToggle}
            onSync={handleSync}
            onRemove={handleRemove}
          />
        ))}

        {/* Per-source sync error */}
        {Object.entries(syncError).map(([sid, msg]) => msg ? (
          <div key={sid} style={{ padding: '8px 12px', background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '6px', fontSize: '13px', color: '#c62828' }}>
            {msg}
          </div>
        ) : null)}
      </div>

      {/* "Add source" button / form */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            marginTop: '16px',
            padding: '10px 18px',
            borderRadius: '6px',
            border: '1px dashed #1976d2',
            background: 'white',
            color: '#1976d2',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + Add Knowledge Source
        </button>
      ) : (
        <div style={{
          marginTop: '16px',
          padding: '18px',
          border: '1px solid #bbdefb',
          borderRadius: '8px',
          background: '#e3f2fd'
        }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '2px solid #bbdefb' }}>
            {(['website', 'file'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAddTab(tab)}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  background: 'none',
                  fontSize: '14px',
                  fontWeight: addTab === tab ? '700' : '500',
                  color: addTab === tab ? '#1565c0' : '#888',
                  borderBottom: addTab === tab ? '2px solid #1565c0' : '2px solid transparent',
                  marginBottom: '-2px',
                  cursor: 'pointer'
                }}
              >
                {tab === 'website' ? '🌐 Website URL' : '📄 Upload File'}
              </button>
            ))}
          </div>

          {/* Shared: chunk settings */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555', marginBottom: '4px' }}>
                Chunk Size (chars)
              </label>
              <input
                type="number"
                value={newSourceChunkSize}
                onChange={e => setNewSourceChunkSize(Math.max(200, Math.min(5000, parseInt(e.target.value) || 1500)))}
                min={200} max={5000}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555', marginBottom: '4px' }}>
                Chunk Overlap (chars)
              </label>
              <input
                type="number"
                value={newSourceChunkOverlap}
                onChange={e => setNewSourceChunkOverlap(Math.max(0, Math.min(500, parseInt(e.target.value) || 200)))}
                min={0} max={500}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Website tab */}
          {addTab === 'website' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555', marginBottom: '4px' }}>Source Name *</label>
                <input
                  type="text"
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  placeholder="e.g. Company Help Center"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555', marginBottom: '4px' }}>URL *</label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  placeholder="https://example.com/docs"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddSource}
                  disabled={addingSource || !newSourceName.trim() || !newSourceUrl.trim()}
                  style={{
                    padding: '8px 20px', borderRadius: '6px', border: 'none',
                    background: addingSource ? '#ccc' : '#1976d2',
                    color: 'white', fontSize: '14px', fontWeight: '600',
                    cursor: addingSource ? 'not-allowed' : 'pointer'
                  }}
                >
                  {addingSource ? 'Adding…' : 'Add Source'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewSourceName(''); setNewSourceUrl(''); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', color: '#555', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* File upload tab */}
          {addTab === 'file' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555', marginBottom: '4px' }}>
                  File * <span style={{ color: '#888', fontWeight: '400' }}>(PDF, DOCX, TXT, MD — max 1 GB)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setUploadFile(f);
                    if (f && !uploadName) setUploadName(f.name.replace(/\.[^.]+$/, ''));
                  }}
                  style={{ width: '100%', padding: '8px 0', fontSize: '14px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555', marginBottom: '4px' }}>Source Name *</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="e.g. Appointment Scheduling Policy"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Progress bar */}
              {addingSource && uploadProgress > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                    {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Processing…'}
                  </div>
                  <div style={{ height: '6px', background: '#ddd', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#1976d2', borderRadius: '3px', transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleUploadFile}
                  disabled={addingSource || !uploadFile || !uploadName.trim()}
                  style={{
                    padding: '8px 20px', borderRadius: '6px', border: 'none',
                    background: addingSource ? '#ccc' : '#1976d2',
                    color: 'white', fontSize: '14px', fontWeight: '600',
                    cursor: addingSource ? 'not-allowed' : 'pointer'
                  }}
                >
                  {addingSource ? (uploadProgress < 100 ? `Uploading ${uploadProgress}%…` : 'Processing…') : '⬆ Upload'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setUploadFile(null); setUploadName(''); setUploadProgress(0); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', color: '#555', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Document inventory (only when there are docs) */}
      {documents.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>📄 Indexed Documents</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {documents.map(doc => (
              <div key={doc._id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #eee',
                fontSize: '13px'
              }}>
                <span style={{ color: '#444' }}>
                  {doc.extractedMetadata?.title || doc.filename}
                </span>
                <div style={{ display: 'flex', gap: '12px', color: '#888' }}>
                  <span>{doc.chunkCount} chunks</span>
                  <span style={{
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: doc.status === 'indexed' ? '#e8f5e9' : '#fff3e0',
                    color: doc.status === 'indexed' ? '#2e7d32' : '#e65100'
                  }}>{doc.status}</span>
                  {doc.lastSynced && <span>{new Date(doc.lastSynced).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retrieval tester — only visible once at least one source has been synced */}
      {documents.some(d => d.status === 'indexed') && (
        <RetrievalTester promptVersionId={promptVersionId} />
      )}
    </div>
  );
};

export default RAGSourceManager;
