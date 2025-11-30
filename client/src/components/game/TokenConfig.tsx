import { useState, useEffect } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, X, Coins, Building2, Check } from "lucide-react";

interface TokenConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TokenConfig({ isOpen, onClose }: TokenConfigProps) {
  const { setTokenAddresses, kicksTokenAddress, houseWalletAddress, refreshBalance, isConnected } = useWallet();
  const [kicksAddress, setKicksAddress] = useState(kicksTokenAddress || "");
  const [houseAddress, setHouseAddress] = useState(houseWalletAddress || "");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setKicksAddress(kicksTokenAddress || "");
    setHouseAddress(houseWalletAddress || "");
  }, [kicksTokenAddress, houseWalletAddress]);

  if (!isOpen) return null;

  const handleSave = async () => {
    localStorage.setItem('kicksTokenAddress', kicksAddress);
    localStorage.setItem('houseWalletAddress', houseAddress);
    setTokenAddresses(kicksAddress, houseAddress);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    
    if (isConnected) {
      await refreshBalance();
    }
  };

  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="bg-gradient-to-b from-purple-900/90 to-indigo-900/90 rounded-2xl p-6 max-w-md w-full mx-4 border border-purple-500/30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            Token Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-black/30 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-semibold">KICKS Token Address</span>
            </div>
            <Input
              value={kicksAddress}
              onChange={(e) => setKicksAddress(e.target.value)}
              placeholder="0x..."
              className="bg-black/50 border-yellow-500/30 text-white font-mono text-sm"
            />
            {kicksAddress && !isValidAddress(kicksAddress) && (
              <p className="text-red-400 text-xs mt-1">Invalid address format</p>
            )}
            <p className="text-gray-500 text-xs mt-2">
              Enter the contract address for KICKS token on ApeChain
            </p>
          </div>

          <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">House Wallet Address</span>
            </div>
            <Input
              value={houseAddress}
              onChange={(e) => setHouseAddress(e.target.value)}
              placeholder="0x..."
              className="bg-black/50 border-purple-500/30 text-white font-mono text-sm"
            />
            {houseAddress && !isValidAddress(houseAddress) && (
              <p className="text-red-400 text-xs mt-1">Invalid address format</p>
            )}
            <p className="text-gray-500 text-xs mt-2">
              Wallet that receives lost bets and sends winnings
            </p>
          </div>

          <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-500/30">
            <h3 className="text-blue-300 font-semibold mb-2">ApeChain Network</h3>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Chain ID: 33139 (0x8173)</p>
              <p>RPC: https://apechain.calderachain.xyz/http</p>
              <p>Explorer: https://apechain.calderaexplorer.xyz</p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!isValidAddress(kicksAddress) || !isValidAddress(houseAddress)}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            {isSaved ? (
              <>
                <Check className="w-5 h-5" />
                Saved!
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TokenConfigButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full border border-purple-500/30 transition-all z-50"
        title="Token Configuration"
      >
        <Settings className="w-6 h-6 text-purple-400" />
      </button>
      <TokenConfig isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
