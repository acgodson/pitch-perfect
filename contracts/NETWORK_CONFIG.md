# 🌐 CCIP Network Configuration

> **Source**: Extracted from Chainlink CCIP Documentation  
> **Last Updated**: December 2024  
> **Reference**: [CCIP Directory Testnet](https://docs.chain.link/ccip/directory/testnet)

## Network Configuration Object

```typescript
export enum SupportedNetworks {
  ETHEREUM_SEPOLIA = "ethereumSepolia",
  AVALANCHE_FUJI = "avalancheFuji",
  BASE_SEPOLIA = "baseSepolia", 
  ARBITRUM_SEPOLIA = "arbitrumSepolia",
  OPTIMISM_SEPOLIA = "optimismSepolia",
  POLYGON_AMOY = "polygonAmoy",
  BNB_CHAIN_TESTNET = "bnbChainTestnet"
}

export interface NetworkConfig {
  description: string;
  chainSelector: string;
  rpc?: string;
  routerAddress: string;
  linkTokenAddress: string;
  wrappedNativeAddress?: string;
  ccipBnMAddress: string;
  ccipLnMAddress?: string;
  usdcAddress?: string;
}

export const networkConfigs: { [key in SupportedNetworks]: NetworkConfig } = {
  [SupportedNetworks.ETHEREUM_SEPOLIA]: {
    description: "Ethereum Sepolia Testnet",
    chainSelector: "16015286601757825753",
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
    routerAddress: "0xF694E193200268f9a4868e4Aa017A0118C9a8177",
    linkTokenAddress: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    ccipBnMAddress: "0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4",
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65"
  },

  [SupportedNetworks.BASE_SEPOLIA]: {
    description: "Base Sepolia Testnet",
    chainSelector: "10344971235874465080", // Reference CCIP Directory
    routerAddress: "", // Reference CCIP Directory
    linkTokenAddress: "", // Reference CCIP Directory  
    ccipBnMAddress: "0x88A2d74F47a237a62e7A51cdDa67270CE381555e",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },

  [SupportedNetworks.ARBITRUM_SEPOLIA]: {
    description: "Arbitrum Sepolia Testnet",
    chainSelector: "3478487238524512106", // Reference CCIP Directory
    routerAddress: "", // Reference CCIP Directory
    linkTokenAddress: "", // Reference CCIP Directory
    ccipBnMAddress: "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  },

  [SupportedNetworks.OPTIMISM_SEPOLIA]: {
    description: "Optimism Sepolia Testnet",
    chainSelector: "5224473277236331295", // Reference CCIP Directory
    routerAddress: "", // Reference CCIP Directory
    linkTokenAddress: "", // Reference CCIP Directory
    ccipBnMAddress: "0x8aF4204e30565DF93352fE8E1De78925F6664dA7",
    ccipLnMAddress: "0x044a6B4b561af69D2319A2f4be5Ec327a6975D0a",
    usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7"
  },

  [SupportedNetworks.POLYGON_AMOY]: {
    description: "Polygon Amoy Testnet",
    chainSelector: "16281711391670634445", // Reference CCIP Directory
    routerAddress: "", // Reference CCIP Directory  
    linkTokenAddress: "", // Reference CCIP Directory
    ccipBnMAddress: "0xcab0EF91Bee323d1A617c0a027eE753aFd6997E4",
    usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"
  },

  [SupportedNetworks.BNB_CHAIN_TESTNET]: {
    description: "BNB Chain Testnet",
    chainSelector: "13264668187771770619", // Reference CCIP Directory
    routerAddress: "", // Reference CCIP Directory
    linkTokenAddress: "", // Reference CCIP Directory
    ccipBnMAddress: "0xbFA2ACd33ED6EEc0ed3Cc06bF1ac38d22b36B9e9"
  }
};
```

## Avalanche Teleporter Configuration

```typescript
export interface TeleporterConfig {
  messengerAddress: string;
  registryAddress: string;
  cChainBlockchainID: string;
  testSubnets: SubnetConfig[];
}

export interface SubnetConfig {
  name: string;
  chainId: string;
  rpcUrl: string;
  blockchainId: string;
}

export const avalancheTeleporterConfig: TeleporterConfig = {
  messengerAddress: "0x253b2784c75e510dD0fF1EdE3BF63a2D8E4Ae3Ed", // Fuji Testnet
  registryAddress: "0x9EDc4cB4E781413b1b82CC3A92a60131FC111F58",
  cChainBlockchainID: "yH8D7ThNJkxmtkuv2jgBa4P1Rn3Qpr4pPr7QYNfcdoS6k6HWp", // Fuji C-Chain
  testSubnets: [
    {
      name: "Echo Subnet",
      chainId: "11111", // Example testnet subnet
      rpcUrl: "https://subnets.avax.network/echo/testnet/rpc",
      blockchainId: "2bmZR9GjDXyqzqGwLTnGJ5EcqGVDHEXeSzNBHGWDnTa2LJDGZZ"
    }
  ]
};
```

## Faucet Addresses

```typescript
export const faucetConfig = {
  chainlinkFaucets: "https://faucets.chain.link",
  circleFaucet: "https://faucet.circle.com",
  ccipTestTokens: {
    // Call drip(address) function on these contracts
    ccipBnMFaucet: "Use contract address from networkConfigs",
    ccipLnMFaucet: "Only available on Ethereum Sepolia"
  }
};
```

## Network Status

| Network | Lanes | Tokens | Status |
|---------|-------|---------|---------|
| Ethereum Sepolia | 40 | 4 | ✅ Active |
| Avalanche Fuji | 11 | 3 | ✅ Active |
| Base Sepolia | 17 | 3 | ✅ Active |
| Arbitrum Sepolia | 15 | 3 | ✅ Active |
| Optimism Sepolia | 15 | 4 | ✅ Active |
| Polygon Amoy | 15 | 3 | ✅ Active |
| BNB Chain Testnet | 13 | 2 | ✅ Active |

## Important Notes


🔄 **Dynamic Updates**: Network configurations change frequently. Always verify against the official CCIP Directory before deployment.

📋 **Chain Selectors**: These are unique 64-bit integers used by CCIP to identify destination chains. They are different from standard chain IDs.

## Usage Example

```typescript
// Get network config for deployment
const sepoliaConfig = networkConfigs[SupportedNetworks.ETHEREUM_SEPOLIA];
const fujiConfig = networkConfigs[SupportedNetworks.AVALANCHE_FUJI];

// Deploy sender contract
const senderArgs = [
  sepoliaConfig.routerAddress,
  sepoliaConfig.linkTokenAddress
];

// Deploy receiver contract  
const receiverArgs = [
  fujiConfig.routerAddress,
  avalancheTeleporterConfig.messengerAddress,
  avalancheTeleporterConfig.cChainBlockchainID
];
```

---

**📖 References**:
- [CCIP Directory](https://docs.chain.link/ccip/directory/testnet)
- [Avalanche Teleporter Docs](https://docs.avax.network/build/cross-chain/teleporter)
- [CCIP Explorer](https://ccip.chain.link/)