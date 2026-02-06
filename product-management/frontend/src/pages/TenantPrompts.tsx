import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../services/apiClient';
import VersionStatus from '../components/VersionStatus';
import PromptDashboardCard from '../components/PromptDashboardCard';


interface PromptBinding {
  _id: string;
  tenantId: string;
  productId: string;
  channelType: 'voice' | 'chat';
  currentDraftId?: string;
  activeProductionId?: string;
  pulledTemplateIds: string[];
  scoreThreshold: number;
  lastScore?: number;
}

interface PromptDetails {
  name: string;
  description?: string;
  category?: string;
  version?: number;
  content?: {
    systemPrompt?: string;
    conversationBehavior?: {
      greeting?: string;
    };
    persona?: {
      tone?: string;
    };
  };
  updatedAt?: string;
}

interface TenantPromptsProps {
  productId?: string;
}

const TenantPrompts: React.FC<TenantPromptsProps> = ({ productId: propProductId }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get productId from props (when used as embedded component) or URL query (when standalone route)
  const productId = propProductId || searchParams.get('productId') || undefined;
  const activeChannel = (searchParams.get('channel') as 'voice' | 'chat') || 'voice';

  // View mode: detail (default) or dashboard
  const [view, setView] = useState<'detail' | 'dashboard'>(
    (searchParams.get('view') as 'detail' | 'dashboard') || 'detail'
  );

  const [bindings, setBindings] = useState<{ voice: PromptBinding | null; chat: PromptBinding | null }>({
    voice: null,
    chat: null
  });
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pullResult, setPullResult] = useState<{ newCount: number; templates: { channelType: string; name: string }[] } | null>(null);
  const [promptDetails, setPromptDetails] = useState<Record<string, PromptDetails>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null); // Track which menu is open

  const fetchBindings = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/api/pms/tenant-prompts/${productId}`);
      setBindings(response.data);
    } catch (err: any) {
      // If no bindings exist yet, that's fine — show empty state
      if (err.response?.status === 404) {
        setBindings({ voice: null, chat: null });
      } else {
        setError(err.response?.data?.error || 'Failed to load prompts');
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchBindings();
  }, [fetchBindings]);

  // Fetch prompt details for any binding that has a currentDraftId
  useEffect(() => {
    const ids = [bindings.voice?.currentDraftId, bindings.chat?.currentDraftId].filter(Boolean) as string[];
    if (ids.length === 0) return;

    const fetchDetails = async () => {
      const results: Record<string, PromptDetails> = {};
      for (const draftId of ids) {
        try {
          const res = await apiClient.get(`/api/pms/prompts/${draftId}`);
          results[draftId] = res.data;
        } catch {
          // Non-fatal — card will just show less info
        }
      }
      setPromptDetails(results);
    };

    fetchDetails();
  }, [bindings]);

  const handleChannelChange = (channel: 'voice' | 'chat') => {
    setSearchParams({ channel });
  };

  const handlePull = async () => {
    if (!productId) return;
    try {
      setPulling(true);
      setError(null);
      setPullResult(null);
      const response = await apiClient.post(`/api/pms/tenant-prompts/${productId}/pull`);
      setPullResult(response.data);
      // Refresh bindings after pull
      await fetchBindings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to pull prompts');
    } finally {
      setPulling(false);
    }
  };

  const handleEditPrompt = (draftId: string) => {
    navigate(`/prompts/edit/${draftId}?productId=${productId}`);
  };

  const handleCreateFromTemplate = (channelType: 'voice' | 'chat') => {
    navigate(`/prompts/templates?productId=${productId}&channelType=${channelType}`);
  };

  const handleDuplicatePrompt = async (channelType: 'voice' | 'chat') => {
    const binding = channelType === 'voice' ? bindings.voice : bindings.chat;
    if (!binding?.currentDraftId) return;

    try {
      // Create a new version/duplicate of the prompt
      const response = await apiClient.post(`/api/pms/prompts/${binding.currentDraftId}/versions`);
      const newPrompt = response.data;

      // Navigate to edit the new duplicate
      navigate(`/prompts/edit/${newPrompt._id}?productId=${productId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to duplicate prompt');
    }
  };

  const handleDeletePrompt = async (channelType: 'voice' | 'chat') => {
    const binding = channelType === 'voice' ? bindings.voice : bindings.chat;
    if (!binding?.currentDraftId) return;

    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/pms/prompts/${binding.currentDraftId}`);
      // Refresh bindings after deletion
      await fetchBindings();
      setMenuOpen(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete prompt');
    }
  };

  const currentBinding = activeChannel === 'voice' ? bindings.voice : bindings.chat;

  if (loading) {
    return <div style={{ padding: '24px', color: '#666' }}>Loading prompts...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ padding: '12px', background: '#FFEBEE', borderRadius: '8px', color: '#C62828', border: '1px solid #EF5350' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header with tabs and view toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        {/* Voice / Chat tab bar */}
        <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0' }}>
          {(['voice', 'chat'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => handleChannelChange(ch)}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeChannel === ch ? '#fff' : '#f5f5f5',
                color: activeChannel === ch ? '#1976d2' : '#666',
                fontSize: '0.95rem',
                fontWeight: activeChannel === ch ? '600' : '500',
                cursor: 'pointer',
                borderBottom: activeChannel === ch ? '3px solid #2196F3' : '3px solid transparent',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{ch === 'voice' ? '📞' : '💬'}</span>
              <span>{ch === 'voice' ? 'Voice Prompts' : 'Chat Prompts'}</span>
            </button>
          ))}
        </div>

        {/* View toggle buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(['detail', 'dashboard'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                const newParams = new URLSearchParams(searchParams);
                newParams.set('view', v);
                setSearchParams(newParams);
              }}
              style={{
                padding: '8px 16px',
                border: view === v ? '1px solid #2196F3' : '1px solid #ddd',
                borderRadius: '6px',
                background: view === v ? '#e3f2fd' : 'white',
                color: view === v ? '#1976d2' : '#666',
                fontSize: '13px',
                fontWeight: view === v ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {v === 'detail' ? '📋 Detail' : '📊 Dashboard'}
            </button>
          ))}
        </div>
      </div>

      {/* Pull Prompts button + result */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={handlePull}
          disabled={pulling}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #2196F3',
            background: pulling ? '#e3f2fd' : 'white',
            color: '#1976d2',
            fontSize: '14px',
            fontWeight: '600',
            cursor: pulling ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{pulling ? '⟳' : '⬇️'}</span>
          {pulling ? 'Pulling...' : 'Pull Prompts from Product'}
        </button>

        {pullResult && (
          <div style={{ fontSize: '13px', color: pullResult.newCount > 0 ? '#2E7D32' : '#666' }}>
            {pullResult.newCount > 0
              ? `Pulled ${pullResult.newCount} new prompt(s): ${pullResult.templates.map(t => t.name).join(', ')}`
              : 'No new prompts to pull — all templates already pulled.'}
          </div>
        )}
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {(['voice', 'chat'] as const).map((ch) => {
            const binding = bindings[ch];
            const details = binding?.currentDraftId ? promptDetails[binding.currentDraftId] : null;

            return (
              <PromptDashboardCard
                key={ch}
                name={details?.name || `${ch === 'voice' ? 'Voice' : 'Chat'} Prompt`}
                description={details?.description}
                channelType={ch}
                state={binding?.activeProductionId ? 'production' : 'draft'}
                version={details?.version}
                category={details?.category}
                updatedAt={details?.updatedAt}
                metrics={{
                  totalUses: 0, // TODO: Get from binding or details
                  avgLatency: undefined,
                  errorRate: undefined
                }}
                lastScore={binding?.lastScore}
                scoreThreshold={binding?.scoreThreshold || 70}
                onClick={() => {
                  if (binding?.currentDraftId) {
                    handleEditPrompt(binding.currentDraftId);
                  } else {
                    handleCreateFromTemplate(ch);
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* Detail View - Full-width grid layout */}
      {view === 'detail' && (
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: '16px'
      }}>
        {currentBinding && currentBinding.currentDraftId ? (() => {
          const details = promptDetails[currentBinding.currentDraftId];

          return (
            <>
              {/* Header Row - Spans full width */}
              <div style={{
                padding: '10px 16px',
                background: '#f8f9fa',
                borderBottom: '1px solid #e0e0e0',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{activeChannel === 'voice' ? '📞' : '💬'}</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#222' }}>
                    {details?.name || `${activeChannel === 'voice' ? 'Voice' : 'Chat'} Prompt`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <VersionStatus
                    state="draft"
                    version={details?.version}
                    showVersion={true}
                    showUpdated={false}
                  />
                  {currentBinding.activeProductionId && (
                    <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: '600', background: '#e8f5e9', color: '#2e7d32' }}>
                      ✓ PROD
                    </span>
                  )}
                  {details?.category && (
                    <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: '500', background: '#f3e5f5', color: '#6a1b9a' }}>
                      {details.category}
                    </span>
                  )}
                </div>
                {details?.updatedAt && (
                  <div style={{ fontSize: '9px', color: '#999', whiteSpace: 'nowrap' }}>
                    {new Date(details.updatedAt).toLocaleDateString()}
                  </div>
                )}
                {/* Hamburger Menu */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === activeChannel ? null : activeChannel)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      background: menuOpen === activeChannel ? '#f0f0f0' : 'white',
                      color: '#666',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (menuOpen !== activeChannel) e.currentTarget.style.background = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      if (menuOpen !== activeChannel) e.currentTarget.style.background = 'white';
                    }}
                  >
                    ⋮
                  </button>
                  {/* Dropdown Menu */}
                  {menuOpen === activeChannel && (
                    <>
                      {/* Backdrop to close menu */}
                      <div
                        onClick={() => setMenuOpen(null)}
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 999
                        }}
                      />
                      {/* Menu Items */}
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        background: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        minWidth: '180px',
                        zIndex: 1000,
                        overflow: 'hidden'
                      }}>
                        <button
                          onClick={() => {
                            handleEditPrompt(currentBinding.currentDraftId!);
                            setMenuOpen(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            color: '#333',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <span>✏️</span>
                          <span>Edit Draft</span>
                        </button>
                        {currentBinding.activeProductionId && (
                          <button
                            onClick={() => {
                              handleEditPrompt(currentBinding.activeProductionId!);
                              setMenuOpen(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              border: 'none',
                              background: 'white',
                              color: '#333',
                              fontSize: '12px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              borderTop: '1px solid #f0f0f0'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <span>👁️</span>
                            <span>View Production</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleCreateFromTemplate(activeChannel);
                            setMenuOpen(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            color: '#333',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            borderTop: '1px solid #f0f0f0'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <span>➕</span>
                          <span>Create New</span>
                        </button>
                        <button
                          onClick={() => {
                            handleDuplicatePrompt(activeChannel);
                            setMenuOpen(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            color: '#333',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            borderTop: '1px solid #f0f0f0'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <span>📋</span>
                          <span>Duplicate</span>
                        </button>
                        <button
                          onClick={() => {
                            handleDeletePrompt(activeChannel);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            color: '#d32f2f',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            borderTop: '1px solid #f0f0f0'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#ffebee'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Metrics Grid - Multi-column layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1px',
                background: '#e0e0e0'
              }}>
                {/* Analysis Score */}
                <div style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Analysis Score
                  </div>
                  {currentBinding.lastScore !== undefined && currentBinding.lastScore !== null ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: currentBinding.lastScore >= (currentBinding.scoreThreshold || 70) ? '#4caf50' : '#f44336' }}>
                          {currentBinding.lastScore.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#999' }}>%</span>
                      </div>
                      <div style={{ height: '3px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '2px' }}>
                        <div style={{
                          height: '100%',
                          width: `${currentBinding.lastScore}%`,
                          background: currentBinding.lastScore >= (currentBinding.scoreThreshold || 70) ? '#4caf50' : '#f44336',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <div style={{ fontSize: '8px', color: '#bbb' }}>
                        Target: {currentBinding.scoreThreshold || 70}%
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#ddd' }}>—</div>
                  )}
                </div>

                {/* Total Uses */}
                <div style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Uses
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#2196f3' }}>
                    —
                  </div>
                  <div style={{ fontSize: '8px', color: '#bbb' }}>
                    Not available
                  </div>
                </div>

                {/* Average Latency */}
                <div style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Avg Latency
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#4caf50' }}>
                    —
                  </div>
                  <div style={{ fontSize: '8px', color: '#bbb' }}>
                    Not available
                  </div>
                </div>

                {/* Error Rate */}
                <div style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Error Rate
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#ff9800' }}>
                    —
                  </div>
                  <div style={{ fontSize: '8px', color: '#bbb' }}>
                    Not available
                  </div>
                </div>

                {/* Success Rate */}
                <div style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Success Rate
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#4caf50' }}>
                    —
                  </div>
                  <div style={{ fontSize: '8px', color: '#bbb' }}>
                    Not available
                  </div>
                </div>

                {/* Avg Response Time */}
                <div style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Response Time
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#9c27b0' }}>
                    —
                  </div>
                  <div style={{ fontSize: '8px', color: '#bbb' }}>
                    Not available
                  </div>
                </div>
              </div>
            </>
          );
        })() : (
            // No draft — show compact create prompt
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                {activeChannel === 'voice' ? '📞' : '💬'}
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#666' }}>
                No {activeChannel} prompt configured
              </p>
              <button
                onClick={() => handleCreateFromTemplate(activeChannel)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#4caf50',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#43a047'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#4caf50'}
              >
                ➕ Create from Template
              </button>
            </div>
          )}
      </div>
      )}
    </div>
  );
};

export default TenantPrompts;
