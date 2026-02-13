'use client';

import React, { useState, useEffect } from 'react';

const AGENT_PRIVATE_KEY = '6a390fcd2dac413eec1354b88a58854699752fddc3aacabb596c506caedb1115';
const SERVER_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

export default function WalletInfo() {
  const shortAddr = (addr: string) => `${addr.slice(0, 8)}…${addr.slice(-6)}`;
  const shortKey = (key: string) => `${key.slice(0, 6)}…${key.slice(-4)}`;
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch(`https://api.testnet.hiro.so/extended/v1/address/${SERVER_ADDRESS}/balances`);
        const data = await res.json();
        const stx = data.stx.balance; // MicroSTX
        setBalance((parseInt(stx) / 1000000).toFixed(2));
      } catch (e) {
        console.error('Failed to fetch balance', e);
        setBalance('---');
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Network badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 8,
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.2)',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 6px rgba(16,185,129,0.6)',
        }} />
        <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          TESTNET
        </span>
      </div>

      {/* Server Address */}
      <div style={{
        padding: '4px 10px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginBottom: 1 }}>Server</div>
        <div style={{
          fontSize: '0.62rem', color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {shortAddr(SERVER_ADDRESS)}
          <span style={{ marginLeft: 6, color: 'var(--accent-primary)', fontWeight: 700 }}>
            {balance ? `${balance} STX` : '...'}
          </span>
        </div>
      </div>

      {/* Agent Key */}
      <div style={{
        padding: '4px 10px', borderRadius: 8,
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.15)',
      }}>
        <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginBottom: 1 }}>Agent Key</div>
        <div style={{
          fontSize: '0.62rem', color: 'var(--accent-primary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {shortKey(AGENT_PRIVATE_KEY)}
        </div>
      </div>
    </div>
  );
}
