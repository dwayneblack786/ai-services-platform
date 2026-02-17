/**
 * Prompt Management - List View with Filters & Version Timeline
 *
 * Features:
 * - List all prompts with filters (tenant, product, channel, state, environment)
 * - Channel badges (voice/chat indicators)
 * - Version information
 * - Quick actions (edit, view versions, delete)
 * - Multi-channel and tenant isolation display
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import promptApi, { IPromptVersion } from '../services/promptApi';
import styled from '@emotion/styled';
import VersionStatus from '../components/VersionStatus';
import AnalyticsCard from '../components/AnalyticsCard';
import PromptDashboardCard from '../components/PromptDashboardCard';

// Styled Components
const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const CreateButton = styled.button`
  padding: 12px 24px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #1565c0;
  }
`;

const FiltersSection = styled.div`
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const FilterGroup = styled.div``;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 6px;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #1976d2;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #1976d2;
  }
`;

const PromptsTable = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1.5fr;
  padding: 16px 20px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  font-size: 14px;
  color: #333;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1.5fr;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
  align-items: center;

  &:hover {
    background: #f9f9f9;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const PromptInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PromptName = styled.div`
  font-weight: 500;
  color: #333;
  font-size: 15px;
`;

const PromptMeta = styled.div`
  font-size: 12px;
  color: #666;
`;

const ChannelBadge = styled.div<{ channel: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;

  ${props => {
    switch (props.channel) {
      case 'voice': return 'background: #e3f2fd; color: #1976d2;';
      case 'chat': return 'background: #f3e5f5; color: #7b1fa2;';
      case 'sms': return 'background: #fff3e0; color: #f57c00;';
      case 'whatsapp': return 'background: #e8f5e9; color: #388e3c;';
      case 'email': return 'background: #fce4ec; color: #c2185b;';
      default: return 'background: #f5f5f5; color: #757575;';
    }
  }}
`;

const StateBadge = styled.div<{ state: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;

  ${props => {
    switch (props.state) {
      case 'draft': return 'background: #fff3e0; color: #e65100;';
      case 'testing': return 'background: #e3f2fd; color: #0277bd;';
      case 'staging': return 'background: #f3e5f5; color: #6a1b9a;';
      case 'production': return 'background: #e8f5e9; color: #2e7d32;';
      case 'archived': return 'background: #f5f5f5; color: #757575;';
      default: return 'background: #f5f5f5; color: #757575;';
    }
  }}
`;

const VersionBadge = styled.div`
  font-size: 13px;
  color: #666;
  font-weight: 500;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const TemplateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #e8eaf6;
  color: #3949ab;
`;

const LockTooltip = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 10;
    pointer-events: none;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;

  ${props => props.variant === 'primary' && `
    background: #1976d2;
    color: white;
    &:hover { background: #1565c0; }
  `}

  ${props => props.variant === 'secondary' && `
    background: #f5f5f5;
    color: #333;
    &:hover { background: #e0e0e0; }
  `}

  ${props => props.variant === 'danger' && `
    background: #d32f2f;
    color: white;
    &:hover { background: #c62828; }
  `}
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #666;
  font-size: 16px;
`;

const LoadingState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #666;
  font-size: 16px;
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #c62828;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  font-size: 14px;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  margin-top: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const PaginationInfo = styled.div`
  font-size: 14px;
  color: #666;
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const PromptManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prompts, setPrompts] = useState<IPromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // View mode: list or dashboard
  const [view, setView] = useState<'list' | 'dashboard'>(
    (searchParams.get('view') as 'list' | 'dashboard') || 'list'
  );

  // Filters - Initialize from URL params if present
  const [tenantId, setTenantId] = useState(searchParams.get('tenantId') || '');
  const [productId, setProductId] = useState(searchParams.get('productId') || '');
  const [channelType, setChannelType] = useState(searchParams.get('channelType') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [environment, setEnvironment] = useState(searchParams.get('environment') || '');
  const [includeDeleted, setIncludeDeleted] = useState(searchParams.get('includeDeleted') === 'true');

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Sync view + filters to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (view !== 'list') params.view = view;
    if (channelType) params.channelType = channelType;
    if (tenantId) params.tenantId = tenantId;
    if (productId) params.productId = productId;
    if (state) params.state = state;
    if (environment) params.environment = environment;
    if (includeDeleted) params.includeDeleted = 'true';
    setSearchParams(params, { replace: true });
  }, [view, channelType, tenantId, productId, state, environment, includeDeleted]);

  // Load prompts
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await promptApi.listPrompts({
          tenantId: tenantId || undefined,
          productId: productId || undefined,
          channelType: channelType || undefined,
          state: state || undefined,
          environment: environment || undefined,
          includeDeleted,
          limit,
          offset
        });
        setPrompts(response.prompts);
        setTotal(response.total);
      } catch (err: any) {
        setError(err.message || 'Failed to load prompts');
      } finally {
        setLoading(false);
      }
    };

    loadPrompts();
  }, [tenantId, productId, channelType, state, environment, includeDeleted, offset]);

  const handleEdit = (id: string) => {
    navigate(`/prompts/edit/${id}?returnTo=/prompts`);
  };

  const handleNewVersion = async (id: string) => {
    try {
      const newVersion = await promptApi.createNewVersion(id);
      navigate(`/prompts/edit/${newVersion._id}?returnTo=/prompts`);
    } catch (err: any) {
      setError(err.message || 'Failed to create new version');
    }
  };

  const handleViewVersions = (promptId: string) => {
    navigate(`/prompts/versions/${promptId}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will soft delete the prompt (it can be restored).`)) {
      return;
    }

    try {
      await promptApi.softDeletePrompt(id);
      // Reload prompts
      if (!includeDeleted) {
        setPrompts(prompts.filter(p => p._id !== id));
        setTotal(total - 1);
      } else {
        // Update the prompt to show as deleted
        setPrompts(prompts.map(p => p._id === id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete prompt');
    }
  };

  const handleRestore = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to restore "${name}"?`)) {
      return;
    }

    try {
      const restoredPrompt = await promptApi.restorePrompt(id);
      // Update prompts list
      setPrompts(prompts.map(p => p._id === id ? restoredPrompt : p));
    } catch (err: any) {
      setError(err.message || 'Failed to restore prompt');
    }
  };

  const handlePreviousPage = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Prompt Management</Title>
        <CreateButton onClick={() => navigate('/prompts/new')}>
          + Create New Prompt
        </CreateButton>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* View tabs: List | Dashboard */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {(['list', 'dashboard'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: view === v ? '#1976d2' : '#f5f5f5',
              color: view === v ? 'white' : '#333',
              fontWeight: view === v ? '600' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {v === 'list' ? 'List View' : 'Dashboard'}
          </button>
        ))}
      </div>

      {/* Channel quick-filter tabs: All | Voice | Chat */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {([{ label: 'All', value: '' }, { label: 'Voice', value: 'voice' }, { label: 'Chat', value: 'chat' }] as const).map((tab) => (
          <button
            key={tab.label}
            onClick={() => { setChannelType(tab.value); setOffset(0); }}
            style={{
              padding: '6px 16px',
              borderRadius: '16px',
              border: channelType === tab.value ? 'none' : '1px solid #ddd',
              background: channelType === tab.value
                ? (tab.value === 'voice' ? '#e3f2fd' : tab.value === 'chat' ? '#f3e5f5' : '#1976d2')
                : 'white',
              color: channelType === tab.value
                ? (tab.value === 'voice' ? '#1976d2' : tab.value === 'chat' ? '#7b1fa2' : 'white')
                : '#333',
              fontWeight: channelType === tab.value ? '600' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard view with professional cards */}
      {view === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {loading ? (
            <LoadingState>Loading dashboard...</LoadingState>
          ) : prompts.length === 0 ? (
            <EmptyState>No prompts found for dashboard.</EmptyState>
          ) : (
            prompts.map((prompt) => (
              <PromptDashboardCard
                key={prompt._id}
                name={prompt.name || `${prompt.channelType.charAt(0).toUpperCase() + prompt.channelType.slice(1)} Prompt`}
                description={prompt.description}
                channelType={prompt.channelType}
                state={prompt.state}
                version={prompt.version}
                category={prompt.category}
                updatedAt={prompt.updatedAt}
                isDeleted={prompt.isDeleted}
                metrics={prompt.metrics}
                lastScore={undefined} // TODO: Add scoring data when available
                scoreThreshold={70}
                onClick={() => {
                  if (prompt.isDeleted) return;
                  if (prompt.isTemplate && prompt.state !== 'draft') {
                    handleNewVersion(prompt._id);
                  } else {
                    handleEdit(prompt._id);
                  }
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Filters (shown in list view, or always visible for filtering dashboard too) */}
      <FiltersSection style={{ display: view === 'dashboard' ? 'none' : undefined }}>
        <FiltersGrid>
          <FilterGroup>
            <Label>Tenant ID</Label>
            <Input
              type="text"
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setOffset(0);
              }}
              placeholder="Filter by tenant..."
            />
          </FilterGroup>

          <FilterGroup>
            <Label>Product ID</Label>
            <Input
              type="text"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setOffset(0);
              }}
              placeholder="Filter by product..."
            />
          </FilterGroup>

          <FilterGroup>
            <Label>Channel</Label>
            <Select
              value={channelType}
              onChange={(e) => {
                setChannelType(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">All Channels</option>
              <option value="voice">Voice</option>
              <option value="chat">Chat</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </Select>
          </FilterGroup>

          <FilterGroup>
            <Label>State</Label>
            <Select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">All States</option>
              <option value="draft">Draft</option>
              <option value="testing">Testing</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
              <option value="archived">Archived</option>
            </Select>
          </FilterGroup>

          <FilterGroup>
            <Label>Environment</Label>
            <Select
              value={environment}
              onChange={(e) => {
                setEnvironment(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">All Environments</option>
              <option value="development">Development</option>
              <option value="testing">Testing</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </Select>
          </FilterGroup>

          <FilterGroup>
            <Label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => {
                  setIncludeDeleted(e.target.checked);
                  setOffset(0);
                }}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              Include Deleted
            </Label>
          </FilterGroup>
        </FiltersGrid>
      </FiltersSection>

      {/* Prompts Table (list view only) */}
      {view === 'list' && (loading ? (
        <LoadingState>Loading prompts...</LoadingState>
      ) : prompts.length === 0 ? (
        <EmptyState>
          No prompts found. Create your first prompt to get started!
        </EmptyState>
      ) : (
        <>
          <PromptsTable>
            <TableHeader>
              <div>Name / Tenant / Product</div>
              <div>Channel</div>
              <div>Version</div>
              <div>State</div>
              <div>Environment</div>
              <div>Actions</div>
            </TableHeader>

            {prompts.map((prompt) => (
              <TableRow key={prompt._id} style={{ opacity: prompt.isDeleted ? 0.6 : 1, background: prompt.isDeleted ? '#f5f5f5' : undefined }}>
                <PromptInfo>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PromptName>{prompt.name}</PromptName>
                    {prompt.isTemplate && (
                      <TemplateBadge>⚙️ Template</TemplateBadge>
                    )}
                    {prompt.isDeleted && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontWeight: '600' }}>
                        DELETED
                      </span>
                    )}
                  </div>
                  <PromptMeta>
                    {prompt.tenantId ? `Tenant: ${prompt.tenantId}` : 'Platform Template'}
                    {prompt.productId && ` | Product: ${prompt.productId}`}
                  </PromptMeta>
                  {prompt.description && (
                    <PromptMeta style={{ marginTop: '4px' }}>{prompt.description}</PromptMeta>
                  )}
                  {prompt.isDeleted && prompt.deletedAt && (
                    <PromptMeta style={{ marginTop: '4px', color: '#c62828' }}>
                      Deleted: {new Date(prompt.deletedAt).toLocaleDateString()}
                    </PromptMeta>
                  )}
                </PromptInfo>

                <div>
                  <ChannelBadge channel={prompt.channelType}>
                    {prompt.channelType}
                  </ChannelBadge>
                </div>

                <div>
                  <VersionBadge>v{prompt.version}</VersionBadge>
                </div>

                <div>
                  <StateBadge state={prompt.state}>{prompt.state}</StateBadge>
                </div>

                <div>
                  <span style={{ fontSize: '13px', color: '#666' }}>
                    {prompt.environment}
                  </span>
                </div>

                <Actions>
                  {prompt.isDeleted ? (
                    <>
                      <ActionButton variant="primary" onClick={() => handleRestore(prompt._id, prompt.name)}>
                        Restore
                      </ActionButton>
                      <ActionButton variant="secondary" onClick={() => handleViewVersions(prompt.promptId)}>
                        Versions
                      </ActionButton>
                    </>
                  ) : prompt.isTemplate && prompt.state !== 'draft' ? (
                    // System prompt is published — immutable, can only create new version
                    <>
                      <LockTooltip data-tooltip="Published — create a new version to edit">
                        <ActionButton
                          variant="secondary"
                          disabled
                          style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          🔒 Locked
                        </ActionButton>
                      </LockTooltip>
                      <ActionButton variant="primary" onClick={() => handleNewVersion(prompt._id)}>
                        New Version
                      </ActionButton>
                      <ActionButton variant="secondary" onClick={() => handleViewVersions(prompt.promptId)}>
                        Versions
                      </ActionButton>
                    </>
                  ) : (
                    <>
                      <ActionButton variant="primary" onClick={() => handleEdit(prompt._id)}>
                        Edit
                      </ActionButton>
                      <ActionButton variant="secondary" onClick={() => handleViewVersions(prompt.promptId)}>
                        Versions
                      </ActionButton>
                      <ActionButton variant="danger" onClick={() => handleDelete(prompt._id, prompt.name)}>
                        Delete
                      </ActionButton>
                    </>
                  )}
                </Actions>
              </TableRow>
            ))}
          </PromptsTable>

          {/* Pagination */}
          <Pagination>
            <PaginationInfo>
              Showing {offset + 1} - {Math.min(offset + limit, total)} of {total} prompts
            </PaginationInfo>
            <PaginationButtons>
              <ActionButton
                variant="secondary"
                onClick={handlePreviousPage}
                disabled={offset === 0}
                style={{ opacity: offset === 0 ? 0.5 : 1 }}
              >
                Previous
              </ActionButton>
              <ActionButton
                variant="secondary"
                onClick={handleNextPage}
                disabled={offset + limit >= total}
                style={{ opacity: offset + limit >= total ? 0.5 : 1 }}
              >
                Next
              </ActionButton>
            </PaginationButtons>
          </Pagination>
        </>
      ))}
    </Container>
  );
};

export default PromptManagement;
