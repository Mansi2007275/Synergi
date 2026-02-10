'use client';

interface HeaderProps {
  network: string;
  walletAddress?: string;
}

export default function Header({ network, walletAddress }: HeaderProps) {
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">x</div>
          <div className="header-title">
            <span>x402</span> Agent
          </div>
        </div>
        <div className="header-meta">
          <span className="badge badge-network">{network}</span>
          {walletAddress && (
            <span className="badge badge-wallet" title={walletAddress}>
              {shortAddress}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
