import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const pageStyle: React.CSSProperties = {
  maxWidth: '900px',
  margin: '0 auto',
  padding: '2rem 1rem',
  color: '#e2e8f0',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const heroStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '3rem',
};

const heroTitle: React.CSSProperties = {
  fontSize: '2.4rem',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 0.75rem',
  letterSpacing: '-0.5px',
};

const heroSubtitle: React.CSSProperties = {
  fontSize: '1.1rem',
  color: 'rgba(255,255,255,0.65)',
  margin: 0,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '2rem',
  alignItems: 'start',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(37,99,235,0.25)',
  borderRadius: '12px',
  padding: '2rem',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: '600',
  color: '#ffffff',
  margin: '0 0 1.5rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(37,99,235,0.2)',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '1.25rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '500',
  color: 'rgba(255,255,255,0.7)',
  marginBottom: '0.4rem',
  letterSpacing: '0.3px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  backgroundColor: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(37,99,235,0.3)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '130px',
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  marginTop: '0.5rem',
};

const infoItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '1.5rem',
};

const infoIconStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  flexShrink: 0,
  marginTop: '2px',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: 'rgba(147,197,253,0.9)',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '0.2rem',
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'rgba(255,255,255,0.85)',
  lineHeight: '1.5',
};

const successBanner: React.CSSProperties = {
  backgroundColor: 'rgba(16,185,129,0.15)',
  border: '1px solid rgba(16,185,129,0.4)',
  borderRadius: '8px',
  padding: '1rem 1.25rem',
  marginBottom: '1.5rem',
  color: '#6ee7b7',
  fontSize: '0.95rem',
  textAlign: 'center',
};

const mapPlaceholder: React.CSSProperties = {
  marginTop: '2rem',
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(37,99,235,0.2)',
  borderRadius: '12px',
  padding: '2rem',
  textAlign: 'center',
};

const ContactUs = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production this would POST to an API endpoint
    setSubmitted(true);
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div id="contact-page" style={pageStyle}>
      {/* Hero */}
      <div id="contact-hero" style={heroStyle}>
        <h1 style={heroTitle}>Contact Us</h1>
        <p style={heroSubtitle}>
          Have a question, partnership inquiry, or need support? We'd love to hear from you.
        </p>
      </div>

      <div id="contact-grid" style={gridStyle}>
        {/* Contact Form */}
        <div id="contact-form-card" style={cardStyle}>
          <h2 style={sectionTitle}>Send us a message</h2>

          {submitted && (
            <div id="contact-success" style={successBanner}>
              ✓ Message sent! We'll get back to you within 1 business day.
            </div>
          )}

          <form id="contact-form" onSubmit={handleSubmit} noValidate>
            <div style={formGroupStyle}>
              <label htmlFor="contact-name" style={labelStyle}>Full Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Smith"
                required
                style={inputStyle}
                title="Your full name"
              />
            </div>

            <div style={formGroupStyle}>
              <label htmlFor="contact-email" style={labelStyle}>Email Address</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane@brokerage.com"
                required
                style={inputStyle}
                title="Your email address"
              />
            </div>

            <div style={formGroupStyle}>
              <label htmlFor="contact-subject" style={labelStyle}>Subject</label>
              <select
                id="contact-subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
                style={{ ...inputStyle, cursor: 'pointer' }}
                title="Message subject"
              >
                <option value="">Select a topic…</option>
                <option value="sales">Sales &amp; Pricing</option>
                <option value="support">Technical Support</option>
                <option value="partnership">Partnership Inquiry</option>
                <option value="billing">Billing &amp; Subscriptions</option>
                <option value="feedback">Product Feedback</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label htmlFor="contact-message" style={labelStyle}>Message</label>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us how we can help…"
                required
                style={textareaStyle}
                title="Your message"
              />
            </div>

            <button
              id="contact-submit-btn"
              type="submit"
              style={submitButtonStyle}
              title="Send your message"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            >
              Send Message
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div id="contact-info-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Get in touch</h2>

            <div id="contact-email-info" style={infoItemStyle}>
              <span style={infoIconStyle}>📧</span>
              <div>
                <div style={infoLabelStyle}>Email</div>
                <div style={infoValueStyle}>support@inferoagents.ai</div>
                <div style={{ ...infoValueStyle, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  General &amp; technical support
                </div>
              </div>
            </div>

            <div id="contact-sales-info" style={infoItemStyle}>
              <span style={infoIconStyle}>💼</span>
              <div>
                <div style={infoLabelStyle}>Sales</div>
                <div style={infoValueStyle}>sales@inferoagents.ai</div>
                <div style={{ ...infoValueStyle, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  Pricing, demos, and enterprise plans
                </div>
              </div>
            </div>

            <div id="contact-hours-info" style={infoItemStyle}>
              <span style={infoIconStyle}>🕐</span>
              <div>
                <div style={infoLabelStyle}>Support Hours</div>
                <div style={infoValueStyle}>Monday – Friday, 8am – 6pm EST</div>
                <div style={{ ...infoValueStyle, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  Emergency support available 24/7 for Pro plans
                </div>
              </div>
            </div>

            <div id="contact-location-info" style={infoItemStyle}>
              <span style={infoIconStyle}>📍</span>
              <div>
                <div style={infoLabelStyle}>Headquarters</div>
                <div style={infoValueStyle}>
                  123 Innovation Drive, Suite 400<br />
                  Austin, TX 78701
                </div>
              </div>
            </div>
          </div>

          <div id="contact-response-card" style={cardStyle}>
            <h2 style={sectionTitle}>Response times</h2>
            {[
              { tier: 'Enterprise', time: '&lt; 2 hours', color: '#6ee7b7' },
              { tier: 'Pro', time: '&lt; 8 hours', color: '#93c5fd' },
              { tier: 'Starter', time: '&lt; 24 hours', color: 'rgba(255,255,255,0.6)' },
            ].map(({ tier, time, color }) => (
              <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>{tier} plan</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color }} dangerouslySetInnerHTML={{ __html: time }} />
              </div>
            ))}
          </div>

          <button
            id="contact-back-btn"
            onClick={() => navigate(-1)}
            title="Go back"
            style={{ padding: '0.6rem 1.2rem', backgroundColor: 'transparent', border: '1px solid rgba(37,99,235,0.4)', borderRadius: '8px', color: 'rgba(147,197,253,0.9)', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Office visual */}
      <div id="contact-office-section" style={mapPlaceholder}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#ffffff', marginBottom: '0.25rem' }}>Infero Agents HQ</div>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Austin, Texas — the heart of real estate innovation</div>
      </div>
    </div>
  );
};

export default ContactUs;
