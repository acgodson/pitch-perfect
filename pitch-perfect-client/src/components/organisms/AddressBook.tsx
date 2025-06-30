"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Search,
  Copy,
  ExternalLink,
  User,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  addresses: {
    network: string;
    address: string;
    label?: string;
  }[];
  avatar?: string;
  isFavorite: boolean;
  lastUsed?: string;
}

interface AddressBookProps {
  onBack: () => void;
  className?: string;
}

export const AddressBook = ({ onBack, className }: AddressBookProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);

  const contacts: Contact[] = [
    {
      id: "1",
      name: "Mom",
      addresses: [
        {
          network: "ethereum",
          address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
          label: "Main Wallet",
        },
        {
          network: "solana",
          address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          label: "Solana Wallet",
        },
      ],
      isFavorite: true,
      lastUsed: "2 hours ago",
    },
    {
      id: "2",
      name: "Dad",
      addresses: [
        {
          network: "ethereum",
          address: "0x8ba1f109551bD432803012645Hac136c772c3c7",
          label: "Main Wallet",
        },
        {
          network: "solana",
          address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          label: "Solana Wallet",
        },
      ],
      isFavorite: true,
      lastUsed: "1 day ago",
    },
    {
      id: "3",
      name: "Alex",
      addresses: [
        {
          network: "ethereum",
          address: "0x1234567890123456789012345678901234567890",
          label: "Main Wallet",
        },
      ],
      isFavorite: false,
      lastUsed: "3 days ago",
    },
    {
      id: "4",
      name: "Uniswap V3",
      addresses: [
        {
          network: "ethereum",
          address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
          label: "Router",
        },
        {
          network: "polygon",
          address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
          label: "Router",
        },
      ],
      isFavorite: true,
      lastUsed: "1 week ago",
    },
  ];

  const filteredContacts = contacts.filter((contact) => {
    return contact.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

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
              <h2 className="text-xl font-semibold text-white">Address Book</h2>
              <p className="text-blue-200 text-sm">
                Manage your contacts and addresses
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowAddContact(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Plus size={16} className="mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search - Fixed */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      {/* Contacts List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="space-y-4">
            {filteredContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
              >
                {/* Contact Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {contact.name}
                        </div>
                        <div className="text-blue-200 text-sm">
                          {contact.addresses.length} address
                          {contact.addresses.length !== 1 ? "es" : ""}
                          {contact.lastUsed &&
                            ` • Last used ${contact.lastUsed}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {contact.isFavorite && (
                        <div className="text-yellow-400">⭐</div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div className="p-4 space-y-3">
                  {contact.addresses.map((address, addrIndex) => (
                    <div
                      key={addrIndex}
                      className="bg-white/5 rounded-lg p-3 border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-white text-sm font-medium">
                              {address.label}
                            </span>
                            {address.label === "Main Wallet" && (
                              <span className="text-blue-300 text-xs bg-blue-400/20 px-2 py-1 rounded">
                                EVM
                              </span>
                            )}
                            {address.label === "Solana Wallet" && (
                              <span className="text-purple-300 text-xs bg-purple-400/20 px-2 py-1 rounded">
                                SOL
                              </span>
                            )}
                          </div>
                          <div className="text-blue-200 text-sm font-mono">
                            {address.address.slice(0, 6)}...
                            {address.address.slice(-4)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(address.address)}
                            className="text-white/60 hover:text-white"
                          >
                            <Copy size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white"
                          >
                            <ExternalLink size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
