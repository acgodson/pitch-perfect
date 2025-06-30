import { SupportedNetworks, NetworkConfig } from './types';

export const networkConfigs: { [key in SupportedNetworks]: NetworkConfig } = {
  [SupportedNetworks.ETHEREUM_SEPOLIA]: {
    description: "Ethereum Sepolia Testnet",
    chainSelector: "16015286601757825753",
    rpc: "https://eth-sepolia.g.alchemy.com/v2/demo",
    routerAddress: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    linkTokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    wrappedNativeAddress: "0x097D90c9d3E0B50Ca60e1ae45F6A81010f9FB534",
    ccipBnMAddress: "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05",
    ccipLnMAddress: "0x466D489b6d36E7E3b824ef491C225F5830E81cC1",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  },
  
  [SupportedNetworks.AVALANCHE_FUJI]: {
    description: "Avalanche Fuji Testnet", 
    chainSelector: "14767482510784806043",
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
    routerAddress: "0xF694E193200268f9a4868e4Aa017A0118C9a8177",
    linkTokenAddress: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    ccipBnMAddress: "0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4",
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65"
  },

  [SupportedNetworks.BASE_SEPOLIA]: {
    description: "Base Sepolia Testnet",
    chainSelector: "10344971235874465080",
    rpc: "https://sepolia.base.org",
    routerAddress: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
    linkTokenAddress: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
    ccipBnMAddress: "0x88A2d74F47a237a62e7A51cdDa67270CE381555e",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },

  [SupportedNetworks.ARBITRUM_SEPOLIA]: {
    description: "Arbitrum Sepolia Testnet",
    chainSelector: "3478487238524512106",
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    routerAddress: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
    linkTokenAddress: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
    ccipBnMAddress: "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  },

  [SupportedNetworks.OPTIMISM_SEPOLIA]: {
    description: "Optimism Sepolia Testnet",
    chainSelector: "5224473277236331295",
    rpc: "https://sepolia.optimism.io",
    routerAddress: "0x114A20A10b43D4115e5aeef7345a1A71d2a60C57",
    linkTokenAddress: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
    ccipBnMAddress: "0x8aF4204e30565DF93352fE8E1De78925F6664dA7",
    ccipLnMAddress: "0x044a6B4b561af69D2319A2f4be5Ec327a6975D0a",
    usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7"
  },

  [SupportedNetworks.POLYGON_AMOY]: {
    description: "Polygon Amoy Testnet",
    chainSelector: "16281711391670634445",
    rpc: "https://rpc-amoy.polygon.technology",
    routerAddress: "0x9C32fCB86BF0f4a1A8921a9Fe46de3198bb884B2",
    linkTokenAddress: "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904",
    ccipBnMAddress: "0xcab0EF91Bee323d1A617c0a027eE753aFd6997E4",
    usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"
  },

  [SupportedNetworks.BNB_CHAIN_TESTNET]: {
    description: "BNB Chain Testnet",
    chainSelector: "13264668187771770619",
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545",
    routerAddress: "0xE1053aE1857476f36A3C62580FF9b016E8EE8F6f",
    linkTokenAddress: "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
    ccipBnMAddress: "0xbFA2ACd33ED6EEc0ed3Cc06bF1ac38d22b36B9e9"
  }
};

export const avalancheTeleporterConfig = {
  messengerAddress: "0x253b2784c75e510dD0fF1EdE3BF63a2D8E4Ae3Ed",
  registryAddress: "0x9EDc4cB4E781413b1b82CC3A92a60131FC111F58",
  cChainBlockchainID: "yH8D7ThNJkxmtkuv2jgBa4P1Rn3Qpr4pPr7QYNfcdoS6k6HWp"
};

export const commonTokens = {
  USDC: {
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin"
  },
  CCIP_BNM: {
    symbol: "CCIP-BnM",
    decimals: 18,
    name: "CCIP Burn & Mint Token"
  },
  CCIP_LNM: {
    symbol: "CCIP-LnM", 
    decimals: 18,
    name: "CCIP Lock & Mint Token"
  },
  LINK: {
    symbol: "LINK",
    decimals: 18,
    name: "Chainlink Token"
  }
};

export const networkAliases: { [key: string]: SupportedNetworks } = {
  // Ethereum aliases
  "ethereum": SupportedNetworks.ETHEREUM_SEPOLIA,
  "eth": SupportedNetworks.ETHEREUM_SEPOLIA,
  "sepolia": SupportedNetworks.ETHEREUM_SEPOLIA,
  
  // Avalanche aliases
  "avalanche": SupportedNetworks.AVALANCHE_FUJI,
  "avax": SupportedNetworks.AVALANCHE_FUJI,
  "fuji": SupportedNetworks.AVALANCHE_FUJI,
  
  // Base aliases
  "base": SupportedNetworks.BASE_SEPOLIA,
  
  // Arbitrum aliases
  "arbitrum": SupportedNetworks.ARBITRUM_SEPOLIA,
  "arb": SupportedNetworks.ARBITRUM_SEPOLIA,
  
  // Optimism aliases
  "optimism": SupportedNetworks.OPTIMISM_SEPOLIA,
  "op": SupportedNetworks.OPTIMISM_SEPOLIA,
  
  // Polygon aliases
  "polygon": SupportedNetworks.POLYGON_AMOY,
  "matic": SupportedNetworks.POLYGON_AMOY,
  "amoy": SupportedNetworks.POLYGON_AMOY,
  
  // BNB aliases
  "bnb": SupportedNetworks.BNB_CHAIN_TESTNET,
  "bsc": SupportedNetworks.BNB_CHAIN_TESTNET,
  "binance": SupportedNetworks.BNB_CHAIN_TESTNET
};

export const pitchPerfectSenderAddresses: { [key in SupportedNetworks]?: string } = {
  // Populated with latest production contract deployment
  // [SupportedNetworks.ETHEREUM_SEPOLIA]: "0x...",
  // [SupportedNetworks.AVALANCHE_FUJI]: "0x...",
  // [SupportedNetworks.BASE_SEPOLIA]: "0x...",
};