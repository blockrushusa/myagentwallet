export interface ChainConfig {
  id: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  logoUrl?: string;
  isTestnet: boolean;
  category: 'mainnet' | 'testnet' | 'layer2' | 'sidechain';
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  // Ethereum Mainnet
  ethereum: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    isTestnet: false,
    category: 'mainnet'
  },

  // Ethereum Testnets
  sepolia: {
    id: 11155111,
    name: 'Sepolia Testnet',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    isTestnet: true,
    category: 'testnet'
  },

  goerli: {
    id: 5,
    name: 'Goerli Testnet',
    symbol: 'ETH',
    rpcUrl: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorerUrl: 'https://goerli.etherscan.io',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    isTestnet: true,
    category: 'testnet'
  },

  // Layer 2 Solutions
  polygon: {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    logoUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
    isTestnet: false,
    category: 'layer2'
  },

  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    logoUrl: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
    isTestnet: false,
    category: 'layer2'
  },

  optimism: {
    id: 10,
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    logoUrl: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
    isTestnet: false,
    category: 'layer2'
  },

  base: {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    logoUrl: 'https://github.com/base-org/brand-kit/blob/main/logo/in-product/Base_Network_Logo.svg',
    isTestnet: false,
    category: 'layer2'
  },

  // BSC
  bsc: {
    id: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorerUrl: 'https://bscscan.com',
    logoUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg',
    isTestnet: false,
    category: 'sidechain'
  },

  // Avalanche
  avalanche: {
    id: 43114,
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    logoUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg',
    isTestnet: false,
    category: 'layer2'
  },

  // Fantom
  fantom: {
    id: 250,
    name: 'Fantom Opera',
    symbol: 'FTM',
    rpcUrl: 'https://rpc.ftm.tools',
    explorerUrl: 'https://ftmscan.com',
    logoUrl: 'https://cryptologos.cc/logos/fantom-ftm-logo.svg',
    isTestnet: false,
    category: 'sidechain'
  },

  // Monad (New EVM Chain)
  monad: {
    id: 5555, // Placeholder chain ID - update when mainnet launches
    name: 'Monad',
    symbol: 'MON',
    rpcUrl: 'https://rpc.monad.xyz', // Placeholder RPC - update with actual
    explorerUrl: 'https://explorer.monad.xyz', // Placeholder explorer - update with actual
    logoUrl: 'https://pbs.twimg.com/profile_images/1646645243683016705/KqxKuPR4_400x400.jpg',
    isTestnet: false,
    category: 'mainnet'
  },

  // Monad Testnet
  'monad-testnet': {
    id: 5556, // Placeholder testnet chain ID
    name: 'Monad Testnet',
    symbol: 'MON',
    rpcUrl: 'https://testnet-rpc.monad.xyz', // Placeholder testnet RPC
    explorerUrl: 'https://testnet-explorer.monad.xyz', // Placeholder testnet explorer
    logoUrl: 'https://pbs.twimg.com/profile_images/1646645243683016705/KqxKuPR4_400x400.jpg',
    isTestnet: true,
    category: 'testnet'
  },

  // Linea
  linea: {
    id: 59144,
    name: 'Linea',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.linea.build',
    explorerUrl: 'https://lineascan.build',
    logoUrl: 'https://consensys.io/wp-content/uploads/2023/07/linea-logo.svg',
    isTestnet: false,
    category: 'layer2'
  },

  // zkSync Era
  zksync: {
    id: 324,
    name: 'zkSync Era',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.era.zksync.io',
    explorerUrl: 'https://explorer.zksync.io',
    logoUrl: 'https://zksync.io/favicon/apple-touch-icon.png',
    isTestnet: false,
    category: 'layer2'
  },

  // Mantle
  mantle: {
    id: 5000,
    name: 'Mantle',
    symbol: 'MNT',
    rpcUrl: 'https://rpc.mantle.xyz',
    explorerUrl: 'https://explorer.mantle.xyz',
    logoUrl: 'https://assets.coingecko.com/coins/images/30980/large/token-logo.png',
    isTestnet: false,
    category: 'layer2'
  }
};

export const getChainById = (chainId: number): ChainConfig | undefined => {
  return Object.values(SUPPORTED_CHAINS).find(chain => chain.id === chainId);
};

export const getChainByName = (name: string): ChainConfig | undefined => {
  return SUPPORTED_CHAINS[name.toLowerCase()] || 
         Object.values(SUPPORTED_CHAINS).find(chain => 
           chain.name.toLowerCase() === name.toLowerCase()
         );
};

export const getChainsByCategory = (category: ChainConfig['category']): ChainConfig[] => {
  return Object.values(SUPPORTED_CHAINS).filter(chain => chain.category === category);
};

export const getMainnetChains = (): ChainConfig[] => {
  return Object.values(SUPPORTED_CHAINS).filter(chain => !chain.isTestnet);
};

export const getTestnetChains = (): ChainConfig[] => {
  return Object.values(SUPPORTED_CHAINS).filter(chain => chain.isTestnet);
};

// Default chains for different use cases
export const DEFAULT_CHAINS = {
  POPULAR: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'],
  TESTNETS: ['sepolia', 'goerli'],
  LAYER2: ['polygon', 'arbitrum', 'optimism', 'base', 'linea', 'zksync'],
  NEW_CHAINS: ['monad', 'mantle', 'linea']
};

export const CHAIN_CATEGORIES = [
  { key: 'mainnet', label: 'Mainnets', icon: '🏗️' },
  { key: 'layer2', label: 'Layer 2', icon: '⚡' },
  { key: 'sidechain', label: 'Sidechains', icon: '🌉' },
  { key: 'testnet', label: 'Testnets', icon: '🧪' }
] as const;