import { useNavigate } from 'react-router-dom';

const pageStyle: React.CSSProperties = {
  maxWidth: '960px',
  margin: '0 auto',
  padding: '2rem 1rem',
  color: '#e2e8f0',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const heroStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '3.5rem',
  padding: '3rem 1rem',
  background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.03) 100%)',
  border: '1px solid rgba(37,99,235,0.2)',
  borderRadius: '16px',
};

const heroTitle: React.CSSProperties = {
  fontSize: '2.8rem',
  fontWeight: '800',
  color: '#ffffff',
  margin: '0 0 0.75rem',
  letterSpacing: '-1px',
};

const heroTagline: React.CSSProperties = {
  fontSize: '1.15rem',
  color: 'rgba(255,255,255,0.65)',
  margin: '0 0 1.5rem',
  maxWidth: '600px',
  marginLeft: 'auto',
  marginRight: 'auto',
  lineHeight: '1.6',
};

const heroBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.35rem 1rem',
  backgroundColor: 'rgba(37,99,235,0.2)',
  border: '1px solid rgba(37,99,235,0.4)',
  borderRadius: '20px',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: 'rgba(147,197,253,0.9)',
  letterSpacing: '0.5px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '1.6rem',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 0.5rem',
  letterSpacing: '-0.3px',
};

const sectionSubtitle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'rgba(255,255,255,0.55)',
  margin: '0 0 2rem',
};

const body: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'rgba(255,255,255,0.7)',
  lineHeight: '1.75',
};

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1.5rem',
  marginBottom: '3rem',
};

const grid3: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '1.25rem',
  marginBottom: '3rem',
};

const card: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(37,99,235,0.2)',
  borderRadius: '12px',
  padding: '1.5rem',
};

const productCard: React.CSSProperties = {
  ...card,
  borderTop: '3px solid',
  transition: 'transform 0.15s, border-color 0.15s',
};

const statCard: React.CSSProperties = {
  ...card,
  textAlign: 'center',
  padding: '2rem 1rem',
};

const statValue: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: '800',
  color: '#ffffff',
  lineHeight: 1,
  marginBottom: '0.4rem',
};

const statLabel: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'rgba(255,255,255,0.5)',
  fontWeight: '500',
  letterSpacing: '0.3px',
};

const valueIcon: React.CSSProperties = {
  fontSize: '1.8rem',
  marginBottom: '0.75rem',
};

const valueTitle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: '700',
  color: '#ffffff',
  marginBottom: '0.4rem',
};

const valueBody: React.CSSProperties = {
  fontSize: '0.88rem',
  color: 'rgba(255,255,255,0.55)',
  lineHeight: '1.6',
};

const teamCard: React.CSSProperties = {
  ...card,
  display: 'flex',
  alignItems: 'flex-start',
  gap: '1rem',
};

const avatar: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.3rem',
  flexShrink: 0,
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  border: '2px solid rgba(37,99,235,0.5)',
};

const ctaSection: React.CSSProperties = {
  textAlign: 'center',
  padding: '3rem 2rem',
  background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(37,99,235,0.05))',
  border: '1px solid rgba(37,99,235,0.25)',
  borderRadius: '16px',
  marginTop: '1rem',
};

const products = [
  {
    name: 'ListingLift',
    icon: '🏡',
    color: '#F59E0B',
    desc: 'AI-powered photo staging and listing content generation. Transform raw property photos into magazine-quality presentations with compelling, MLS-ready descriptions.',
  },
  {
    name: 'PropVision',
    icon: '👁️',
    color: '#3B82F6',
    desc: 'Computer vision property attribute classification using DINOv2. Automatically identify features, condition scores, and comparable property characteristics.',
  },
  {
    name: 'PropBrief',
    icon: '📊',
    color: '#10B981',
    desc: 'Market intelligence reports generated on-demand. Competitive analysis, pricing trends, and neighborhood insights synthesized from live market data.',
  },
  {
    name: 'ComplianceGuard',
    icon: '⚖️',
    color: '#6366F1',
    desc: 'Fair Housing compliance checking for listing language. Catch discriminatory phrasing before it reaches the MLS — protecting agents and brokerages alike.',
  },
  {
    name: 'DealDesk',
    icon: '📋',
    color: '#EC4899',
    desc: 'Commercial real estate document processing and extraction. Lease abstraction, due diligence summaries, and clause risk flagging at scale.',
  },
  {
    name: 'FieldVoice',
    icon: '🎙️',
    color: '#14B8A6',
    desc: 'AI voice receptionist for property inquiries. Qualify leads 24/7, schedule showings, and route urgent calls — seamlessly integrated with your CRM.',
  },
];

