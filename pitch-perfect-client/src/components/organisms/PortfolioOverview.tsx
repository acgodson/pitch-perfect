"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Filter,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Token {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  usdValue: number;
  change24h: number;
  chain: string;
  chainId: number;
  logo?: string;
}

interface Network {
  id: string;
  name: string;
  chainId: number;
  logo: string;
  isSupported: boolean;
}

interface PortfolioOverviewProps {
  onBack: () => void;
  className?: string;
}

export const PortfolioOverview = ({
  onBack,
  className,
}: PortfolioOverviewProps) => {
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [showNetworkFilter, setShowNetworkFilter] = useState(false);

  // Mock data - in real app this would come from Chainlink CCIP and wallet APIs
  const networks: Network[] = [
    {
      id: "ethereum",
      name: "Ethereum",
      chainId: 1,
      logo: "🔵",
      isSupported: true,
    },
    {
      id: "polygon",
      name: "Polygon",
      chainId: 137,
      logo: "🟣",
      isSupported: true,
    },
    {
      id: "bsc",
      name: "BNB Chain",
      chainId: 56,
      logo: "🟡",
      isSupported: true,
    },
    {
      id: "avalanche",
      name: "Avalanche",
      chainId: 43114,
      logo: "🔴",
      isSupported: true,
    },
    {
      id: "arbitrum",
      name: "Arbitrum",
      chainId: 42161,
      logo: "🔵",
      isSupported: true,
    },
    {
      id: "optimism",
      name: "Optimism",
      chainId: 10,
      logo: "🔴",
      isSupported: true,
    },
    {
      id: "fantom",
      name: "Fantom",
      chainId: 250,
      logo: "🔵",
      isSupported: true,
    },
    { id: "base", name: "Base", chainId: 8453, logo: "🔵", isSupported: true },
  ];

  const tokens: Token[] = [
    {
      id: "1",
      symbol: "ETH",
      name: "Ethereum",
      balance: "2.45",
      usdValue: 4890.5,
      change24h: 2.3,
      chain: "ethereum",
      chainId: 1,
    },
    {
      id: "2",
      symbol: "USDC",
      name: "USD Coin",
      balance: "1500.00",
      usdValue: 1500.0,
      change24h: 0.1,
      chain: "ethereum",
      chainId: 1,
    },
    {
      id: "3",
      symbol: "MATIC",
      name: "Polygon",
      balance: "5000.00",
      usdValue: 3250.0,
      change24h: -1.2,
      chain: "polygon",
      chainId: 137,
    },
    {
      id: "4",
      symbol: "BNB",
      name: "BNB",
      balance: "3.2",
      usdValue: 960.0,
      change24h: 1.8,
      chain: "bsc",
      chainId: 56,
    },
    {
      id: "5",
      symbol: "AVAX",
      name: "Avalanche",
      balance: "25.0",
      usdValue: 875.0,
      change24h: -0.5,
      chain: "avalanche",
      chainId: 43114,
    },
    {
      id: "6",
      symbol: "LINK",
      name: "Chainlink",
      balance: "100.0",
      usdValue: 1500.0,
      change24h: 3.2,
      chain: "ethereum",
      chainId: 1,
    },
  ];

  const filteredTokens =
    selectedNetwork === "all"
      ? tokens
      : tokens.filter((token) => token.chain === selectedNetwork);

  const totalValue = filteredTokens.reduce(
    (sum, token) => sum + token.usdValue,
    0,
  );
  const totalChange24h =
    filteredTokens.reduce((sum, token) => sum + token.change24h, 0) /
    filteredTokens.length;

  const selectedNetworkData = networks.find((n) => n.id === selectedNetwork);

  return (
    <div
      className={cn(
        "h-full bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white/70 hover:text-white"
            >
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-white">Portfolio</h2>
              <p className="text-blue-200 text-sm">Your multi-chain assets</p>
            </div>
          </div>

          {/* Network Filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNetworkFilter(!showNetworkFilter)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Filter size={14} className="mr-2" />
              {selectedNetwork === "all"
                ? "All Networks"
                : selectedNetworkData?.name}
            </Button>

            {/* Network Dropdown */}
            {showNetworkFilter && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 w-64 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-lg shadow-2xl z-50"
              >
                <div className="p-2">
                  <div className="text-xs text-white/60 px-3 py-2">
                    Chainlink CCIP Supported Networks
                  </div>
                  {networks.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => {
                        setSelectedNetwork(network.id);
                        setShowNetworkFilter(false);
                      }}
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-all",
                        selectedNetwork === network.id
                          ? "bg-emerald-400/20 text-emerald-400"
                          : "text-white hover:bg-white/10",
                      )}
                    >
                      <span className="text-lg">{network.logo}</span>
                      <span className="flex-1 text-left">{network.name}</span>
                      {network.isSupported && (
                        <Link size={12} className="text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Portfolio Summary - Fixed */}
        <div className="flex-shrink-0 p-6 border-b border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-sm">Total Value</div>
              <div className="text-2xl font-bold text-white">
                ${totalValue.toLocaleString()}
              </div>
              <div
                className={cn(
                  "flex items-center text-sm mt-1",
                  totalChange24h >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {totalChange24h >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span className="ml-1">
                  {Math.abs(totalChange24h).toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-sm">Networks</div>
              <div className="text-2xl font-bold text-white">
                {networks.filter((n) => n.isSupported).length}
              </div>
              <div className="text-sm text-emerald-400 mt-1">CCIP Ready</div>
            </div>
          </div>
        </div>

        {/* Chainlink CCIP Banner - Fixed */}
        <div className="flex-shrink-0 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Link size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-medium">
                  Cross-Chain Transfers
                </div>
                <div className="text-blue-200 text-sm">
                  Powered by Chainlink CCIP
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-300 hover:text-blue-200"
            >
              <ExternalLink size={14} />
            </Button>
          </div>
        </div>

        {/* Token List - Scrollable */}
        <div className="p-6">
          <div className="space-y-3">
            {filteredTokens.map((token, index) => (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {token.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{token.name}</div>
                      <div className="text-blue-200 text-sm">
                        {token.symbol}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-white font-medium">
                      {token.balance}
                    </div>
                    <div className="text-blue-200 text-sm">
                      ${token.usdValue.toLocaleString()}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex items-center text-sm",
                      token.change24h >= 0
                        ? "text-emerald-400"
                        : "text-red-400",
                    )}
                  >
                    {token.change24h >= 0 ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    <span className="ml-1">
                      {Math.abs(token.change24h).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Chain indicator */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-white/60">Network:</span>
                    <span className="text-xs text-blue-300">
                      {networks.find((n) => n.id === token.chain)?.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Transfer
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
