# 🌐 CCIP Plugin for Pitch Perfect

## Overview

The CCIP plugin enables voice-controlled cross-chain transactions using Chainlink CCIP. It transforms natural language commands into prepared cross-chain transactions and provides status tracking capabilities.

## Features

### 🎤 Voice Command Processing
- **Natural Language Parsing**: "Send 100 USDC to alice.eth on Base"
- **Context Management**: Maintains conversation state for incomplete requests
- **Missing Information Handling**: Prompts for missing transaction details

### 🔗 Cross-Chain Support
- **7 Testnet Networks**: Ethereum, Avalanche, Base, Arbitrum, Optimism, Polygon, BNB Chain
- **Multiple Tokens**: USDC, CCIP-BnM, CCIP-LnM, LINK
- **Fee Estimation**: Native token and LINK fee options
- **Transaction Preview**: Complete details before execution

### 📊 Status Tracking
- **Message ID Tracking**: Monitor transactions with CCIP message IDs
- **Real-time Status**: SUCCESS, PENDING, FAILED states
- **Explorer Integration**: Direct links to CCIP Explorer
- **Recent Transaction History**: Track user's recent cross-chain transfers

## Plugin Architecture

```
plugin-ccip/
├── index.ts                 # Plugin registration
├── types.ts                 # TypeScript interfaces
├── config.ts               # Network configurations  
├── actions/
│   ├── prepareCCIPTransaction.ts  # Transaction preparation
│   └── trackCCIPStatus.ts         # Status tracking
├── providers/
│   ├── transaction.ts       # Transaction context provider
│   └── status.ts           # Status tracking provider
└── utils/
    └── ccipSdk.ts          # CCIP SDK integration
```

## Installation

### 1. CCIP SDK Setup
```bash
# Clone the CCIP JavaScript SDK repository
git clone https://github.com/smartcontractkit/ccip-javascript-sdk.git

# Install and build the SDK
cd ccip-javascript-sdk
pnpm install
pnpm build
```

### 2. Dependencies
```bash
npm install @chainlink/contracts-ccip ethers viem
```

### 3. Workspace Reference
Update your package.json to use the local CCIP SDK:
```json
{
  "dependencies": {
    "@chainlink/ccip-js": "link:../../ccip-javascript-sdk/packages/ccip-js"
  }
}
```

### 2. Plugin Registration
```typescript
// In your agent configuration
import ccipPlugin from "./src/plugin-ccip";

const agent = {
  plugins: [
    voicePlugin,    // Required for voice identification
    ccipPlugin      // CCIP functionality
  ]
};
```

## Usage Examples

### Voice Commands

**Basic Transfer:**
> "Send 100 USDC to alice.eth on Base"

**Multi-step Conversation:**
> User: "Send 50 tokens to Bob"
> Agent: "Which token would you like to send? We support USDC, CCIP-BnM, CCIP-LnM, and LINK."
> User: "USDC"
> Agent: "Which network should I send to? Supported networks are Ethereum, Avalanche, Base, Arbitrum, Optimism, Polygon, and BNB Chain."
> User: "Avalanche"
> Agent: "I'll prepare a transfer of 50 USDC to Bob on Avalanche Fuji..."

**Status Checking:**
> "Check status of transaction 0x25d18c6adfc1f99514b40f9931a14ca08228cdbabfc5226c1e6a43ce7441595d"
> "What's the status of my recent transactions?"

## Configuration

### Network Setup
```typescript
// config.ts - All testnet configurations
export const networkConfigs = {
  [SupportedNetworks.ETHEREUM_SEPOLIA]: {
    chainSelector: "16015286601757825753",
    routerAddress: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    linkTokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    // ... other addresses
  },
  // ... other networks
};
```

### Contract Addresses
After deploying PitchPerfectSender contracts, update:
```typescript
// config.ts
export const pitchPerfectSenderAddresses = {
  [SupportedNetworks.ETHEREUM_SEPOLIA]: "0x...",
  [SupportedNetworks.AVALANCHE_FUJI]: "0x...",
  // ... other deployments
};
```

