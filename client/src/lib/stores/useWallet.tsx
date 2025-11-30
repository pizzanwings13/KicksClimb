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

const detectWalletProvider = (walletType: WalletType): any => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.ethereum) {
    return null;
  }

  const providers = window.ethereum.providers || [window.ethereum];

  if (walletType === "metamask") {
    const metamaskProvider = providers.find((p: any) => p.isMetaMask && !p.isZerion);
    if (metamaskProvider) {
      return metamaskProvider;
    }
    if (window.ethereum.isMetaMask && !window.ethereum.isZerion) {
      return window.ethereum;
    }
    if (window.ethereum && !window.ethereum.isZerion) {
      return window.ethereum;
    }
    return null;
  }

  if (walletType === "zerion") {
    const zerionProvider = providers.find((p: any) => p.isZerion);
    if (zerionProvider) {
      return zerionProvider;
    }
    if (window.ethereum.isZerion) {
      return window.ethereum;
    }
    return null;
  }

  if (window.ethereum) {
    return window.ethereum;
  }

  return null;
};

export const checkWalletAvailability = (): { hasEthereum: boolean; isIframe: boolean; wallets: string[] } => {
  const hasEthereum = typeof window !== "undefined" && !!window.ethereum;
  const iframe = isInIframe();
  const wallets: string[] = [];
  
  if (hasEthereum && window.ethereum) {
    const providers = window.ethereum.providers || [window.ethereum];
    providers.forEach((p: any) => {
      if (p.isMetaMask) wallets.push("MetaMask");
      if (p.isZerion) wallets.push("Zerion");
    });
    if (wallets.length === 0 && window.ethereum.isMetaMask) {
      wallets.push("MetaMask");
    }
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
