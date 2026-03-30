import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

interface Listing {
  id: string;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  price?: number;
  style?: string;
  condition?: string;
  features?: string[];
  photoPaths?: string[];
  mlsDescription?: string;
  headline?: string;
  tagline?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  visionAttributes?: Record<string, any>;
  status: string;
  createdAt: string;
}

const ListingAnalysis = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'vision' | 'copy'>('overview');

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await apiClient.get(`/api/listings/${id}`);
        setListing(response.data.listing);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load listing');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  if (loading) return <div style={loadingStyle}>Loading listing...</div>;
  if (error) return <div style={errorStyle}>{error}</div>;
  if (!listing) return <div style={errorStyle}>Listing not found.</div>;

  const attrs = listing.visionAttributes || {};

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={() => navigate('/listinglift')}>← Back</button>
        <div>
          <h1 style={titleStyle}>{listing.address || 'Listing Details'}</h1>
          <p style={subtitleStyle}>
            {[listing.bedrooms && `${listing.bedrooms} bd`, listing.bathrooms && `${listing.bathrooms} ba`, listing.sqft && `${listing.sqft.toLocaleString()} sqft`].filter(Boolean).join(' · ')}
            {listing.price && ` · $${listing.price.toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabBarStyle}>
        {(['overview', 'vision', 'copy'] as const).map(tab => (
          <button
            key={tab}
            style={{ ...tabBtnStyle, ...(activeTab === tab ? activeTabStyle : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Property Details</h2>
          <div style={detailGridStyle}>
            {[
              { label: 'Address', value: listing.address },
              { label: 'Price', value: listing.price ? `$${listing.price.toLocaleString()}` : '—' },
              { label: 'Bedrooms', value: listing.bedrooms ?? '—' },
              { label: 'Bathrooms', value: listing.bathrooms ?? '—' },
              { label: 'Square Feet', value: listing.sqft ? listing.sqft.toLocaleString() : '—' },
              { label: 'Style', value: listing.style ?? '—' },
              { label: 'Condition', value: listing.condition ?? '—' },
              { label: 'Status', value: listing.status },
            ].map(({ label, value }) => (
              <div key={label} style={detailItemStyle}>
                <div style={detailLabelStyle}>{label}</div>
                <div style={detailValueStyle}>{String(value)}</div>
              </div>
            ))}
          </div>
          {listing.features && listing.features.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={detailLabelStyle}>Detected Features</div>
              <div style={tagsContainerStyle}>
                {listing.features.map((f, i) => <span key={i} style={tagStyle}>{f}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vision Analysis Tab */}
      {activeTab === 'vision' && (
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>PropVision Analysis</h2>
          {Object.keys(attrs).length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No vision analysis available yet. Start the AI pipeline to analyze photos.</p>
          ) : (
            <div style={detailGridStyle}>
              {Object.entries(attrs).map(([key, value]) => (
                <div key={key} style={detailItemStyle}>
                  <div style={detailLabelStyle}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div style={detailValueStyle}>
                    {Array.isArray(value) ? (
                      value.length > 0
                        ? <div style={tagsContainerStyle}>{value.map((v, i) => <span key={i} style={tagStyle}>{String(v)}</span>)}</div>
                        : <span style={{ color: '#6b7280' }}>None detected</span>
                    ) : value !== null ? String(value) : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Copy Tab */}
      {activeTab === 'copy' && (
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Generated Copy</h2>
          {!listing.mlsDescription ? (
            <p style={{ color: '#9ca3af' }}>No copy generated yet. Complete the AI pipeline to generate listing copy.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {listing.headline && (
                <div>
                  <div style={detailLabelStyle}>Headline</div>
                  <p style={copyTextStyle}>{listing.headline}</p>
                </div>
              )}
              {listing.tagline && (
                <div>
                  <div style={detailLabelStyle}>Tagline</div>
                  <p style={copyTextStyle}>{listing.tagline}</p>
                </div>
              )}
              <div>
                <div style={detailLabelStyle}>MLS Description</div>
                <p style={{ ...copyTextStyle, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{listing.mlsDescription}</p>
              </div>
              {listing.socialInstagram && (
                <div>
                  <div style={detailLabelStyle}>Instagram Caption</div>
                  <p style={{ ...copyTextStyle, whiteSpace: 'pre-wrap' }}>{listing.socialInstagram}</p>
                </div>
              )}
              {listing.socialFacebook && (
                <div>
                  <div style={detailLabelStyle}>Facebook Post</div>
                  <p style={{ ...copyTextStyle, whiteSpace: 'pre-wrap' }}>{listing.socialFacebook}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const pageStyle: React.CSSProperties = { padding: '32px', maxWidth: '900px', margin: '0 auto' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' };
const backBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', marginTop: '4px' };
const titleStyle: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#f9fafb', margin: 0 };
const subtitleStyle: React.CSSProperties = { color: '#9ca3af', fontSize: '14px', marginTop: '4px' };
const tabBarStyle: React.CSSProperties = { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #374151' };
const tabBtnStyle: React.CSSProperties = { background: 'none', border: 'none', padding: '10px 20px', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', borderBottom: '2px solid transparent' };
const activeTabStyle: React.CSSProperties = { color: '#f9fafb', borderBottomColor: '#10b981' };
const panelStyle: React.CSSProperties = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '24px' };
const panelTitleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '20px' };
const detailGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' };
const detailItemStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const detailLabelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' };
const detailValueStyle: React.CSSProperties = { fontSize: '14px', color: '#f9fafb' };
const tagsContainerStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' };
const tagStyle: React.CSSProperties = { backgroundColor: '#374151', color: '#d1d5db', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' };
const copyTextStyle: React.CSSProperties = { color: '#d1d5db', fontSize: '14px', lineHeight: 1.6, margin: '8px 0 0' };
const loadingStyle: React.CSSProperties = { padding: '60px', textAlign: 'center', color: '#9ca3af' };
const errorStyle: React.CSSProperties = { padding: '60px', textAlign: 'center', color: '#ef4444' };

export default ListingAnalysis;
