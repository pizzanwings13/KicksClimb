import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, ExternalLink, Loader2, Clock, AlertTriangle, Globe } from "lucide-react";
import { WalletType, walletOptions } from "../../lib/wagmi-config";
import { checkWalletAvailability } from "../../lib/stores/useWallet";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (walletType: WalletType) => Promise<void>;
  isConnecting: boolean;
  connectingWallet: WalletType | null;
  error: string | null;
}

export function WalletConnectModal({
  isOpen,
  onClose,
  onSelectWallet,
  isConnecting,
  connectingWallet,
  error,
}: WalletConnectModalProps) {
  const [walletStatus, setWalletStatus] = useState({ hasEthereum: false, isIframe: false, wallets: [] as string[] });

  useEffect(() => {
    if (isOpen) {
      const status = checkWalletAvailability();
      setWalletStatus(status);
    }
  }, [isOpen]);

  const handleWalletClick = async (walletType: WalletType) => {
    const wallet = walletOptions.find(w => w.id === walletType);
    if (wallet && !wallet.available) {
      return;
    }
    await onSelectWallet(walletType);
  };

  const handleOpenInNewWindow = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-4 bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 pointer-events-none" />

            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  disabled={isConnecting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                Choose your preferred wallet to connect to KICKS CLIMB on ApeChain
              </p>

              {!walletStatus.hasEthereum && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-amber-500/20 border border-amber-500/30 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-amber-300 text-sm font-medium mb-2">
                        No wallet detected
                      </p>
                      <p className="text-amber-200/70 text-xs mb-3">
                        Browser wallet extensions may not work in embedded views. Try opening this app in a new browser window where your wallet extension is installed.
                      </p>
                      <button
                        onClick={handleOpenInNewWindow}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 text-sm rounded-lg transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        Open in New Window
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {walletStatus.hasEthereum && walletStatus.wallets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg"
                >
                  <p className="text-green-400 text-sm">
                    Detected: {walletStatus.wallets.join(", ")}
                  </p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                  {error.includes("not detected") && (
                    <button
                      onClick={handleOpenInNewWindow}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded-lg transition-colors"
                    >
                      <Globe className="w-3 h-3" />
                      Try opening in new window
                    </button>
                  )}
                </motion.div>
              )}

              <div className="space-y-3">
                {walletOptions.map((wallet) => {
                  const isThisConnecting = isConnecting && connectingWallet === wallet.id;
                  const isDisabled = isConnecting || !wallet.available;
                  
                  return (
                    <motion.button
                      key={wallet.id}
                      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                      onClick={() => handleWalletClick(wallet.id)}
                      disabled={isDisabled}
                      className={`w-full p-4 flex items-center gap-4 rounded-xl border transition-all ${
                        isThisConnecting
                          ? "bg-amber-500/20 border-amber-500/50"
                          : !wallet.available
                          ? "bg-gray-800/30 border-gray-700/30 opacity-60 cursor-not-allowed"
                          : isConnecting
                          ? "bg-gray-800/50 border-gray-700/50 opacity-50 cursor-not-allowed"
                          : "bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-amber-500/30"
                      }`}
                    >
                      <div className="text-3xl">{wallet.icon}</div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{wallet.name}</h3>
                          {wallet.comingSoon && (
                            <span className="px-2 py-0.5 text-xs bg-purple-500/30 text-purple-300 rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{wallet.description}</p>
                      </div>
                      {isThisConnecting ? (
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                      ) : wallet.comingSoon ? (
                        <Clock className="w-5 h-5 text-purple-400" />
                      ) : (
                        <ExternalLink className="w-5 h-5 text-gray-500" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 text-center">
                  By connecting, you agree to the Terms of Service and acknowledge that you've read the Privacy Policy
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
