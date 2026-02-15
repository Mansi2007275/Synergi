'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Twitter, Send } from 'lucide-react';

export default function Footer() {
  const productLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Agents', path: '/agents' },
    { name: 'Tools', path: '/tools' },
    { name: 'Marketplace', path: '/tools' },
    { name: 'Analytics', path: '#' },
  ];

  const resourceLinks = [
    { name: 'Documentation', path: '/docs' },
    { name: 'API Reference', path: 'https://docs.stacks.co' },
    { name: 'Tutorials', path: '#' },
    { name: 'Community', path: 'https://discord.gg/stacks' },
    { name: 'Support', path: 'mailto:support@synergi.ai' },
  ];

  return (
    <footer style={{
      marginTop: 80,
      borderTop: '1px solid #e5e7eb',
      background: '#f8f9fa',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle Top Accent */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, #FF854B, #f59e0b, #FF854B)',
      }} />

      <div className="footer-grid">
        {/* Brand Column */}
        <div className="brand-col">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <img
                src="/logo.png"
                alt="SYNERGI"
                style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <span className="mono" style={{
                fontWeight: 900,
                fontSize: '1.3rem',
                color: '#111827',
                letterSpacing: '-0.04em',
                textTransform: 'uppercase'
              }}>
                SYNERGI
              </span>
            </div>
          </Link>
          <p style={{
            fontSize: '0.85rem',
            color: '#6b7280',
            lineHeight: 1.6,
            marginBottom: 24,
            maxWidth: '300px',
            fontFamily: 'var(--font-mono)'
          }}>
            The autonomous layer for the agent economy. Secure, trustless A2A micropayments on Stacks.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { icon: Github, href: 'https://github.com/Mansi2007275/x402-autonomous-agent-?tab=readme-ov-file' },
              { icon: Twitter, href: 'https://twitter.com/synergi' },
              { icon: Send, href: 'https://t.me/synergi' }
            ].map((social, i) => (
              <a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-button"
              >
                <social.icon size={18} />
              </a>
            ))}
          </div>
        </div>

        {/* Product Column */}
        <div className="nav-col">
          <h4 className="mono section-title">PRODUCT</h4>
          <div className="links">
            {productLinks.map((link) => (
              <Link key={link.name} href={link.path} className="link">
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Resources Column */}
        <div className="nav-col">
          <h4 className="mono section-title">RESOURCES</h4>
          <div className="links">
            {resourceLinks.map((link) => (link.path.startsWith('/') ? (
              <Link key={link.name} href={link.path} className="link">
                {link.name}
              </Link>
            ) : (
              <a key={link.name} href={link.path} className="link" target="_blank" rel="noopener noreferrer">
                {link.name}
              </a>
            )))}
          </div>
        </div>

        {/* Network Stats Column */}
        <div className="network-col">
          <h4 className="mono section-title">NETWORK STATUS</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stat-card">
              <span className="label mono">PROTOCOL</span>
              <span className="value mono">x402</span>
            </div>
            <div className="stat-card">
              <span className="label mono">CHAIN</span>
              <span className="value mono">Stacks L2</span>
            </div>
            <div className="stat-card live">
              <span className="label mono">SYSTEM</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="pulse-dot" />
                <span className="value mono" style={{ color: '#16a34a' }}>OPERATIONAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="mono copyright">
          &copy; 2026 SYNERGI_PROTOCOL. ALL RIGHTS RESERVED.
        </div>
        <div className="bottom-links">
          <Link href="/privacy" className="mono bottom-link">PRIVACY</Link>
          <span style={{ color: '#e5e7eb' }}>|</span>
          <Link href="/terms" className="mono bottom-link">TERMS</Link>
        </div>
      </div>

      <style jsx>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
          gap: 64px;
          padding: 56px 48px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .section-title {
          font-size: 0.75rem;
          font-weight: 800;
          margin-bottom: 20px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #111827;
          border-left: 3px solid #FF854B;
          padding-left: 10px;
        }

        .links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .link {
          font-size: 0.85rem;
          color: #6b7280;
          text-decoration: none;
          transition: all 0.2s ease;
          font-weight: 500;
          position: relative;
          width: fit-content;
        }

        .link:hover {
          color: #111827;
          padding-left: 6px;
        }

        .link::before {
          content: '>';
          position: absolute;
          left: -10px;
          opacity: 0;
          transition: all 0.2s ease;
          color: #FF854B;
          font-family: monospace;
        }

        .link:hover::before {
          opacity: 1;
          left: 0;
        }

        .social-button {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          color: #6b7280;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .social-button:hover {
          background: #FF854B;
          color: #ffffff;
          border-color: #FF854B;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255,133,75,0.25);
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          border-color: #FF854B;
          box-shadow: 0 2px 8px rgba(255,133,75,0.1);
        }

        .stat-card .label {
          font-size: 0.65rem;
          color: #9ca3af;
          letter-spacing: 0.05em;
        }

        .stat-card .value {
          font-size: 0.8rem;
          color: #374151;
          font-weight: 600;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #FF854B;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(255,133,75,0.7);
          animation: pulse-green 2s infinite;
        }

        @keyframes pulse-green {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255,133,75,0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(255,133,75,0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255,133,75,0);
          }
        }

        .footer-bottom {
          padding: 20px 48px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f3f4f6;
        }

        .bottom-links {
          display: flex;
          gap: 32px;
        }

        .bottom-link {
          font-size: 0.7rem;
          color: #9ca3af;
          text-decoration: none;
          transition: color 0.2s ease;
          font-weight: 600;
        }

        .bottom-link:hover {
          color: #FF854B;
        }

        .copyright {
          font-size: 0.7rem;
          color: #9ca3af;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 48px;
            padding: 48px 32px;
          }
        }

        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr;
            padding: 32px 24px;
          }

          .footer-bottom {
            flex-direction: column;
            gap: 20px;
            padding: 24px;
            text-align: center;
          }

          .bottom-links {
            justify-content: center;
          }
        }
      `}</style>
    </footer>
  );
}
