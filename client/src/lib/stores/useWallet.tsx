import { create } from "zustand";
import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";
import { WalletType } from "../wagmi-config";

const APECHAIN_CONFIG = {
  chainId: "0x8173",
  chainName: "ApeChain",
  nativeCurrency: {
    name: "ApeCoin",
    symbol: "APE",
    decimals: 18,
  },
  rpcUrls: ["https://apechain.calderachain.xyz/http"],
  blockExplorerUrls: ["https://apechain.calderaexplorer.xyz/"],
};

const KICKS_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  connectingWallet: WalletType | null;
  connectedWalletType: WalletType | null;
  walletAddress: string | null;
  kicksBalance: string;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  kicksContract: ethers.Contract | null;
  error: string | null;
  kicksTokenAddress: string | null;
  houseWalletAddress: string | null;
  showWalletModal: boolean;
  glyphProvider: any | null;
  
  connect: (walletType: WalletType) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  setTokenAddresses: (kicks: string, house: string) => void;
  sendKicksToHouse: (amount: string) => Promise<string | null>;
  requestKicksFromHouse: (amount: string) => Promise<boolean>;
  setShowWalletModal: (show: boolean) => void;
  setGlyphProvider: (provider: any) => void;
  connectWithProvider: (externalProvider: any, walletType: WalletType) => Promise<void>;
}

const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

const isRealMetaMask = (provider: any): boolean => {
  if (!provider) return false;
  
  // Check for Zerion - it sets isMetaMask for compatibility but also has isZerion
  if (provider.isZerion) return false;
  
  // Check for MetaMask's unique internal property
  if (provider._metamask) return true;
  
  // Check provider info if available
  if (provider.providerInfo?.name?.toLowerCase().includes('metamask')) return true;
  
  // Fallback: isMetaMask true but no other wallet flags
  if (provider.isMetaMask && !provider.isCoinbaseWallet && !provider.isBraveWallet && !provider.isRabby) {
    return true;
  }
  
  return false;
};

const isRealZerion = (provider: any): boolean => {
  if (!provider) return false;
  return provider.isZerion === true;
};

const detectWalletProvider = (walletType: WalletType): any => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.ethereum) {
    return null;
  }

  const providers = window.ethereum.providers || [];
  
  console.log("[Wallet Detection] Looking for:", walletType);
  console.log("[Wallet Detection] Providers count:", providers.length);
  
  // Log all provider details for debugging
  if (providers.length > 0) {
    providers.forEach((p: any, i: number) => {
      console.log(`[Wallet Detection] Provider ${i}:`, {
        isMetaMask: p.isMetaMask,
        isZerion: p.isZerion,
        _metamask: !!p._metamask,
        providerInfo: p.providerInfo
      });
    });
  } else {
    console.log("[Wallet Detection] window.ethereum:", {
      isMetaMask: window.ethereum.isMetaMask,
      isZerion: window.ethereum.isZerion,
      _metamask: !!window.ethereum._metamask
    });
  }

  if (walletType === "metamask") {
    // First check the providers array for real MetaMask
    if (providers.length > 0) {
      const metamaskProvider = providers.find((p: any) => isRealMetaMask(p));
      if (metamaskProvider) {
        console.log("[Wallet Detection] Found real MetaMask in providers array");
        return metamaskProvider;
      }
    }
    
    // Check if window.ethereum itself is real MetaMask
    if (isRealMetaMask(window.ethereum)) {
      console.log("[Wallet Detection] window.ethereum is real MetaMask");
      return window.ethereum;
    }
    
    console.log("[Wallet Detection] MetaMask not found");
    return null;
  }

  if (walletType === "zerion") {
    // First check the providers array for Zerion
    if (providers.length > 0) {
      const zerionProvider = providers.find((p: any) => isRealZerion(p));
      if (zerionProvider) {
        console.log("[Wallet Detection] Found Zerion in providers array");
        return zerionProvider;
      }
    }
    
    // Check if window.ethereum itself is Zerion
    if (isRealZerion(window.ethereum)) {
      console.log("[Wallet Detection] window.ethereum is Zerion");
      return window.ethereum;
    }
    
    console.log("[Wallet Detection] Zerion not found");
    return null;
  }

  return null;
};

export const checkWalletAvailability = (): { hasEthereum: boolean; isIframe: boolean; wallets: string[] } => {
  const hasEthereum = typeof window !== "undefined" && !!window.ethereum;
  const iframe = isInIframe();
  const wallets: string[] = [];
  
  if (hasEthereum && window.ethereum) {
    const providers = window.ethereum.providers || [];
    
    let hasMetaMask = false;
    let hasZerion = false;
    
    // Check providers array
    if (providers.length > 0) {
      providers.forEach((p: any) => {
        if (isRealMetaMask(p)) hasMetaMask = true;
        if (isRealZerion(p)) hasZerion = true;
      });
    } else {
      // Check window.ethereum directly
      if (isRealMetaMask(window.ethereum)) hasMetaMask = true;
      if (isRealZerion(window.ethereum)) hasZerion = true;
    }
    
    if (hasMetaMask) wallets.push("MetaMask");
    if (hasZerion) wallets.push("Zerion");
  }
  
  return { hasEthereum, isIframe: iframe, wallets };
};

