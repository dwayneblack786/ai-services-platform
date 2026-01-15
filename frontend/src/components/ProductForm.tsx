import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { API_BASE_URL } from '../config/api';
import { PricingTier, Product, ProductFormProps } from '../types';

const ProductForm = ({ product, onClose, onSuccess }: ProductFormProps) => {
  const isEditMode = !!product;
  
  const [formData, setFormData] = useState<Product>({
    name: '',
    category: 'Virtual Assistant',
    subCategory: '',
    description: '',
    features: [''],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        { name: 'small', displayName: 'Small', description: '', price: 0, features: [''] },
        { name: 'medium', displayName: 'Medium', description: '', price: 0, features: [''] },
        { name: 'large', displayName: 'Large', description: '', price: 0, features: [''] }
      ],
      perUseRate: 0,
      perUseUnit: 'request',
      minimumCharge: 0,
      enterprisePrice: 0,
      enterpriseDescription: ''
    },
    industries: [''],
    status: 'coming-soon',
    tags: ['']
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTierTab, setActiveTierTab] = useState<'small' | 'medium' | 'large'>('small');

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        industries: product.industries || ['']
      });
    }
  }, [product]);

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePricingChange = (field: string, value: any) => {
    setFormData(prev => {
      const newPricing = { ...prev.pricing, [field]: value };
      
      // When changing model, initialize appropriate fields
      if (field === 'model') {
        if (value === 'per-use') {
          // Initialize per-use pricing
          newPricing.perUseRate = prev.pricing.perUseRate || 0;
          newPricing.perUseUnit = prev.pricing.perUseUnit || 'request';
          newPricing.minimumCharge = prev.pricing.minimumCharge || 0;
        } else if (value === 'subscription') {
          // Initialize tiers if not present
          if (!newPricing.tiers || newPricing.tiers.length === 0) {
            newPricing.tiers = [
              { name: 'small', displayName: 'Small', description: '', price: 0, features: [''] },
              { name: 'medium', displayName: 'Medium', description: '', price: 0, features: [''] },
              { name: 'large', displayName: 'Large', description: '', price: 0, features: [''] }
            ];
          }
        } else if (value === 'enterprise') {
          // Initialize enterprise pricing
          newPricing.enterprisePrice = prev.pricing.enterprisePrice || 0;
          newPricing.enterpriseDescription = prev.pricing.enterpriseDescription || '';
        }
      }
      
      return {
        ...prev,
        pricing: newPricing
      };
    });
  };

  const handleTierChange = (tierIndex: number, field: keyof PricingTier, value: any) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        tiers: prev.pricing.tiers?.map((tier, idx) => 
          idx === tierIndex ? { ...tier, [field]: value } : tier
        )
      }
    }));
  };

  const handleArrayChange = (field: 'features' | 'industries' | 'tags', index: number, value: string) => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      return {
        ...prev,
        [field]: currentArray.map((item, idx) => idx === index ? value : item)
      };
    });
  };

  const handleArrayAdd = (field: 'features' | 'industries' | 'tags') => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      return {
        ...prev,
        [field]: [...currentArray, '']
      };
    });
  };

  const handleArrayRemove = (field: 'features' | 'industries' | 'tags', index: number) => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      return {
        ...prev,
        [field]: currentArray.filter((_, idx) => idx !== index)
      };
    });
  };

  const handleTierFeatureChange = (tierIndex: number, featureIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        tiers: prev.pricing.tiers?.map((tier, idx) => 
          idx === tierIndex 
            ? { ...tier, features: tier.features.map((f, fIdx) => fIdx === featureIndex ? value : f) }
            : tier
        )
      }
    }));
  };

  const handleTierFeatureAdd = (tierIndex: number) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        tiers: prev.pricing.tiers?.map((tier, idx) => 
          idx === tierIndex 
            ? { ...tier, features: [...tier.features, ''] }
            : tier
        )
      }
    }));
  };

  const handleTierFeatureRemove = (tierIndex: number, featureIndex: number) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        tiers: prev.pricing.tiers?.map((tier, idx) => 
          idx === tierIndex 
            ? { ...tier, features: tier.features.filter((_, fIdx) => fIdx !== featureIndex) }
            : tier
        )
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Clean up empty strings from arrays
      const cleanedPricing: any = {
        model: formData.pricing.model,
        currency: formData.pricing.currency
      };

      // Add model-specific pricing data
      if (formData.pricing.model === 'per-use') {
        cleanedPricing.perUseRate = formData.pricing.perUseRate;
        cleanedPricing.perUseUnit = formData.pricing.perUseUnit;
        cleanedPricing.minimumCharge = formData.pricing.minimumCharge;
      } else if (formData.pricing.model === 'subscription' && formData.pricing.tiers) {
        cleanedPricing.tiers = formData.pricing.tiers.map(tier => ({
          ...tier,
          features: tier.features.filter(f => f.trim())
        }));
      } else if (formData.pricing.model === 'enterprise') {
        cleanedPricing.enterprisePrice = formData.pricing.enterprisePrice;
        cleanedPricing.enterpriseDescription = formData.pricing.enterpriseDescription;
      }

      const cleanedData = {
        ...formData,
        features: formData.features.filter(f => f.trim()),
        industries: (formData.industries || []).filter(i => i.trim()),
        tags: formData.tags.filter(t => t.trim()),
        pricing: cleanedPricing
      };

      if (isEditMode && product?._id) {
        await apiClient.put(`${API_BASE_URL}/api/products/${product._id}`, cleanedData);
      } else {
        await apiClient.post(`${API_BASE_URL}/api/products`, cleanedData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Product form error:', err);
      setError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0 }}>{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={scrollContainerStyle}>
            {error && <div style={errorStyle}>{error}</div>}

            {/* Basic Information */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Basic Information</h3>
              
              <div style={formGroupStyle}>
                <label style={labelStyle}>Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="Virtual Assistant">Virtual Assistant</option>
                  <option value="IDP">IDP</option>
                  <option value="Computer Vision">Computer Vision</option>
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Sub-Category</label>
                <input
                  type="text"
                  value={formData.subCategory || ''}
                  onChange={(e) => handleInputChange('subCategory', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="coming-soon">Coming Soon</option>
                  <option value="beta">Beta</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>

            {/* Features */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Features</h3>
              {formData.features.map((feature, index) => (
                <div key={index} style={arrayItemStyle}>
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleArrayChange('features', index, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Feature description"
                  />
                  <button
                    type="button"
                    onClick={() => handleArrayRemove('features', index)}
                    style={removeButtonStyle}
                    disabled={formData.features.length === 1}
                  >
                    −
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => handleArrayAdd('features')} style={addButtonStyle}>
                + Add Feature
              </button>
            </div>

            {/* Pricing */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Pricing</h3>
              
              <div style={formGroupStyle}>
                <label style={labelStyle}>Pricing Model *</label>
                <select
                  value={formData.pricing.model}
                  onChange={(e) => handlePricingChange('model', e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="subscription">Subscription</option>
                  <option value="per-use">Per-Use</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Per-Use Pricing Fields */}
              {formData.pricing.model === 'per-use' && (
                <>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Rate per Unit (USD) *</label>
                    <input
                      type="number"
                      value={formData.pricing.perUseRate || 0}
                      onChange={(e) => handlePricingChange('perUseRate', parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Unit Type *</label>
                    <select
                      value={formData.pricing.perUseUnit || 'request'}
                      onChange={(e) => handlePricingChange('perUseUnit', e.target.value)}
                      style={inputStyle}
                      required
                    >
                      <option value="request">Per Request</option>
                      <option value="page">Per Page</option>
                      <option value="document">Per Document</option>
                      <option value="hour">Per Hour</option>
                      <option value="minute">Per Minute</option>
                      <option value="transaction">Per Transaction</option>
                      <option value="api-call">Per API Call</option>
                    </select>
                  </div>

                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Minimum Charge (USD)</label>
                    <input
                      type="number"
                      value={formData.pricing.minimumCharge || 0}
                      onChange={(e) => handlePricingChange('minimumCharge', parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </>
              )}

              {/* Enterprise Pricing Fields */}
              {formData.pricing.model === 'enterprise' && (
                <>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Enterprise Price (USD) *</label>
                    <input
                      type="number"
                      value={formData.pricing.enterprisePrice || 0}
                      onChange={(e) => handlePricingChange('enterprisePrice', parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Pricing Description</label>
                    <textarea
                      value={formData.pricing.enterpriseDescription || ''}
                      onChange={(e) => handlePricingChange('enterpriseDescription', e.target.value)}
                      style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                      placeholder="e.g., Custom pricing based on volume, dedicated support included"
                    />
                  </div>
                </>
              )}

              {/* Subscription Tiers - Tabbed Interface */}
              {formData.pricing.model === 'subscription' && formData.pricing.tiers && (
                <div style={tierTabsContainerStyle}>
                  <div style={tabHeadersStyle}>
                    {formData.pricing.tiers.map((tier) => (
                      <button
                        key={tier.name}
                        type="button"
                        onClick={() => setActiveTierTab(tier.name)}
                        style={{
                          ...tabButtonStyle,
                          ...(activeTierTab === tier.name ? activeTabButtonStyle : {})
                        }}
                      >
                        {tier.displayName}
                      </button>
                    ))}
                  </div>

                  {formData.pricing.tiers.map((tier, tierIndex) => (
                    activeTierTab === tier.name && (
                      <div key={tier.name} style={tabContentStyle}>
                        <div style={formGroupStyle}>
                          <label style={labelStyle}>Display Name</label>
                          <input
                            type="text"
                            value={tier.displayName}
                            style={{ ...inputStyle, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                            readOnly
                          />
                        </div>

                        <div style={formGroupStyle}>
                          <label style={labelStyle}>Price (USD) *</label>
                          <input
                            type="number"
                            value={tier.price}
                            onChange={(e) => handleTierChange(tierIndex, 'price', parseFloat(e.target.value) || 0)}
                            style={inputStyle}
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>

                        <div style={formGroupStyle}>
                          <label style={labelStyle}>Description *</label>
                          <textarea
                            value={tier.description}
                            onChange={(e) => handleTierChange(tierIndex, 'description', e.target.value)}
                            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                            required
                          />
                        </div>

                        <div style={formGroupStyle}>
                          <label style={labelStyle}>Tier Features</label>
                          {tier.features.map((feature, featureIndex) => (
                            <div key={featureIndex} style={arrayItemStyle}>
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => handleTierFeatureChange(tierIndex, featureIndex, e.target.value)}
                                style={{ ...inputStyle, flex: 1 }}
                                placeholder="Tier feature"
                              />
                              <button
                                type="button"
                                onClick={() => handleTierFeatureRemove(tierIndex, featureIndex)}
                                style={removeButtonStyle}
                                disabled={tier.features.length === 1}
                              >
                                −
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleTierFeatureAdd(tierIndex)}
                            style={addButtonStyle}
                          >
                            + Add Tier Feature
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Industries */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Industries</h3>
              {(formData.industries || []).map((industry, index) => (
                <div key={index} style={arrayItemStyle}>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => handleArrayChange('industries', index, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Industry name"
                  />
                  <button
                    type="button"
                    onClick={() => handleArrayRemove('industries', index)}
                    style={removeButtonStyle}
                    disabled={(formData.industries || []).length === 1}
                  >
                    −
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => handleArrayAdd('industries')} style={addButtonStyle}>
                + Add Industry
              </button>
            </div>

            {/* Tags */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Tags</h3>
              {formData.tags.map((tag, index) => (
                <div key={index} style={arrayItemStyle}>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => handleArrayChange('tags', index, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Tag"
                  />
                  <button
                    type="button"
                    onClick={() => handleArrayRemove('tags', index)}
                    style={removeButtonStyle}
                    disabled={formData.tags.length === 1}
                  >
                    −
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => handleArrayAdd('tags')} style={addButtonStyle}>
                + Add Tag
              </button>
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button type="button" onClick={onClose} style={cancelButtonStyle} disabled={loading}>
              Cancel
            </button>
            <button type="submit" style={submitButtonStyle} disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  width: '90%',
  maxWidth: '800px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
};

const modalHeaderStyle: React.CSSProperties = {
  padding: '24px',
  borderBottom: '1px solid #e0e0e0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  padding: '4px 8px',
  color: '#666'
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden'
};

const scrollContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '24px'
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '32px'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: '600',
  marginBottom: '16px',
  color: '#333'
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '16px'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: '500',
  color: '#555'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: 'inherit'
};

const arrayItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '8px',
  alignItems: 'center'
};

const addButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#f5f5f5',
  border: '1px solid #ddd',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  color: '#333'
};

const removeButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#ff5252',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '18px',
  color: 'white',
  minWidth: '36px'
};

const modalFooterStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid #e0e0e0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px'
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  backgroundColor: '#f5f5f5',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500'
};

const submitButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500'
};

const errorStyle: React.CSSProperties = {
  padding: '12px',
  backgroundColor: '#ffebee',
  color: '#c62828',
  borderRadius: '6px',
  marginBottom: '16px'
};

const tierTabsContainerStyle: React.CSSProperties = {
  marginTop: '16px'
};

const tabHeadersStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  borderBottom: '2px solid #e0e0e0',
  marginBottom: '24px'
};

const tabButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: '3px solid transparent',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  color: '#666',
  transition: 'all 0.2s ease',
  marginBottom: '-2px'
};

const activeTabButtonStyle: React.CSSProperties = {
  color: '#4CAF50',
  borderBottomColor: '#4CAF50',
  fontWeight: '600'
};

const tabContentStyle: React.CSSProperties = {
  padding: '8px 0'
};

export default ProductForm;
