# 🚀 Pitch Perfect CCIP Contracts Deployment Guide

## 📋 Overview

This guide provides deployment instructions for the Pitch Perfect CCIP contracts using Remix IDE. The system consists of:

1. **PitchPerfectSender.sol** - Multi-chain sender (deploy on source chains)
2. **AvalancheRouterReceiver.sol** - Router receiver (deploy on Avalanche)

## 🌐 Network Configuration

> **📖 Complete Configuration**: See [NETWORK_CONFIG.md](./NETWORK_CONFIG.md) for full TypeScript configuration object with all network addresses and chain selectors.

### Key Networks Supported

- **Ethereum Sepolia** - Primary testnet with full CCIP support
- **Avalanche Fuji** - Avalanche testnet with Teleporter integration  
- **Base Sepolia** - Layer 2 testnet
- **Arbitrum Sepolia** - Arbitrum Layer 2 testnet
- **Optimism Sepolia** - Optimism Layer 2 testnet
- **Polygon Amoy** - Polygon testnet (replaces Mumbai)
- **BNB Chain Testnet** - Binance Smart Chain testnet

### Avalanche Teleporter Testnet

For testing C-Chain routing via Teleporter:

```typescript
// Fuji Testnet Teleporter Configuration
Teleporter Messenger: 0x253b2784c75e510dD0fF1EdE3BF63a2D8E4Ae3Ed
Teleporter Registry: 0x9EDc4cB4E781413b1b82CC3A92a60131FC111F58
C-Chain Blockchain ID: yH8D7ThNJkxmtkuv2jgBa4P1Rn3Qpr4pPr7QYNfcdoS6k6HWp

// Test Subnet Example
Echo Subnet Chain ID: 11111
Echo Subnet RPC: https://subnets.avax.network/echo/testnet/rpc
Echo Subnet Blockchain ID: 2bmZR9GjDXyqzqGwLTnGJ5EcqGVDHEXeSzNBHGWDnTa2LJDGZZ
```

## 🔧 Pre-Deployment Setup

### 1. Get Testnet Tokens
- **LINK tokens**: https://faucets.chain.link
- **USDC tokens**: https://faucet.circle.com  
- **CCIP-BnM tokens**: Call `drip(address)` function on CCIP-BnM contract
- **Native tokens**: Use network-specific faucets

### 2. Remix IDE Setup
1. Open [Remix IDE](https://remix.ethereum.org)
2. Create new workspace  
3. Install required dependencies:
   - `@openzeppelin/contracts`
   - `@chainlink/contracts-ccip`

## 📝 Deployment Instructions

### Step 1: Deploy PitchPerfectSender (Source Chains)

**Constructor Parameters**:
- `_ccipRouter`: CCIP Router address for the network
- `_linkToken`: LINK token address for the network

**Get addresses from**: [NETWORK_CONFIG.md](./NETWORK_CONFIG.md) → `networkConfigs` object

### Step 2: Deploy AvalancheRouterReceiver (Avalanche Only)

**Constructor Parameters**:
- `_ccipRouter`: CCIP Router on Avalanche  
- `_teleporterMessenger`: Teleporter Messenger address
- `_cChainBlockchainID`: C-Chain Blockchain ID

**Get addresses from**: [NETWORK_CONFIG.md](./NETWORK_CONFIG.md) → `avalancheTeleporterConfig` object

## ⚙️ Post-Deployment Configuration

### 1. Configure Authorized Senders (AvalancheRouterReceiver)
- Call `setAuthorizedSender(senderAddress, true)` for each sender contract
- Use `setSendersBatch(senders[], true)` for multiple senders

### 2. Token Approvals Required
- Users must approve tokens before sending: `IERC20(token).approve(sender, amount)`

### 3. Fee Estimation
- Use `quoteCrossChainTransfer()` to get transfer costs before execution

## 🎯 Contract Functions

### PitchPerfectSender Functions
- `sendToEOA()` - Send tokens to wallet on another EVM chain
- `sendToAvalancheCChain()` - Send tokens to Avalanche with C-Chain routing
- `sendToSolana()` - Send tokens to Solana wallet
- `quoteCrossChainTransfer()` - Get fee estimates

### AvalancheRouterReceiver Functions  
- `setAuthorizedSender()` - Authorize sender contracts
- `setSendersBatch()` - Batch authorize senders
- `isMessageProcessed()` - Check message status

## 🔒 Security Features

### Access Control
- **PitchPerfectSender**: OpenZeppelin Ownable for admin functions
- **AvalancheRouterReceiver**: Authorized senders only, message deduplication

### Emergency Functions
- `withdrawTokens()` - Recover stuck tokens (owner only)
- `withdrawNative()` - Recover native tokens (owner only)

### Message Validation
- **Replay Protection**: Messages marked as processed
- **Sender Authorization**: Only authorized senders can trigger routes
- **Amount Validation**: Token amounts validated before transfer

## 📊 Monitoring & Debugging

### Transaction Monitoring
- **CCIP Explorer**: https://ccip.chain.link/
- **Event Logs**: Monitor `PaymentSent` and `MessageReceived` events

### Common Issues
- **Insufficient Balance**: Ensure sufficient native tokens for fees
- **Token Approval**: Approve tokens before sending
- **Invalid Chain Selector**: Use correct selectors from NETWORK_CONFIG.md
- **Unauthorized Sender**: Ensure sender is authorized on receiver contract

## 🔗 References

- [CCIP Directory](https://docs.chain.link/ccip/directory/testnet) - Latest addresses
- [CCIP Explorer](https://ccip.chain.link/) - Transaction monitoring  
- [Chainlink Faucets](https://faucets.chain.link) - LINK tokens
- [Circle Faucet](https://faucet.circle.com) - USDC tokens
- [Avalanche Docs](https://docs.avax.network/) - Teleporter integration

## 🎤 Voice Integration

These contracts integrate with the Pitch Perfect voice system:

**Voice Commands** → **ElizaOS Plugin** → **Contract Calls**

Supported voice commands:
- "Send 100 USDC to Alice on Base"
- "Transfer tokens to Avalanche C-Chain"
- "Quote cross-chain transfer fees"

---

**⚠️ Testnet Only**: For testnet use only. Conduct security audits before mainnet deployment.