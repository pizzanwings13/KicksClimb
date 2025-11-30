import { useState } from "react";
import { useWallet } from "@/lib/stores/useWallet";
import { Settings, X, Coins, Building2, Eye, Shield } from "lucide-react";

interface TokenConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TokenConfig({ isOpen, onClose }: TokenConfigProps) {
  const { kicksTokenAddress, houseWalletAddress, vaultContractAddress } = useWallet();

  if (!isOpen) return null;

  const formatAddress = (address: string | null) => {
    if (!address) return "Not configured";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
      <div className="bg-gradient-to-b from-purple-900/90 to-indigo-900/90 rounded-2xl p-5 max-w-sm w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            Token Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="bg-black/30 rounded-xl p-3 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-semibold text-sm">KICKS Token</span>
            </div>
            <div className="bg-black/50 rounded-lg px-3 py-2 border border-yellow-500/20">
              <span className="text-yellow-300 font-mono text-sm">
                {formatAddress(kicksTokenAddress)}
              </span>
            </div>
            {kicksTokenAddress && (
              <p className="text-gray-500 text-xs mt-1.5 break-all font-mono">
                {kicksTokenAddress}
              </p>
            )}
          </div>

          <div className="bg-black/30 rounded-xl p-3 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span className="text-white font-semibold text-sm">House Wallet</span>
            </div>
            <div className="bg-black/50 rounded-lg px-3 py-2 border border-purple-500/20">
              <span className="text-purple-300 font-mono text-sm">
                {formatAddress(houseWalletAddress)}
              </span>
            </div>
            {houseWalletAddress && (
              <p className="text-gray-500 text-xs mt-1.5 break-all font-mono">
                {houseWalletAddress}
              </p>
            )}
          </div>

          <div className="bg-black/30 rounded-xl p-3 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-white font-semibold text-sm">Claim Vault Contract</span>
            </div>
            <div className="bg-black/50 rounded-lg px-3 py-2 border border-green-500/20">
              <span className="text-green-300 font-mono text-sm">
                {formatAddress(vaultContractAddress)}
              </span>
            </div>
            {vaultContractAddress && (
              <p className="text-gray-500 text-xs mt-1.5 break-all font-mono">
                {vaultContractAddress}
              </p>
            )}
          </div>

          <div className="bg-blue-900/30 rounded-xl p-3 border border-blue-500/30">
            <h3 className="text-blue-300 font-semibold text-sm mb-1.5">ApeChain Network</h3>
            <div className="text-xs text-gray-400 space-y-0.5">
              <p>Chain ID: 33139</p>
              <p>Explorer: apechain.calderaexplorer.xyz</p>
            </div>
          </div>

          <p className="text-center text-gray-500 text-xs pt-2">
            Token configuration is managed by the game operator
          </p>
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
        title="Token Settings"
      >
        <Settings className="w-5 h-5 text-purple-400" />
      </button>
      <TokenConfig isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