## Actions

### PREPARE_CCIP_TRANSACTION
- **Triggers**: Cross-chain keywords + identified user
- **Function**: Parses commands, validates info, prepares transaction
- **Output**: Transaction preview with fees and approval requirements

### TRACK_CCIP_STATUS  
- **Triggers**: Status keywords + message ID or recent query
- **Function**: Checks transaction status using CCIP SDK
- **Output**: Current status with explorer links

## Integration with Voice Plugin

The CCIP plugin works seamlessly with the voice plugin:

1. **Voice Identification** → User speaks command
2. **Voice Plugin** → Processes audio, identifies speaker
3. **CCIP Plugin** → Validates and prepares transaction
4. **Response** → Natural language confirmation with details

## CCIP SDK Integration

### Real Status Checking
```typescript
import { getTransactionStatus } from "./utils/ccipSdk";

const status = await getTransactionStatus(
  "0x25d18c6adfc1f99514b40f9931a14ca08228cdbabfc5226c1e6a43ce7441595d",
  SupportedNetworks.AVALANCHE_FUJI,
  SupportedNetworks.ETHEREUM_SEPOLIA
);
```

### Real Fee Estimation
```typescript
import { getFees, parseAmount } from "./utils/ccipSdk";

const fees = await getFees({
  sourceNetwork: SupportedNetworks.ETHEREUM_SEPOLIA,
  destinationNetwork: SupportedNetworks.AVALANCHE_FUJI,
  tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  amount: parseAmount("100", 6), // 100 USDC
  destinationAccount: "0x..." as Address
});
```

### Real Token Transfer
```typescript
import { transferTokens } from "./utils/ccipSdk";

const result = await transferTokens({
  walletClient,
  routerAddress: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
  tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  amount: parseAmount("100", 6),
  destinationAccount: "0x..." as Address,
  destinationChainSelector: "14767482510784806043"
});

console.log("Transaction Hash:", result.txHash);
console.log("Message ID:", result.messageId);
```

## Security Features

### Authentication
- **Required Voice ID**: Only identified users can initiate transactions
- **Transaction Preview**: Always show full details before execution
- **Approval Warnings**: Clear indication of required token approvals

### Validation
- **Address Validation**: Checks recipient address format
- **Network Support**: Validates supported networks only
- **Amount Parsing**: Proper decimal handling for different tokens

## Development Status

### ✅ Implemented
- Plugin architecture and registration
- Natural language command parsing
- Network configuration management
- Transaction preparation logic
- Status tracking with message IDs
- **Real CCIP SDK integration** ✨
- **Real fee estimation using CCIP SDK** ✨
- **Real transaction status checking** ✨
- **Token support validation** ✨
- **Router approval functionality** ✨

### 🚧 TODO
- Frontend wallet integration for transaction execution
- Transaction history persistence in database
- Enhanced error handling and retry logic
- Multi-signature wallet support
- Advanced routing strategies

## Testing

### Real CCIP SDK Functions
All core functions now use the real CCIP SDK:
- ✅ Real transaction status checking with message IDs
- ✅ Real fee estimation for all supported networks
- ✅ Real token support validation
- ✅ Real allowance checking
- ✅ Router approval functionality

### Voice Integration Test
```bash
# Test voice command processing
"Hey Beca, listen up"
"Send 100 USDC to alice.eth on Base"
# Should trigger CCIP transaction preparation
```

## Future Enhancements

1. **Real Transaction Execution**: Integration with wallet providers
2. **Gas Optimization**: Dynamic gas limit calculation
3. **Multi-token Transfers**: Support for batched transfers  
4. **Advanced Routing**: Avalanche Teleporter integration
5. **Price Feeds**: Real-time token pricing
6. **Transaction Scheduling**: Delayed execution capabilities

---

**Note**: This plugin requires the voice plugin for user identification. Ensure proper voice recognition setup before using CCIP functionality.