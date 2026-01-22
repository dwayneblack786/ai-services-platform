import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles } from '../styles/Products.styles';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import AssistantChannels from './AssistantChannels';
import PromptConfiguration from './PromptConfiguration';
import AssistantChat from '../components/AssistantChat';
import CallLogs from './CallLogs';
import Transcripts from './Transcripts';
import Analytics from './Analytics';

type TabType = 'configuration' | 'assistant-channels' | 'prompt-config' | 'assistant-chat' | 'call-logs' | 'transcripts' | 'analytics';

interface ProductConfigurationType {
  _id?: string;
  productId: string;
  tenantId: string;
  configuration: Record<string, any>;
  updatedAt?: string;
}

const VirtualAssistantConfig = () => {
  const { productId, tab } = useParams<{ productId: string; tab?: string }>();
  const navigate = useNavigate();
  const { isTenantAdmin } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'configuration');
  const [promptConfigChannel, setPromptConfigChannel] = useState<'voice' | 'chat'>('voice');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configuration, setConfiguration] = useState<Record<string, any>>({
    apiKey: '',
    endpoint: '',
    webhookUrl: '',
    enableNotifications: true,
    maxRequests: 1000
  });
  const [saving, setSaving] = useState(false);
  const [existingConfig, setExistingConfig] = useState<ProductConfigurationType | null>(null);

  useEffect(() => {
    fetchProduct();
    fetchConfiguration();
  }, [productId]);

  // Sync tab from URL parameter
  useEffect(() => {
    if (tab) {
      setActiveTab(tab as TabType);
    }
  }, [tab]);

  // Function to change tab and update URL
  const navigateToTab = (newTab: TabType) => {
    setActiveTab(newTab);
    navigate(`/products/${productId}/configure/${newTab}`, { replace: true });
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/products/${productId}`);
      if (response.data.success) {
        setProduct(response.data.product);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfiguration = async () => {
    try {
      const response = await apiClient.get(`/api/product-configurations/${productId}`);
      if (response.data.success && response.data.configuration) {
        setExistingConfig(response.data.configuration);
        setConfiguration(response.data.configuration.configuration);
      }
    } catch (err: any) {
      console.log('No existing configuration found');
    }
  };

  const handleSave = async () => {
    if (!productId) return;
    
    try {
      setSaving(true);
      const response = await apiClient.post('/api/product-configurations', 
        { productId, configuration }
      );
      if (response.data.success) {
        alert('Configuration saved successfully!');
        fetchConfiguration();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setConfiguration(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'configuration' as TabType, label: 'Configuration', icon: '⚙️', adminOnly: false },
    { id: 'assistant-channels' as TabType, label: 'Assistant Channels', icon: '🤖', adminOnly: true },
    { id: 'prompt-config' as TabType, label: 'Prompt Configuration', icon: '🔧', adminOnly: true },
    { id: 'assistant-chat' as TabType, label: 'Assistant Chat', icon: '💬', adminOnly: false },
    { id: 'call-logs' as TabType, label: 'Call Logs', icon: '📞', adminOnly: false },
    { id: 'transcripts' as TabType, label: 'Transcripts', icon: '📝', adminOnly: false },
    { id: 'analytics' as TabType, label: 'Analytics', icon: '📈', adminOnly: false },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isTenantAdmin());

  const renderTabContent = () => {
    if (!productId) return null;

    switch (activeTab) {
      case 'configuration':
        return (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                API Key
              </label>
              <input
                type="text"
                value={configuration.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="Enter your API key"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                Your unique API key for authenticating requests
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                API Endpoint
              </label>
              <input
                type="text"
                value={configuration.endpoint}
                onChange={(e) => handleChange('endpoint', e.target.value)}
                placeholder="https://api.example.com/v1"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                The endpoint URL for API requests
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                Webhook URL
              </label>
              <input
                type="text"
                value={configuration.webhookUrl}
                onChange={(e) => handleChange('webhookUrl', e.target.value)}
                placeholder="https://your-domain.com/webhook"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                URL to receive webhook notifications
              </p>
            </div>

            {existingConfig && (
              <div style={{
                padding: '16px',
                background: '#E8F5E9',
                borderRadius: '8px',
                marginBottom: '24px',
                border: '1px solid #4CAF50'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#2E7D32' }}>
                  <strong>Note:</strong> This configuration is shared across your tenant. 
                  Last updated: {existingConfig.updatedAt ? new Date(existingConfig.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '2px solid #e0e0e0', paddingTop: '24px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: saving ? '#ccc' : '#4CAF50',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.background = '#45a049';
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.background = '#4CAF50';
                }}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        );
      case 'assistant-channels':
        return <AssistantChannels productId={productId} onNavigate={(tab) => {
          if (tab.startsWith('prompt-config:')) {
            const channel = tab.split(':')[1] as 'voice' | 'chat';
            setPromptConfigChannel(channel);
            navigateToTab('prompt-config');
          } else {
            navigateToTab(tab as TabType);
          }
        }} />;
      case 'prompt-config':
        return <PromptConfiguration productId={productId} initialTab={promptConfigChannel} />;
      case 'assistant-chat':
        return <AssistantChat productId={productId} />;
      case 'call-logs':
        return <CallLogs productId={productId} />;
      case 'transcripts':
        return <Transcripts productId={productId} />;
      case 'analytics':
        return <Analytics productId={productId} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ color: 'red' }}>{error || 'Product not found'}</p>
          <button
            onClick={() => navigate('/products')}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/products')}
        style={{
          marginBottom: '24px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          background: 'white',
          color: '#333',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ← Back to Products
      </button>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', color: '#333' }}>
            {product?.name || 'Virtual Assistant Configuration'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#666' }}>
            Configure voice and chat assistants, channels, and conversation settings
          </p>
        </div>

        <div style={{ display: 'flex', minHeight: '600px' }}>
          <div style={{
            width: '250px',
            borderRight: '2px solid #f0f0f0',
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigateToTab(tab.id)}
                style={{
                  padding: '16px 20px',
                  border: 'none',
                  background: activeTab === tab.id ? '#e3f2fd' : 'transparent',
                  color: activeTab === tab.id ? '#1976d2' : '#666',
                  fontSize: '0.95rem',
                  fontWeight: activeTab === tab.id ? '600' : '500',
                  cursor: 'pointer',
                  borderLeft: activeTab === tab.id ? '4px solid #2196F3' : '4px solid transparent',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>{tab.label}</span>
                  {tab.adminOnly && (
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      background: '#FFA726',
                      color: 'white',
                      borderRadius: '4px',
                      fontWeight: '600',
                      alignSelf: 'flex-start'
                    }}>
                      ADMIN ONLY
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualAssistantConfig;