export const useWallet = create<WalletState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  connectingWallet: null,
  connectedWalletType: null,
  walletAddress: null,
  kicksBalance: "0",
  provider: null,
  signer: null,
  kicksContract: null,
  error: null,
  kicksTokenAddress: null,
  houseWalletAddress: null,
  showWalletModal: false,
  glyphProvider: null,

  setShowWalletModal: (show: boolean) => {
    set({ showWalletModal: show, error: null });
  },

  setGlyphProvider: (provider: any) => {
    set({ glyphProvider: provider });
  },

  setTokenAddresses: (kicks: string, house: string) => {
    set({ kicksTokenAddress: kicks, houseWalletAddress: house });
  },

  connectWithProvider: async (externalProvider: any, walletType: WalletType) => {
    const { kicksTokenAddress } = get();
    
    set({ isConnecting: true, connectingWallet: walletType, error: null });

    try {
      const provider = new BrowserProvider(externalProvider);
      
      try {
        await externalProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: APECHAIN_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await externalProvider.request({
            method: "wallet_addEthereumChain",
            params: [APECHAIN_CONFIG],
          });
        }
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      const walletAddress = accounts[0];
      const signer = await provider.getSigner();
      
      let kicksContract = null;
      let kicksBalance = "0";
      
      if (kicksTokenAddress) {
        kicksContract = new ethers.Contract(kicksTokenAddress, KICKS_TOKEN_ABI, signer);
        try {
          const balance = await kicksContract.balanceOf(walletAddress);
          const decimals = await kicksContract.decimals();
          kicksBalance = ethers.formatUnits(balance, decimals);
        } catch (e) {
          console.log("Error fetching KICKS balance:", e);
        }
      }

      set({
        isConnected: true,
        isConnecting: false,
        connectingWallet: null,
        connectedWalletType: walletType,
        walletAddress,
        provider,
        signer,
        kicksContract,
        kicksBalance,
        showWalletModal: false,
      });

      externalProvider.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          get().disconnect();
        } else {
          set({ walletAddress: accounts[0] });
          get().refreshBalance();
        }
      });

      externalProvider.on("chainChanged", () => {
        window.location.reload();
      });

    } catch (error: any) {
      console.error("Connection error:", error);
      set({
        isConnecting: false,
        connectingWallet: null,
        error: error.message || "Failed to connect wallet",
      });
    }
  },

  connect: async (walletType: WalletType) => {
    const { kicksTokenAddress, glyphProvider, connectWithProvider } = get();
    
    set({ isConnecting: true, connectingWallet: walletType, error: null });

    if (walletType === "glyph") {
      if (glyphProvider) {
        await connectWithProvider(glyphProvider, walletType);
      } else {
        set({
          isConnecting: false,
          connectingWallet: null,
          error: "Glyph wallet not available. Please use MetaMask or Zerion.",
        });
      }
      return;
    }

    const ethereumProvider = detectWalletProvider(walletType);
    
    if (!ethereumProvider) {
      const walletName = walletType === "metamask" ? "MetaMask" : "Zerion";
      set({
        isConnecting: false,
        connectingWallet: null,
        error: `${walletName} not detected. Please install the ${walletName} extension.`,
      });
      return;
    }

    await connectWithProvider(ethereumProvider, walletType);
  },

  disconnect: () => {
    set({
      isConnected: false,
      connectedWalletType: null,
      walletAddress: null,
      kicksBalance: "0",
      provider: null,
      signer: null,
      kicksContract: null,
    });
  },

  refreshBalance: async () => {
    const { kicksContract, walletAddress } = get();
    
    if (!kicksContract || !walletAddress) return;

    try {
      const balance = await kicksContract.balanceOf(walletAddress);
      const decimals = await kicksContract.decimals();
      const kicksBalance = ethers.formatUnits(balance, decimals);
      set({ kicksBalance });
    } catch (error) {
      console.error("Error refreshing balance:", error);
    }
  },

  sendKicksToHouse: async (amount: string) => {
    const { kicksContract, houseWalletAddress } = get();
    
    if (!kicksContract || !houseWalletAddress) {
      console.error("Contract or house wallet not configured");
      return null;
    }

    try {
      const decimals = await kicksContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);
      
      const tx = await kicksContract.transfer(houseWalletAddress, amountInWei);
      const receipt = await tx.wait();
      
      await get().refreshBalance();
      
      return receipt.hash;
    } catch (error: any) {
      console.error("Transfer error:", error);
      throw error;
    }
  },

  requestKicksFromHouse: async (amount: string) => {
    console.log("Requesting KICKS from house:", amount);
    return true;
  },
}));

declare global {
  interface Window {
    ethereum?: any;
  }
}
