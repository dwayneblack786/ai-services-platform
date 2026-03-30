import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

interface Listing {
  id: string;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  price?: number;
  status: string;
  mlsDescription?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  processing: '#f59e0b',
  review_1: '#3b82f6',
  review_2: '#8b5cf6',
  published: '#10b981',
  failed: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  processing: 'Processing',
  review_1: 'Awaiting Review',
  review_2: 'Awaiting Copy Review',
  published: 'Published',
  failed: 'Failed',
};

const ListingLift = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/listings');
      setListings(response.data.listings || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await apiClient.delete(`/api/listings/${id}`);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      alert('Failed to delete listing');
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>ListingLift</h1>
          <p style={subtitleStyle}>AI-powered listing creation with photo analysis, auto-fill, and compliance review</p>
        </div>
        <button style={createBtnStyle} onClick={() => navigate('/listinglift/new')}>
          + New Listing
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {loading ? (
        <div style={loadingStyle}>Loading listings...</div>
      ) : listings.length === 0 ? (
        <div style={emptyStyle}>
          <div style={emptyIconStyle}>🏠</div>
          <p style={{ color: '#9ca3af', marginBottom: '16px' }}>No listings yet</p>
          <button style={createBtnStyle} onClick={() => navigate('/listinglift/new')}>
            Create your first listing
          </button>
        </div>
      ) : (
        <div style={gridStyle}>
          {listings.map(listing => (
            <div key={listing.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={{ ...statusBadge, backgroundColor: STATUS_COLORS[listing.status] || '#6b7280' }}>
                  {STATUS_LABELS[listing.status] || listing.status}
                </span>
              </div>

              <h3 style={cardAddressStyle}>{listing.address || 'No address'}</h3>

              <div style={cardDetailsStyle}>
                {listing.bedrooms && <span>{listing.bedrooms} bd</span>}
                {listing.bathrooms && <span>{listing.bathrooms} ba</span>}
                {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                {listing.price && <span>${listing.price.toLocaleString()}</span>}
              </div>

              {listing.mlsDescription && (
                <p style={descPreviewStyle}>{listing.mlsDescription.slice(0, 100)}...</p>
              )}

              <div style={cardActionsStyle}>
                <button style={actionBtnStyle} onClick={() => navigate(`/listinglift/${listing.id}`)}>
                  View
                </button>
                {(listing.status === 'review_1' || listing.status === 'review_2') && (
                  <button
                    style={{ ...actionBtnStyle, backgroundColor: '#3b82f6', color: '#fff' }}
                    onClick={() => navigate(`/listinglift/${listing.id}/pipeline`)}
                  >
                    Review
                  </button>
                )}
                <button
                  style={{ ...actionBtnStyle, color: '#ef4444' }}
                  onClick={() => handleDelete(listing.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Styles
const pageStyle: React.CSSProperties = { padding: '32px', maxWidth: '1200px', margin: '0 auto' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' };
const titleStyle: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#f9fafb', margin: 0 };
const subtitleStyle: React.CSSProperties = { color: '#9ca3af', marginTop: '4px', fontSize: '14px' };
const createBtnStyle: React.CSSProperties = { backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' };
const errorStyle: React.CSSProperties = { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' };
const loadingStyle: React.CSSProperties = { textAlign: 'center', color: '#9ca3af', padding: '60px' };
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: '80px 0' };
const emptyIconStyle: React.CSSProperties = { fontSize: '48px', marginBottom: '16px' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' };
const cardStyle: React.CSSProperties = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px' };
const cardHeaderStyle: React.CSSProperties = { marginBottom: '12px' };
const statusBadge: React.CSSProperties = { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: '#fff' };
const cardAddressStyle: React.CSSProperties = { color: '#f9fafb', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' };
const cardDetailsStyle: React.CSSProperties = { display: 'flex', gap: '12px', color: '#9ca3af', fontSize: '13px', marginBottom: '12px' };
const descPreviewStyle: React.CSSProperties = { color: '#6b7280', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 };
const cardActionsStyle: React.CSSProperties = { display: 'flex', gap: '8px', borderTop: '1px solid #374151', paddingTop: '12px' };
const actionBtnStyle: React.CSSProperties = { background: 'none', border: '1px solid #374151', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', color: '#9ca3af', fontSize: '13px' };

export default ListingLift;
