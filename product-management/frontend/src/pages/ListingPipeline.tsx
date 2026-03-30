import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

type PipelineStatus = 'ingest' | 'vision' | 'autofill' | 'review_1' | 'copywriter' | 'compliance' | 'review_2' | 'accepted' | 'failed';

interface PipelineState {
  runId: string;
  listingId: string;
  status: PipelineStatus;
  pausedAt: string;
  listingFields: Record<string, any>;
  generatedCopy: Record<string, any>;
  complianceReport: Record<string, any>;
  errors: string[];
}

const PIPELINE_STAGES = [
  { key: 'ingest', label: 'Ingest', description: 'Validating and processing photos' },
  { key: 'vision', label: 'Vision Analysis', description: 'Detecting rooms, flooring, counters, style' },
  { key: 'autofill', label: 'Auto-Fill', description: 'Mapping attributes to listing fields' },
  { key: 'review_1', label: 'Review Fields', description: 'Awaiting your review' },
  { key: 'copywriter', label: 'Copywriter', description: 'Generating MLS and social copy' },
  { key: 'compliance', label: 'Compliance', description: 'Fair Housing Act review' },
  { key: 'review_2', label: 'Review Copy', description: 'Awaiting your final approval' },
  { key: 'accepted', label: 'Complete', description: 'Listing saved to database' },
];

const stageIndex = (status: string) => PIPELINE_STAGES.findIndex(s => s.key === status);

