import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles } from '../styles/Products.styles';
import { Product } from '../types';

type TabType = 'configuration' | 'models' | 'image-processing' | 'video-analysis' | 'processing-history' | 'analytics';

interface ProductConfigurationType {
  _id?: string;
  productId: string;
  tenantId: string;
  configuration: Record<string, any>;
  updatedAt?: string;
}

const ComputerVisionConfig = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('configuration');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configuration, setConfiguration] = useState<Record<string, any>>({
    apiKey: '',
    endpoint: '',
    modelType: 'object-detection',
    confidenceThreshold: 0.75,
    maxImageSize: 10,
    supportedFormats: ['jpg', 'png', 'bmp'],
    enableFaceDetection: true,
    enableTextRecognition: true,
    enableObjectDetection: true
  });
  const [saving, setSaving] = useState(false);
  const [existingConfig, setExistingConfig] = useState<ProductConfigurationType | null>(null);

  useEffect(() => {
    fetchProduct();
    fetchConfiguration();
  }, [productId]);

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
    { id: 'configuration' as TabType, label: 'Configuration', icon: '⚙️' },
    { id: 'models' as TabType, label: 'AI Models', icon: '🧠' },
    { id: 'image-processing' as TabType, label: 'Image Processing', icon: '🖼️' },
    { id: 'video-analysis' as TabType, label: 'Video Analysis', icon: '🎥' },
    { id: 'processing-history' as TabType, label: 'Processing History', icon: '📊' },
    { id: 'analytics' as TabType, label: 'Analytics', icon: '📈' },
  ];

  const renderTabContent = () => {
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
                placeholder="Enter your Computer Vision API key"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                Model Type
              </label>
              <select
                value={configuration.modelType}
                onChange={(e) => handleChange('modelType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="object-detection">Object Detection</option>
                <option value="image-classification">Image Classification</option>
                <option value="face-recognition">Face Recognition</option>
                <option value="scene-understanding">Scene Understanding</option>
                <option value="ocr">Optical Character Recognition</option>
              </select>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                Select the primary AI model for image analysis
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                Confidence Threshold ({configuration.confidenceThreshold * 100}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={configuration.confidenceThreshold}
                onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                Minimum confidence level for detections and classifications
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                Max Image Size (MB)
              </label>
              <input
                type="number"
                value={configuration.maxImageSize}
                onChange={(e) => handleChange('maxImageSize', parseInt(e.target.value))}
                min="1"
                max="50"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                Features
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={configuration.enableObjectDetection}
                    onChange={(e) => handleChange('enableObjectDetection', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>Enable Object Detection</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={configuration.enableFaceDetection}
                    onChange={(e) => handleChange('enableFaceDetection', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>Enable Face Detection</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={configuration.enableTextRecognition}
                    onChange={(e) => handleChange('enableTextRecognition', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>Enable Text Recognition (OCR)</span>
                </label>
              </div>
            </div>

            {existingConfig && (
              <div style={{
                padding: '16px',
                background: '#E8F5E9',
                borderRadius: '8px',
                marginTop: '24px',
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
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        );
      case 'models':
        return (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>🧠 AI Models</p>
            <p>Configure and train custom computer vision models</p>
            <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '16px' }}>Coming soon...</p>
          </div>
        );
      case 'image-processing':
        return (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>🖼️ Image Processing</p>
            <p>Configure image preprocessing, filters, and enhancement settings</p>
            <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '16px' }}>Coming soon...</p>
          </div>
        );
      case 'video-analysis':
        return (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>🎥 Video Analysis</p>
            <p>Configure video frame extraction, object tracking, and activity recognition</p>
            <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '16px' }}>Coming soon...</p>
          </div>
        );
      case 'processing-history':
        return (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>📊 Processing History</p>
            <p>View history of processed images and analysis results</p>
            <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '16px' }}>Coming soon...</p>
          </div>
        );
      case 'analytics':
        return (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>📈 Analytics</p>
            <p>View processing metrics, model performance, and usage statistics</p>
            <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '16px' }}>Coming soon...</p>
          </div>
        );
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
            {product?.name || 'Computer Vision Configuration'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#666' }}>
            Configure image and video analysis, AI models, and detection settings
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
                <span>{tab.label}</span>
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

export default ComputerVisionConfig;
