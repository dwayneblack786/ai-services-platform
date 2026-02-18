import React from 'react';

interface PMSHeaderProps {
  /** Optional subtitle shown below the main title (e.g. page-specific context) */
  subtitle?: string;
  /** Optional right-side content (action buttons, badges, etc.) */
  actions?: React.ReactNode;
}

const PMSHeader: React.FC<PMSHeaderProps> = ({ subtitle, actions }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 28px',
    background: 'linear-gradient(135deg, #617a92 0%, #617a92 50%, #617a92 100%)',
    borderRadius: '10px',
    marginBottom: '28px',
    boxShadow: '0 4px 16px rgba(21, 101, 192, 0.28)',
  }}>
    {/* Left: branding + subtitle */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {/* Icon badge */}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        flexShrink: 0,
      }}>
        📝
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '700',
            color: '#ffffff',
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}>
            Prompt Management System
          </h1>
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.12)',
            padding: '2px 7px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            PMS
          </span>
        </div>

        {subtitle && (
          <div style={{
            marginTop: '3px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.72)',
            fontWeight: '400',
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>

    {/* Right: action slot */}
    {actions && (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {actions}
      </div>
    )}
  </div>
);

export default PMSHeader;
