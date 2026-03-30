import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial'];
const TONES = ['professional', 'luxury', 'conversational', 'concise'];

const ListingEditor = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fields, setFields] = useState({
    address: '', price: '', bedrooms: '', bathrooms: '',
    sqft: '', propertyType: 'Single Family', yearBuilt: '',
    tone: 'professional', extras: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.address) { setError('Address is required'); return; }
    setSubmitting(true);
    setError('');

    try {
      // 1. Upload photos and collect paths
      const photoPaths: string[] = [];
      for (const photo of photos) {
        const fd = new FormData();
        fd.append('photo', photo);
        const uploadRes = await apiClient.post('/api/uploads/photo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        photoPaths.push(uploadRes.data.path);
      }

      // 2. Create the listing (draft)
      const listingRes = await apiClient.post('/api/listings', {
        address: fields.address,
        price: fields.price ? Number(fields.price) : undefined,
        bedrooms: fields.bedrooms ? Number(fields.bedrooms) : undefined,
        bathrooms: fields.bathrooms ? Number(fields.bathrooms) : undefined,
        sqft: fields.sqft ? Number(fields.sqft) : undefined,
        propertyType: fields.propertyType,
        yearBuilt: fields.yearBuilt ? Number(fields.yearBuilt) : undefined,
        tone: fields.tone,
        extras: fields.extras || undefined,
        photoPaths,
      });

      const listingId = listingRes.data.listing?.id || listingRes.data.listing?._id;

      // 3. Start the agent pipeline if photos were uploaded
      if (photoPaths.length > 0) {
        const photoData = photoPaths.map((p, i) => ({
          photoId: `photo-${i}`,
          originalPath: p,
        }));

        const pipelineRes = await apiClient.post('/api/listing-pipeline/start', {
          listingId,
          photos: photoData,
          initialFields: {
            address: fields.address,
            price: fields.price ? Number(fields.price) : undefined,
            tone: fields.tone,
          },
          datastoreConfig: { type: 'MONGODB' },
        });

        const runId = pipelineRes.data.runId;
        navigate(`/listinglift/${listingId}/pipeline?runId=${runId}`);
      } else {
        navigate(`/listinglift/${listingId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={() => navigate('/listinglift')}>← Back</button>
        <h1 style={titleStyle}>New Listing</h1>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <form onSubmit={handleSubmit} style={formStyle}>
        {/* Property Details */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Property Details</h2>
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Address *</label>
              <input name="address" value={fields.address} onChange={handleField} style={inputStyle} placeholder="123 Main St, City, State" required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Price</label>
              <input name="price" value={fields.price} onChange={handleField} style={inputStyle} placeholder="500000" type="number" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Bedrooms</label>
              <input name="bedrooms" value={fields.bedrooms} onChange={handleField} style={inputStyle} placeholder="3" type="number" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Bathrooms</label>
              <input name="bathrooms" value={fields.bathrooms} onChange={handleField} style={inputStyle} placeholder="2" type="number" step="0.5" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Square Feet</label>
              <input name="sqft" value={fields.sqft} onChange={handleField} style={inputStyle} placeholder="1800" type="number" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Year Built</label>
              <input name="yearBuilt" value={fields.yearBuilt} onChange={handleField} style={inputStyle} placeholder="2005" type="number" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Property Type</label>
              <select name="propertyType" value={fields.propertyType} onChange={handleField} style={inputStyle}>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Copywriting Tone</label>
              <select name="tone" value={fields.tone} onChange={handleField} style={inputStyle}>
                {TONES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={labelStyle}>Additional Notes (optional)</label>
            <textarea name="extras" value={fields.extras} onChange={handleField} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="Pool, new roof, motivated seller..." />
          </div>
        </section>

        {/* Photo Upload */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Photos</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
            Upload property photos to run the AI analysis pipeline (flooring, counters, style detection, auto-fill, and copywriting).
          </p>
          <div
            style={dropZoneStyle}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Click to upload photos or drag and drop</div>
            <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>JPG, PNG up to 20MB each</div>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />

          {photoPreviews.length > 0 && (
            <div style={photoGridStyle}>
              {photoPreviews.map((src, i) => (
                <div key={i} style={photoThumbStyle}>
                  <img src={src} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                  <button type="button" style={removePhotoBtn} onClick={() => removePhoto(i)}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" style={cancelBtnStyle} onClick={() => navigate('/listinglift')}>Cancel</button>
          <button type="submit" style={submitBtnStyle} disabled={submitting}>
            {submitting ? 'Creating...' : photos.length > 0 ? 'Create & Run AI Pipeline' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

const pageStyle: React.CSSProperties = { padding: '32px', maxWidth: '900px', margin: '0 auto' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' };
const backBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' };
const titleStyle: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#f9fafb', margin: 0 };
const errorStyle: React.CSSProperties = { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '24px' };
const sectionStyle: React.CSSProperties = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '24px' };
const sectionTitleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '20px' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: '#d1d5db' };
const inputStyle: React.CSSProperties = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '6px', padding: '8px 12px', color: '#f9fafb', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
const dropZoneStyle: React.CSSProperties = { border: '2px dashed #374151', borderRadius: '8px', padding: '32px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px' };
const photoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' };
const photoThumbStyle: React.CSSProperties = { position: 'relative', height: '90px', borderRadius: '6px', overflow: 'hidden' };
const removePhotoBtn: React.CSSProperties = { position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '14px', lineHeight: '20px', textAlign: 'center' };
const cancelBtnStyle: React.CSSProperties = { background: 'none', border: '1px solid #374151', borderRadius: '8px', padding: '10px 20px', color: '#9ca3af', cursor: 'pointer' };
const submitBtnStyle: React.CSSProperties = { backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontWeight: 600 };

export default ListingEditor;
