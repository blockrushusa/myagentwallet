'use client'

import { ChainConfig } from '@/utils/chains'

interface Web3Site {
  name: string;
  mainnetUrl: string;
  testnetUrl?: string;
  icon: string;
  description: string;
  category: 'defi' | 'nft' | 'gaming' | 'social' | 'tools';
}

const web3Sites: Web3Site[] = [
  // DeFi
  {
    name: 'Uniswap',
    mainnetUrl: 'https://app.uniswap.org/',
    testnetUrl: 'https://app.uniswap.org/',
    icon: '🦄',
    description: 'Decentralized token exchange',
    category: 'defi'
  },
  {
    name: 'Aave',
    mainnetUrl: 'https://app.aave.com/',
    testnetUrl: 'https://staging.aave.com/',
    icon: '👻',
    description: 'Lending and borrowing protocol',
    category: 'defi'
  },
  {
    name: 'Compound',
    mainnetUrl: 'https://app.compound.finance/',
    testnetUrl: 'https://app.compound.finance/',
    icon: '💰',
    description: 'Algorithmic money markets',
    category: 'defi'
  },
  {
    name: 'SushiSwap',
    mainnetUrl: 'https://www.sushi.com/swap',
    testnetUrl: 'https://www.sushi.com/swap',
    icon: '🍣',
    description: 'Community-driven DEX',
    category: 'defi'
  },
  {
    name: 'Curve Finance',
    mainnetUrl: 'https://curve.fi/',
    testnetUrl: 'https://curve.fi/',
    icon: '🌊',
    description: 'Stablecoin exchange',
    category: 'defi'
  },
  {
    name: '1inch',
    mainnetUrl: 'https://app.1inch.io/',
    testnetUrl: 'https://app.1inch.io/',
    icon: '🦅',
    description: 'DEX aggregator',
    category: 'defi'
  },

  // NFT & Gaming
  {
    name: 'OpenSea',
    mainnetUrl: 'https://opensea.io/',
    testnetUrl: 'https://testnets.opensea.io/',
    icon: '⛵',
    description: 'NFT marketplace',
    category: 'nft'
  },
  {
    name: 'Rarible',
    mainnetUrl: 'https://rarible.com/',
    testnetUrl: 'https://testnet.rarible.com/',
    icon: '🎨',
    description: 'Create and sell NFTs',
    category: 'nft'
  },
  {
    name: 'Decentraland',
    mainnetUrl: 'https://play.decentraland.org/',
    testnetUrl: 'https://play.decentraland.zone/',
    icon: '🏙️',
    description: 'Virtual world platform',
    category: 'gaming'
  },
  {
    name: 'The Sandbox',
    mainnetUrl: 'https://www.sandbox.game/',
    testnetUrl: 'https://www.sandbox.game/',
    icon: '🏖️',
    description: 'User-generated gaming',
    category: 'gaming'
  },
  {
    name: 'Axie Infinity',
    mainnetUrl: 'https://app.axieinfinity.com/',
    testnetUrl: 'https://app.axieinfinity.com/',
    icon: '🐾',
    description: 'Play-to-earn game',
    category: 'gaming'
  },

  // Social & Identity
  {
    name: 'ENS',
    mainnetUrl: 'https://app.ens.domains/',
    testnetUrl: 'https://app.ens.domains/',
    icon: '📛',
    description: 'Ethereum Name Service',
    category: 'social'
  },
  {
    name: 'Lens Protocol',
    mainnetUrl: 'https://www.lens.xyz/',
    testnetUrl: 'https://testnet.lens.xyz/',
    icon: '🌿',
    description: 'Decentralized social graph',
    category: 'social'
  },
  {
    name: 'Mirror',
    mainnetUrl: 'https://mirror.xyz/',
    testnetUrl: 'https://mirror.xyz/',
    icon: '✍️',
    description: 'Decentralized publishing',
    category: 'social'
  },

  // Tools & Infrastructure
  {
    name: 'Etherscan',
    mainnetUrl: 'https://etherscan.io/',
    testnetUrl: 'https://sepolia.etherscan.io/',
    icon: '🔍',
    description: 'Blockchain explorer',
    category: 'tools'
  },
  {
    name: 'Gnosis Safe',
    mainnetUrl: 'https://app.safe.global/',
    testnetUrl: 'https://app.safe.global/',
    icon: '🔐',
    description: 'Multi-sig wallet',
    category: 'tools'
  },
  {
    name: 'Snapshot',
    mainnetUrl: 'https://snapshot.org/',
    testnetUrl: 'https://demo.snapshot.org/',
    icon: '📸',
    description: 'Decentralized voting',
    category: 'tools'
  },
  {
    name: 'Zapper',
    mainnetUrl: 'https://zapper.xyz/',
    testnetUrl: 'https://zapper.xyz/',
    icon: '⚡',
    description: 'DeFi portfolio tracker',
    category: 'tools'
  }
];

interface Web3SitesProps {
  selectedChain: string;
  chainConfig: ChainConfig;
}

export default function Web3Sites({ selectedChain, chainConfig }: Web3SitesProps) {
  const isTestnet = chainConfig.isTestnet;
  const getUrl = (site: Web3Site) => {
    if (isTestnet && site.testnetUrl) {
      return site.testnetUrl;
    }
    return site.mainnetUrl;
  };

  const categories = ['defi', 'nft', 'gaming', 'social', 'tools'] as const;
  const categoryLabels = {
    defi: 'DeFi Protocols',
    nft: 'NFT & Marketplaces',
    gaming: 'Gaming & Metaverse',
    social: 'Social & Identity',
    tools: 'Tools & Infrastructure'
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ color: '#4a5568', margin: '0 0 1rem 0' }}>
        🌐 Popular Web3 Sites {isTestnet && <span style={{ color: '#48bb78', fontSize: '0.8em' }}>(Testnet Mode)</span>}
      </h2>
      
      {isTestnet && (
        <div style={{
          backgroundColor: '#f0fff4',
          border: '1px solid #9ae6b4',
          borderRadius: '6px',
          padding: '0.75rem',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          color: '#22543d'
        }}>
          ⚠️ Testnet versions will be used when available. Some sites may redirect to mainnet if they don't have a testnet version.
        </div>
      )}

      {categories.map(category => (
        <div key={category} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ 
            color: '#718096', 
            fontSize: '1rem', 
            marginBottom: '0.75rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.5rem'
          }}>
            {categoryLabels[category]}
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            {web3Sites
              .filter(site => site.category === category)
              .map(site => (
                <a
                  key={site.name}
                  href={getUrl(site)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: '#f7fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: '#2d3748',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#edf2f7';
                    e.currentTarget.style.borderColor = '#cbd5e0';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f7fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>{site.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{site.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#718096' }}>{site.description}</div>
                    {isTestnet && site.testnetUrl && site.testnetUrl !== site.mainnetUrl && (
                      <div style={{ fontSize: '0.7rem', color: '#48bb78', marginTop: '0.25rem' }}>
                        ✓ Testnet available
                      </div>
                    )}
                  </div>
                  <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>↗</span>
                </a>
              ))}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f7fafc',
        borderRadius: '6px',
        fontSize: '0.85rem',
        color: '#718096',
        textAlign: 'center'
      }}>
        💡 Tip: Connect your wallet first, then visit these sites. They'll detect your MyAgentWallet connection automatically.
      </div>
    </div>
  );
}