const ListingPipeline = () => {
  const { id: listingId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runId = searchParams.get('runId');

  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldEdits, setFieldEdits] = useState<Record<string, any>>({});
  const [copyEdits, setCopyEdits] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!runId) return;
    try {
      const response = await apiClient.get(`/api/listing-pipeline/${runId}/status`);
      setPipelineState(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch pipeline status');
      setLoading(false);
    }
  }, [runId]);

  // Poll every 3 seconds while pipeline is running
  useEffect(() => {
    fetchStatus();
    const shouldPoll = pipelineState && !['review_1', 'review_2', 'accepted', 'failed'].includes(pipelineState.status);
    if (shouldPoll) {
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, pipelineState?.status]);

  const submitReview1 = async () => {
    setSubmitting(true);
    try {
      await apiClient.post(`/api/listing-pipeline/${runId}/review/1`, {
        approved: true,
        edits: fieldEdits,
        notes: '',
      });
      await fetchStatus();
    } catch (err: any) {
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview2 = async () => {
    setSubmitting(true);
    try {
      await apiClient.post(`/api/listing-pipeline/${runId}/review/2`, {
        approved: true,
        edits: copyEdits,
        notes: '',
      });
      await fetchStatus();
    } catch (err: any) {
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={loadingStyle}>Loading pipeline status...</div>;
  if (!pipelineState) return <div style={errorStyle}>Pipeline run not found.</div>;

  const currentIdx = stageIndex(pipelineState.status);
  const fields = { ...(pipelineState.listingFields || {}), ...fieldEdits };
  const copy = { ...(pipelineState.generatedCopy || {}), ...copyEdits };
  const compliance = pipelineState.complianceReport || {};

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={() => navigate('/listinglift')}>← Back to Listings</button>
        <h1 style={titleStyle}>AI Pipeline</h1>
        {pipelineState.status === 'accepted' && (
          <span style={{ ...statusBadge, backgroundColor: '#10b981' }}>Complete</span>
        )}
        {pipelineState.status === 'failed' && (
          <span style={{ ...statusBadge, backgroundColor: '#ef4444' }}>Failed</span>
        )}
      </div>

      {error && <div style={errorBannerStyle}>{error}</div>}

      {/* Progress Bar */}
      <div style={progressBarContainerStyle}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isWaiting = i > currentIdx;
          return (
            <div key={stage.key} style={stageItemStyle}>
              <div style={{
                ...stageCircleStyle,
                backgroundColor: isDone ? '#10b981' : isCurrent ? '#3b82f6' : '#374151',
                color: isWaiting ? '#6b7280' : '#fff',
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <div style={stageLabelStyle(isCurrent)}>{stage.label}</div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div style={{ ...connectorStyle, backgroundColor: isDone ? '#10b981' : '#374151' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current stage description */}
      <p style={stageDescStyle}>
        {PIPELINE_STAGES[currentIdx]?.description}
        {!['review_1', 'review_2', 'accepted', 'failed'].includes(pipelineState.status) && (
          <span style={{ color: '#f59e0b' }}> — processing...</span>
        )}
      </p>

      {/* Human Review Gate 1: Field Review */}
      {pipelineState.status === 'review_1' && (
        <div style={reviewPanelStyle}>
          <h2 style={reviewTitleStyle}>Review Auto-Filled Fields</h2>
          <p style={reviewDescStyle}>
            The AI has populated these fields from your photos. Review and edit before generating the listing copy.
          </p>
          <div style={fieldGridStyle}>
            {['address', 'bedrooms', 'bathrooms', 'sqft', 'price', 'style', 'condition'].map(key => (
              <div key={key} style={fieldItemStyle}>
                <label style={fieldLabelStyle}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                <input
                  style={fieldInputStyle}
                  value={fields[key] ?? ''}
                  onChange={e => setFieldEdits(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Enter ${key}...`}
                />
              </div>
            ))}
          </div>
          {fields.features?.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <label style={fieldLabelStyle}>Detected Features</label>
              <div style={featuresStyle}>
                {fields.features.map((f: string) => (
                  <span key={f} style={featureTagStyle}>{f}</span>
                ))}
              </div>
            </div>
          )}
          <button style={approveBtnStyle} onClick={submitReview1} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Approve & Generate Copy'}
          </button>
        </div>
      )}

      {/* Human Review Gate 2: Copy Review */}
      {pipelineState.status === 'review_2' && (
        <div style={reviewPanelStyle}>
          <h2 style={reviewTitleStyle}>Review Generated Copy</h2>

          {compliance.issues?.length > 0 && (
            <div style={complianceWarningStyle}>
              <strong>⚠ Compliance Issues Found ({compliance.issues.length})</strong>
              {compliance.issues.map((issue: any, i: number) => (
                <p key={i} style={{ margin: '4px 0', fontSize: '13px' }}>
                  "{issue.textFragment}" — {issue.reason}
                </p>
              ))}
            </div>
          )}
          {compliance.passed && (
            <div style={compliancePassStyle}>✓ Fair Housing compliance check passed</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {[
              { key: 'mlsDescription', label: 'MLS Description', multiline: true },
              { key: 'headline', label: 'Headline', multiline: false },
              { key: 'tagline', label: 'Tagline', multiline: false },
              { key: 'socialInstagram', label: 'Instagram Caption', multiline: true },
            ].map(({ key, label, multiline }) => (
              <div key={key}>
                <label style={fieldLabelStyle}>{label}</label>
                {multiline ? (
                  <textarea
                    style={{ ...fieldInputStyle, height: '100px', resize: 'vertical' }}
                    value={copy[key] ?? ''}
                    onChange={e => setCopyEdits(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`${label} will appear here...`}
                  />
                ) : (
                  <input
                    style={fieldInputStyle}
                    value={copy[key] ?? ''}
                    onChange={e => setCopyEdits(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`${label} will appear here...`}
                  />
                )}
              </div>
            ))}
          </div>

          <button style={approveBtnStyle} onClick={submitReview2} disabled={submitting}>
            {submitting ? 'Saving...' : 'Accept & Save Listing'}
          </button>
        </div>
      )}

      {/* Complete state */}
      {pipelineState.status === 'accepted' && (
        <div style={completeStyle}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color: '#f9fafb', marginBottom: '8px' }}>Listing Complete!</h2>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Your listing has been saved with AI-generated copy and attributes.</p>
          <button style={approveBtnStyle} onClick={() => navigate('/listinglift')}>Back to Listings</button>
        </div>
      )}

      {/* Error state */}
      {pipelineState.status === 'failed' && pipelineState.errors?.length > 0 && (
        <div style={failedStyle}>
          <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Pipeline Failed</h3>
          {pipelineState.errors.map((e, i) => <p key={i} style={{ color: '#9ca3af', fontSize: '13px' }}>{e}</p>)}
        </div>
      )}
    </div>
  );
};

// Styles
const pageStyle: React.CSSProperties = { padding: '32px', maxWidth: '900px', margin: '0 auto' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' };
const backBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' };
const titleStyle: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#f9fafb', margin: 0, flex: 1 };
const statusBadge: React.CSSProperties = { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: '#fff' };
const errorBannerStyle: React.CSSProperties = { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' };
const loadingStyle: React.CSSProperties = { padding: '60px', textAlign: 'center', color: '#9ca3af' };
const errorStyle: React.CSSProperties = { padding: '60px', textAlign: 'center', color: '#ef4444' };
const progressBarContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', marginBottom: '12px', overflowX: 'auto', paddingBottom: '8px' };
const stageItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', position: 'relative' };
const stageCircleStyle: React.CSSProperties = { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 };
const stageLabelStyle = (active: boolean): React.CSSProperties => ({ fontSize: '10px', color: active ? '#f9fafb' : '#6b7280', whiteSpace: 'nowrap', position: 'absolute', top: '36px', left: '50%', transform: 'translateX(-50%)' });
const connectorStyle: React.CSSProperties = { height: '2px', width: '40px', flexShrink: 0 };
const stageDescStyle: React.CSSProperties = { color: '#9ca3af', fontSize: '14px', marginBottom: '32px', marginTop: '24px' };
const reviewPanelStyle: React.CSSProperties = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '24px' };
const reviewTitleStyle: React.CSSProperties = { fontSize: '18px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' };
const reviewDescStyle: React.CSSProperties = { color: '#9ca3af', fontSize: '14px', marginBottom: '20px' };
const fieldGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' };
const fieldItemStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const fieldLabelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' };
const fieldInputStyle: React.CSSProperties = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '6px', padding: '8px 12px', color: '#f9fafb', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
const featuresStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' };
const featureTagStyle: React.CSSProperties = { backgroundColor: '#374151', color: '#d1d5db', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' };
const approveBtnStyle: React.CSSProperties = { marginTop: '24px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' };
const complianceWarningStyle: React.CSSProperties = { backgroundColor: '#451a03', border: '1px solid #92400e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#fcd34d' };
const compliancePassStyle: React.CSSProperties = { backgroundColor: '#022c22', border: '1px solid #065f46', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', color: '#6ee7b7', fontSize: '14px' };
const completeStyle: React.CSSProperties = { textAlign: 'center', padding: '60px 0' };
const failedStyle: React.CSSProperties = { backgroundColor: '#1f2937', border: '1px solid #ef4444', borderRadius: '12px', padding: '24px' };

export default ListingPipeline;