const teamMembers = [
  { initials: 'CE', name: 'Chief Executive', role: 'Strategy & Vision', desc: 'Former PropTech executive with 15+ years scaling real estate technology platforms.' },
  { initials: 'CT', name: 'Chief Technology', role: 'Platform Architecture', desc: 'ML researcher and systems architect specializing in multi-agent AI and distributed inference.' },
  { initials: 'CP', name: 'Chief Product', role: 'Product & Design', desc: 'Real estate broker turned product leader — brings firsthand agent workflow expertise.' },
  { initials: 'DS', name: 'Data Science Lead', role: 'AI & Model Training', desc: 'Deep learning specialist focused on computer vision for property analysis and RAG pipelines.' },
];

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div id="about-page" style={pageStyle}>
      {/* Hero */}
      <div id="about-hero" style={heroStyle}>
        <div style={heroBadge}>Real Estate AI Platform</div>
        <h1 style={{ ...heroTitle, marginTop: '1rem' }}>Built for the agents<br />who close deals</h1>
        <p style={heroTagline}>
          Infero Agents is a multi-tenant AI platform purpose-built for real estate professionals.
          We turn AI breakthroughs into practical tools that save hours, reduce errors, and help
          brokerages grow.
        </p>
        <button
          id="about-explore-btn"
          onClick={() => navigate('/products')}
          title="Explore our products"
          style={{ padding: '0.75rem 2rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
        >
          Explore Products →
        </button>
      </div>

      {/* Stats */}
      <section id="about-stats-section" aria-label="Platform statistics" style={{ marginBottom: '3rem' }}>
        <div style={grid3}>
          {[
            { value: '7', label: 'AI Products', extra: 'spanning the full transaction lifecycle' },
            { value: '24/7', label: 'Availability', extra: 'with 99.9% uptime SLA' },
            { value: '∞', label: 'Scalability', extra: 'multi-tenant, per-tenant isolation' },
          ].map(({ value, label, extra }) => (
            <div key={label} style={statCard}>
              <div style={statValue}>{value}</div>
              <div style={statLabel}>{label}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.4rem' }}>{extra}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section id="about-mission-section" aria-label="Our mission" style={{ marginBottom: '3rem' }}>
        <h2 style={sectionTitle}>Our Mission</h2>
        <p style={{ ...sectionSubtitle, marginBottom: '1.5rem' }}>Why we exist</p>
        <div style={grid2}>
          <div style={card}>
            <p style={body}>
              Real estate professionals spend countless hours on repetitive tasks — writing listing
              descriptions, reviewing documents, responding to leads at 11pm. We believe agents
              should spend that time building relationships, not wrestling with software.
            </p>
            <p style={{ ...body, marginTop: '1rem' }}>
              Infero Agents packages the latest advances in large language models, computer vision,
              and voice AI into a unified platform that slots into existing workflows. No PhD required.
              No rip-and-replace. Just meaningful automation where it matters most.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '🤝', title: 'Agent-First Design', body: 'Every feature is tested with working real estate professionals before release.' },
              { icon: '🔒', title: 'Compliance-Ready', body: 'Built with Fair Housing, MLS rules, and data privacy requirements in mind from day one.' },
              { icon: '⚡', title: 'Human-in-the-Loop', body: 'AI assists — agents decide. Every pipeline includes review gates so nothing goes live without approval.' },
            ].map(({ icon, title, body: b }) => (
              <div key={title} style={{ ...card, display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '1rem 1.25rem' }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#ffffff', marginBottom: '0.2rem' }}>{title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>{b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="about-products-section" aria-label="Our product suite" style={{ marginBottom: '3rem' }}>
        <h2 style={sectionTitle}>The Platform</h2>
        <p style={sectionSubtitle}>Seven AI-powered products, one unified platform</p>
        <div style={grid3}>
          {products.map((p) => (
            <div
              key={p.name}
              id={`about-product-${p.name.toLowerCase().replace(/\s/g, '-')}`}
              style={{ ...productCard, borderTopColor: p.color }}
              title={p.name}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{p.icon}</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>{p.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>{p.desc}</div>
            </div>
          ))}
          {/* TenantLoop — 7th product spans full width */}
          <div
            id="about-product-tenantloop"
            style={{ ...productCard, borderTopColor: '#F97316', gridColumn: '1 / -1' }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>🏘️</div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>TenantLoop</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', maxWidth: '600px' }}>
              Property manager AI assistant for tenant communications, maintenance request triage, and lease renewal workflows. Reduces property manager response time by up to 70%.
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section id="about-values-section" aria-label="Our values" style={{ marginBottom: '3rem' }}>
        <h2 style={sectionTitle}>How We Build</h2>
        <p style={sectionSubtitle}>Principles that guide every decision</p>
        <div style={grid3}>
          {[
            { icon: '🔬', title: 'Pragmatic AI', body: 'We use the right tool for each job — Claude for quality writing, Haiku for speed, DINOv2 for vision. Never AI for AI\'s sake.' },
            { icon: '🛡️', title: 'Secure by Default', body: 'JWT auth, tenant isolation, encrypted storage, and Sentry monitoring. Security is table stakes, not a feature.' },
            { icon: '📡', title: 'Real-Time Platform', body: 'WebSocket-driven notifications, live pipeline status, and circuit breakers ensure the platform stays resilient under load.' },
            { icon: '🧩', title: 'Modular Products', body: 'Each product can be purchased and deployed independently. Mix and match based on your brokerage\'s needs.' },
            { icon: '🔄', title: 'Agentic Workflows', body: 'Every feature uses an appropriate agentic pattern — sequential, parallel, router, or human-in-the-loop — documented before code ships.' },
            { icon: '📏', title: 'Simple Integrations', body: 'gRPC for Java services, REST for external tools, WebSockets for real-time UX. No proprietary lock-in.' },
          ].map(({ icon, title, body: b }) => (
            <div key={title} style={card}>
              <div style={valueIcon}>{icon}</div>
              <div style={valueTitle}>{title}</div>
              <div style={valueBody}>{b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section id="about-team-section" aria-label="Leadership team" style={{ marginBottom: '3rem' }}>
        <h2 style={sectionTitle}>Leadership</h2>
        <p style={sectionSubtitle}>Domain expertise meets deep technology</p>
        <div style={grid2}>
          {teamMembers.map((m) => (
            <div key={m.role} id={`about-team-${m.role.toLowerCase().replace(/\s/g, '-')}`} style={teamCard}>
              <div style={avatar}>{m.initials}</div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>{m.name} Officer</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(147,197,253,0.8)', fontWeight: '500', marginBottom: '0.3rem' }}>{m.role}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div id="about-cta" style={ctaSection}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🚀</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem' }}>
          Ready to see it in action?
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.55)', margin: '0 0 1.5rem' }}>
          Sign up for a free trial or get in touch with our team.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            id="about-signup-btn"
            onClick={() => navigate('/register/initiate')}
            title="Start free trial"
            style={{ padding: '0.75rem 2rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            Start Free Trial
          </button>
          <button
            id="about-contact-btn"
            onClick={() => navigate('/contact')}
            title="Contact our team"
            style={{ padding: '0.75rem 2rem', backgroundColor: 'transparent', color: 'rgba(147,197,253,0.9)', border: '1px solid rgba(37,99,235,0.5)', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(37,99,235,0.9)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)')}
          >
            Talk to Sales
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          id="about-back-btn"
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

export default AboutUs;
