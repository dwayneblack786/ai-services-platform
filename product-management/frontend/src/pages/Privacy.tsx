import { useNavigate } from 'react-router-dom';

const pageStyle: React.CSSProperties = {
  maxWidth: '860px',
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

const heroMeta: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'rgba(255,255,255,0.45)',
  margin: 0,
};

const tocCard: React.CSSProperties = {
  backgroundColor: 'rgba(37,99,235,0.08)',
  border: '1px solid rgba(37,99,235,0.25)',
  borderRadius: '12px',
  padding: '1.5rem 2rem',
  marginBottom: '2.5rem',
};

const tocTitle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: '700',
  color: 'rgba(147,197,253,0.9)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '1rem',
};

const tocList: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.4rem 2rem',
};

const tocLink: React.CSSProperties = {
  color: 'rgba(147,197,253,0.85)',
  textDecoration: 'none',
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const section: React.CSSProperties = {
  marginBottom: '2.5rem',
};

const sectionHeader: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 1rem',
  paddingBottom: '0.6rem',
  borderBottom: '1px solid rgba(37,99,235,0.2)',
};

const body: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'rgba(255,255,255,0.72)',
  lineHeight: '1.75',
  margin: '0 0 0.75rem',
};

const highlight: React.CSSProperties = {
  backgroundColor: 'rgba(37,99,235,0.1)',
  border: '1px solid rgba(37,99,235,0.2)',
  borderRadius: '8px',
  padding: '1rem 1.25rem',
  marginTop: '0.75rem',
  fontSize: '0.9rem',
  color: 'rgba(255,255,255,0.65)',
  lineHeight: '1.7',
};

const bulletList: React.CSSProperties = {
  paddingLeft: '1.4rem',
  margin: '0.5rem 0 0.75rem',
  color: 'rgba(255,255,255,0.65)',
  fontSize: '0.9rem',
  lineHeight: '1.8',
};

const contactBox: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(37,99,235,0.25)',
  borderRadius: '12px',
  padding: '1.5rem 2rem',
  marginTop: '2rem',
  textAlign: 'center',
};

