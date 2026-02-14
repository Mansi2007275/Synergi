'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      marginTop: 64,
      paddingTop: 32,
      paddingBottom: 24,
      borderTop: '2px solid rgba(168, 85, 247, 0.2)',
      background: 'linear-gradient(180deg, transparent 0%, rgba(168, 85, 247, 0.03) 100%)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 48,
        marginBottom: 32,
      }}>
        {/* Brand Column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <img
              src="/logo.png"
              alt="SYNERGI"
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            />
            <span className="mono" style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffffff' }}>
              SYNERGI
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#a1a1aa', lineHeight: 1.6, marginBottom: 16 }}>
            Autonomous agent-to-agent micropayment marketplace powered by x402 protocol on Stacks.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {['GitHub', 'Twitter', 'Discord'].map((social) => (
              <a
                key={social}
                href="#"
                style={{
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#a1a1aa',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                  e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#a1a1aa';
                }}
              >
                {social[0]}
              </a>
            ))}
          </div>
        </div>

        {/* Product Column */}
        <div>
          <h4 className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: 16, letterSpacing: '0.05em' }}>
            PRODUCT
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Dashboard', 'Agents', 'Tools', 'Marketplace', 'Analytics'].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  fontSize: '0.85rem',
                  color: '#a1a1aa',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
              >
                {link}
              </a>
            ))}
          </div>
        </div>

        {/* Resources Column */}
        <div>
          <h4 className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: 16, letterSpacing: '0.05em' }}>
            RESOURCES
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Documentation', 'API Reference', 'Tutorials', 'Community', 'Support'].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  fontSize: '0.85rem',
                  color: '#a1a1aa',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
              >
                {link}
              </a>
            ))}
          </div>
        </div>

        {/* Network Stats Column */}
        <div>
          <h4 className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: 16, letterSpacing: '0.05em' }}>
            NETWORK
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              backgroundColor: 'rgba(168, 85, 247, 0.05)',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginBottom: 4 }}>Protocol</div>
              <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c084fc' }}>x402</div>
            </div>
            <div style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(34, 211, 238, 0.2)',
              backgroundColor: 'rgba(34, 211, 238, 0.05)',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginBottom: 4 }}>Network</div>
              <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22d3ee' }}>Stacks Testnet</div>
            </div>
            <div style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
              backgroundColor: 'rgba(52, 211, 153, 0.05)',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginBottom: 4 }}>Settlement</div>
              <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>STX / sBTC</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{
        paddingTop: 24,
        borderTop: '1px solid rgba(168, 85, 247, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div className="mono" style={{ fontSize: '0.8rem', color: '#71717a' }}>
          © 2026 SYNERGI. Built for Stacks Hackathon.
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'License'].map((link) => (
            <a
              key={link}
              href="#"
              className="mono"
              style={{
                fontSize: '0.75rem',
                color: '#71717a',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#a1a1aa'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
