'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletInfo from './WalletInfo';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Agents', path: '/agents' },
    { name: 'Tools', path: '/tools' },
    { name: 'Docs', path: '/docs' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 0',
      borderBottom: '2px solid rgba(168, 85, 247, 0.2)',
      marginBottom: 32,
      position: 'sticky',
      top: 0,
      backgroundColor: 'rgba(5, 5, 5, 0.95)',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative' }}>
          <Link href="/">
            <img
              src="/logo.png"
              alt="SYNERGI Logo"
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-sm)',
                boxShadow: '4px 4px 0 0 rgba(168, 85, 247, 0.3)',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = '6px 6px 0 0 rgba(168, 85, 247, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = '4px 4px 0 0 rgba(168, 85, 247, 0.3)';
              }}
            />
          </Link>
          <div style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#34d399',
            border: '2px solid var(--bg-primary)',
            boxShadow: '0 0 12px #34d399',
            animation: 'pulse 2s infinite',
          }} />
        </div>
        <div>
          <div className="mono" style={{
            fontWeight: 800,
            fontSize: '1.75rem',
            color: '#ffffff',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            SYNERGI
            <span style={{
              color: '#22d3ee',
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              backgroundColor: 'rgba(34, 211, 238, 0.15)',
              border: '1px solid rgba(34, 211, 238, 0.4)',
              borderRadius: 4,
            }}>
              v2.0
            </span>
          </div>
          <div className="mono" style={{
            fontSize: '0.7rem',
            color: '#a1a1aa',
            marginTop: 6,
            letterSpacing: '0.05em',
          }}>
            x402 AUTONOMOUS AGENT ECONOMY
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: 32,
      }}
      className="desktop-nav"
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className="mono"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: isActive(item.path) ? '#ffffff' : '#a1a1aa',
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.2s ease',
                position: 'relative',
                backgroundColor: isActive(item.path) ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: isActive(item.path) ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                boxShadow: isActive(item.path) ? '2px 2px 0 0 rgba(168, 85, 247, 0.2)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.color = '#a1a1aa';
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <WalletInfo />
      </nav>

      {/* Mobile Hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none',
          flexDirection: 'column',
          gap: 5,
          padding: 10,
          background: 'transparent',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
          e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div style={{
          width: 24,
          height: 2,
          backgroundColor: '#ffffff',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          transform: mobileMenuOpen ? 'rotate(45deg) translateY(7px)' : 'none',
        }} />
        <div style={{
          width: 24,
          height: 2,
          backgroundColor: '#ffffff',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          opacity: mobileMenuOpen ? 0 : 1,
        }} />
        <div style={{
          width: 24,
          height: 2,
          backgroundColor: '#ffffff',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none',
        }} />
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(14, 14, 18, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderTop: 'none',
            padding: 20,
            display: 'none',
            flexDirection: 'column',
            gap: 12,
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className="mono"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isActive(item.path) ? '#ffffff' : '#a1a1aa',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive(item.path) ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: isActive(item.path) ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              {item.name}
            </Link>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <WalletInfo />
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .mobile-menu {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