const Privacy = () => {
  const navigate = useNavigate();
  const effectiveDate = 'March 30, 2026';

  const sections = [
    'Information We Collect',
    'How We Use Your Information',
    'Data Sharing and Disclosure',
    'AI Processing and Model Training',
    'Data Retention',
    'Security',
    'Your Rights',
    'Cookies and Tracking',
    'Children\'s Privacy',
    'Changes to This Policy',
  ];

  return (
    <div id="privacy-page" style={pageStyle}>
      {/* Hero */}
      <div id="privacy-hero" style={heroStyle}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
        <h1 style={heroTitle}>Privacy Policy</h1>
        <p style={heroMeta}>Effective date: {effectiveDate} · Infero Agents, Inc.</p>
      </div>

      {/* Table of Contents */}
      <nav id="privacy-toc" style={tocCard} aria-label="Privacy policy table of contents">
        <div style={tocTitle}>Contents</div>
        <ol style={tocList}>
          {sections.map((s, i) => (
            <li key={i}>
              <a
                href={`#privacy-section-${i + 1}`}
                style={tocLink}
                title={`Jump to: ${s}`}
              >
                {i + 1}. {s}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <p style={body}>
        Infero Agents, Inc. ("Infero," "we," "our," or "us") operates a multi-tenant AI-powered
        platform serving real estate professionals. This Privacy Policy explains how we collect,
        use, disclose, and protect information when you use our platform, APIs, and related services
        ("Services"). By using our Services, you agree to the practices described here.
      </p>

      {/* Section 1 */}
      <div id="privacy-section-1" style={section}>
        <h2 style={sectionHeader}>1. Information We Collect</h2>
        <p style={body}><strong style={{ color: '#ffffff' }}>Account &amp; Identity Data</strong></p>
        <ul style={bulletList}>
          <li>Name, email address, phone number, and company information provided during registration</li>
          <li>OAuth profile data when you sign in via Google or other identity providers</li>
          <li>Role and permission assignments within your tenant organization</li>
        </ul>
        <p style={body}><strong style={{ color: '#ffffff' }}>Usage &amp; Telemetry Data</strong></p>
        <ul style={bulletList}>
          <li>Pages visited, features used, session duration, and click events</li>
          <li>API call logs, error rates, and performance metrics</li>
          <li>Circuit breaker states and infrastructure health signals</li>
        </ul>
        <p style={body}><strong style={{ color: '#ffffff' }}>Real Estate Content Data</strong></p>
        <ul style={bulletList}>
          <li>Property photos uploaded for staging or classification (PropVision, ListingLift)</li>
          <li>Listing descriptions, MLS data, and agent-provided property details</li>
          <li>Voice recordings submitted to FieldVoice for transcription</li>
          <li>Documents submitted to DealDesk for commercial processing</li>
        </ul>
      </div>

      {/* Section 2 */}
      <div id="privacy-section-2" style={section}>
        <h2 style={sectionHeader}>2. How We Use Your Information</h2>
        <p style={body}>We use collected information to:</p>
        <ul style={bulletList}>
          <li>Authenticate users and enforce role-based access controls</li>
          <li>Deliver and improve AI features including listing generation, photo classification, and compliance checking</li>
          <li>Send transactional emails (billing receipts, verification codes, status updates)</li>
          <li>Monitor system health, prevent abuse, and investigate security incidents</li>
          <li>Generate aggregate analytics for platform improvement — never sold to third parties</li>
        </ul>
        <div style={highlight}>
          We do <strong style={{ color: '#ffffff' }}>not</strong> use your real estate content (photos,
          listings, documents) to train our AI models without your explicit written consent. Tenant
          data is logically isolated and never commingled.
        </div>
      </div>

      {/* Section 3 */}
      <div id="privacy-section-3" style={section}>
        <h2 style={sectionHeader}>3. Data Sharing and Disclosure</h2>
        <p style={body}>We share data only in the following circumstances:</p>
        <ul style={bulletList}>
          <li><strong style={{ color: '#ffffff' }}>Service providers:</strong> Stripe (payments), Anthropic / OpenAI (AI inference), Replicate (image generation), Sentry (error tracking) — each bound by data processing agreements</li>
          <li><strong style={{ color: '#ffffff' }}>Legal obligations:</strong> When required by law, court order, or to protect the rights and safety of users or the public</li>
          <li><strong style={{ color: '#ffffff' }}>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, with advance notice to affected tenants</li>
        </ul>
        <p style={body}>We do not sell, rent, or broker your personal data to advertisers or data brokers.</p>
      </div>

      {/* Section 4 */}
      <div id="privacy-section-4" style={section}>
        <h2 style={sectionHeader}>4. AI Processing and Model Training</h2>
        <p style={body}>
          Infero uses third-party LLM APIs (Claude by Anthropic, OpenAI) for content generation tasks.
          Inputs sent to these APIs are subject to the respective provider's data handling policies.
          We configure API calls to opt out of training data usage wherever those options are available.
        </p>
        <p style={body}>
          Our proprietary models (e.g., PropVision DINOv2 classifier) are trained on licensed datasets
          and any tenant-contributed data only under a separate Data Training Addendum signed by a
          tenant administrator.
        </p>
      </div>

      {/* Section 5 */}
      <div id="privacy-section-5" style={section}>
        <h2 style={sectionHeader}>5. Data Retention</h2>
        <ul style={bulletList}>
          <li>Account data is retained while your account is active and for 90 days after deletion request</li>
          <li>Uploaded property photos are retained for 30 days post-pipeline unless saved to your listing store</li>
          <li>Voice recordings are deleted after transcription unless you opt into archive storage</li>
          <li>Audit logs are retained for 12 months for security purposes</li>
        </ul>
      </div>

      {/* Section 6 */}
      <div id="privacy-section-6" style={section}>
        <h2 style={sectionHeader}>6. Security</h2>
        <p style={body}>
          We implement industry-standard safeguards including TLS encryption in transit, AES-256
          encryption at rest, JWT-based authentication with short-lived tokens, role-based access
          control, and continuous security monitoring via Sentry. We conduct annual penetration tests
          and maintain a responsible disclosure program.
        </p>
        <p style={body}>
          Despite these measures, no system is perfectly secure. Please notify us immediately at{' '}
          <strong style={{ color: '#93c5fd' }}>security@inferoagents.ai</strong> if you believe your
          account has been compromised.
        </p>
      </div>

      {/* Section 7 */}
      <div id="privacy-section-7" style={section}>
        <h2 style={sectionHeader}>7. Your Rights</h2>
        <p style={body}>Depending on your jurisdiction, you may have the right to:</p>
        <ul style={bulletList}>
          <li><strong style={{ color: '#ffffff' }}>Access</strong> — request a copy of data we hold about you</li>
          <li><strong style={{ color: '#ffffff' }}>Correction</strong> — update inaccurate personal information</li>
          <li><strong style={{ color: '#ffffff' }}>Deletion</strong> — request erasure of your account and associated data</li>
          <li><strong style={{ color: '#ffffff' }}>Portability</strong> — export your data in a machine-readable format</li>
          <li><strong style={{ color: '#ffffff' }}>Opt-out</strong> — withdraw consent for optional processing activities</li>
        </ul>
        <p style={body}>Submit requests to <strong style={{ color: '#93c5fd' }}>privacy@inferoagents.ai</strong>. We will respond within 30 days.</p>
      </div>

      {/* Section 8 */}
      <div id="privacy-section-8" style={section}>
        <h2 style={sectionHeader}>8. Cookies and Tracking</h2>
        <p style={body}>
          We use session cookies for authentication, local storage for user preferences, and
          minimal first-party analytics. We do not use third-party advertising cookies or
          cross-site tracking pixels. You can disable cookies in your browser settings, though
          some Services may not function correctly without session cookies.
        </p>
      </div>

      {/* Section 9 */}
      <div id="privacy-section-9" style={section}>
        <h2 style={sectionHeader}>9. Children's Privacy</h2>
        <p style={body}>
          Our Services are intended for business use by adults aged 18 and older. We do not
          knowingly collect personal information from children under 13. If you believe a minor
          has submitted data to us, contact us immediately and we will delete it.
        </p>
      </div>

      {/* Section 10 */}
      <div id="privacy-section-10" style={section}>
        <h2 style={sectionHeader}>10. Changes to This Policy</h2>
        <p style={body}>
          We may update this policy to reflect changes in our practices or applicable law. When
          we make material changes, we will notify account administrators via email at least 14 days
          before the changes take effect. Continued use of the Services after the effective date
          constitutes acceptance of the updated policy.
        </p>
      </div>

      {/* Contact */}
      <div id="privacy-contact-box" style={contactBox}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📬</div>
        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#ffffff', marginBottom: '0.25rem' }}>
          Privacy questions?
        </div>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1rem' }}>
          Reach our Data Protection Officer at{' '}
          <strong style={{ color: '#93c5fd' }}>privacy@inferoagents.ai</strong>
        </div>
        <button
          id="privacy-contact-btn"
          onClick={() => navigate('/contact')}
          title="Go to contact page"
          style={{ padding: '0.6rem 1.4rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
        >
          Contact Us
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          id="privacy-back-btn"
          onClick={() => navigate(-1)}
          title="Go back"
          style={{ padding: '0.6rem 1.2rem', backgroundColor: 'transparent', border: '1px solid rgba(37,99,235,0.4)', borderRadius: '8px', color: 'rgba(147,197,253,0.9)', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default Privacy;
