import { create } from "zustand";
import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";
import { WalletType } from "../wagmi-config";

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  detail: EIP6963ProviderDetail;
}

const discoveredProviders: Map<string, EIP6963ProviderDetail> = new Map();

const setupEIP6963Listener = () => {
  if (typeof window === "undefined") return;
  
  window.addEventListener("eip6963:announceProvider", (event: Event) => {
    const e = event as EIP6963AnnounceProviderEvent;
    const { info, provider } = e.detail;
    console.log("[EIP6963] Discovered wallet:", info.name, info.rdns);
    discoveredProviders.set(info.rdns, { info, provider });
  });
  
  window.dispatchEvent(new Event("eip6963:requestProvider"));
};

if (typeof window !== "undefined") {
  setupEIP6963Listener();
}

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

interface TransactionState {
  status: "idle" | "checking" | "approving" | "transferring" | "signing" | "claiming" | "success" | "error";
  message: string;
  txHash?: string;
}

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
  transactionState: TransactionState;
  
  connect: (walletType: WalletType) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  setTokenAddresses: (kicks: string, house: string) => void;
  checkAllowance: () => Promise<bigint>;
  approveTokens: (amount: string) => Promise<string | null>;
  sendKicksToHouse: (amount: string) => Promise<string | null>;
  signClaimMessage: (amount: string, gameId: number, nonce: string) => Promise<string | null>;
  requestKicksFromHouse: (amount: string, gameId: number, signature: string, nonce: string) => Promise<boolean>;
  setShowWalletModal: (show: boolean) => void;
  setGlyphProvider: (provider: any) => void;
  connectWithProvider: (externalProvider: any, walletType: WalletType) => Promise<void>;
  setTransactionState: (state: Partial<TransactionState>) => void;
  resetTransactionState: () => void;
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

const getEIP6963Provider = (walletType: WalletType): any => {
  console.log("[EIP6963] Looking for:", walletType);
  console.log("[EIP6963] Discovered providers:", Array.from(discoveredProviders.keys()));
  
  if (walletType === "metamask") {
    // MetaMask's RDNS
    const metamaskRdns = ["io.metamask", "io.metamask.flask"];
    for (const rdns of metamaskRdns) {
      const provider = discoveredProviders.get(rdns);
      if (provider) {
        console.log("[EIP6963] Found MetaMask via RDNS:", rdns);
        return provider.provider;
      }
    }
    
    // Also check by name
    const entries = Array.from(discoveredProviders.entries());
    for (const [rdns, detail] of entries) {
      if (detail.info.name.toLowerCase().includes("metamask") && !rdns.includes("zerion")) {
        console.log("[EIP6963] Found MetaMask by name:", detail.info.name);
        return detail.provider;
      }
    }
  }
  
  if (walletType === "zerion") {
    // Zerion's RDNS
    const zerionRdns = ["io.zerion.wallet", "app.zerion"];
    for (const rdns of zerionRdns) {
      const provider = discoveredProviders.get(rdns);
      if (provider) {
        console.log("[EIP6963] Found Zerion via RDNS:", rdns);
        return provider.provider;
      }
    }
    
    // Also check by name
    const entries = Array.from(discoveredProviders.entries());
    for (const [rdns, detail] of entries) {
      if (detail.info.name.toLowerCase().includes("zerion")) {
        console.log("[EIP6963] Found Zerion by name:", detail.info.name);
        return detail.provider;
      }
    }
  }
  
  return null;
};

const detectWalletProvider = (walletType: WalletType): any => {
  if (typeof window === "undefined") {
    return null;
  }

  console.log("[Wallet Detection] Looking for:", walletType);
  
  // First try EIP-6963 (modern standard)
  const eip6963Provider = getEIP6963Provider(walletType);
  if (eip6963Provider) {
    console.log("[Wallet Detection] Found via EIP-6963");
    return eip6963Provider;
  }

  if (!window.ethereum) {
    console.log("[Wallet Detection] No window.ethereum");
    return null;
  }

  const providers = window.ethereum.providers || [];
  
  console.log("[Wallet Detection] Falling back to legacy detection");
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
  transactionState: { status: "idle", message: "" },

  setShowWalletModal: (show: boolean) => {
    set({ showWalletModal: show, error: null });
  },

  setGlyphProvider: (provider: any) => {
    set({ glyphProvider: provider });
  },

  setTokenAddresses: (kicks: string, house: string) => {
    set({ kicksTokenAddress: kicks, houseWalletAddress: house });
  },

  setTransactionState: (state: Partial<TransactionState>) => {
    set((prev) => ({ transactionState: { ...prev.transactionState, ...state } }));
  },

  resetTransactionState: () => {
    set({ transactionState: { status: "idle", message: "" } });
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

  checkAllowance: async () => {
    const { kicksContract, walletAddress, houseWalletAddress } = get();
    
    if (!kicksContract || !walletAddress || !houseWalletAddress) {
      return BigInt(0);
    }

    try {
      const allowance = await kicksContract.allowance(walletAddress, houseWalletAddress);
      return allowance;
    } catch (error) {
      console.error("Error checking allowance:", error);
      return BigInt(0);
    }
  },

  approveTokens: async (amount: string) => {
    const { kicksContract, houseWalletAddress, setTransactionState } = get();
    
    if (!kicksContract || !houseWalletAddress) {
      setTransactionState({ status: "error", message: "Wallet not configured properly" });
      return null;
    }

    try {
      setTransactionState({ status: "approving", message: "Approving KICKS tokens..." });
      
      const decimals = await kicksContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);
      
      const tx = await kicksContract.approve(houseWalletAddress, amountInWei);
      const receipt = await tx.wait();
      
      setTransactionState({ status: "success", message: "Approval successful", txHash: receipt.hash });
      return receipt.hash;
    } catch (error: any) {
      console.error("Approval error:", error);
      setTransactionState({ status: "error", message: error.message || "Failed to approve tokens" });
      throw error;
    }
  },

  sendKicksToHouse: async (amount: string) => {
    const { kicksContract, houseWalletAddress, checkAllowance, approveTokens, setTransactionState } = get();
    
    if (!kicksContract || !houseWalletAddress) {
      setTransactionState({ status: "error", message: "Token contract or house wallet not configured" });
      return null;
    }

    try {
      setTransactionState({ status: "checking", message: "Checking token allowance..." });
      
      const decimals = await kicksContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);
      
      const currentAllowance = await checkAllowance();
      
      if (currentAllowance < amountInWei) {
        await approveTokens(amount);
      }
      
      setTransactionState({ status: "transferring", message: "Transferring KICKS to house wallet..." });
      
      const tx = await kicksContract.transfer(houseWalletAddress, amountInWei);
      const receipt = await tx.wait();
      
      await get().refreshBalance();
      
      setTransactionState({ status: "success", message: "Transfer successful!", txHash: receipt.hash });
      return receipt.hash;
    } catch (error: any) {
      console.error("Transfer error:", error);
      const message = error.code === "ACTION_REJECTED" 
        ? "Transaction rejected by user" 
        : error.message || "Failed to transfer tokens";
      setTransactionState({ status: "error", message });
      throw error;
    }
  },

  signClaimMessage: async (amount: string, gameId: number, nonce: string) => {
    const { signer, walletAddress, setTransactionState } = get();
    
    if (!signer || !walletAddress) {
      setTransactionState({ status: "error", message: "Wallet not connected" });
      return null;
    }

    try {
      setTransactionState({ status: "signing", message: "Please sign the claim message..." });
      
      const message = `KICKS CLIMB Claim\nAmount: ${amount} KICKS\nGame ID: ${gameId}\nWallet: ${walletAddress}\nNonce: ${nonce}`;
      
      const signature = await signer.signMessage(message);
      
      setTransactionState({ status: "success", message: "Message signed successfully" });
      return signature;
    } catch (error: any) {
      console.error("Signing error:", error);
      const message = error.code === "ACTION_REJECTED" 
        ? "Signature rejected by user" 
        : error.message || "Failed to sign message";
      setTransactionState({ status: "error", message });
      throw error;
    }
  },

  requestKicksFromHouse: async (amount: string, gameId: number, signature: string, nonce: string) => {
    const { walletAddress, setTransactionState } = get();
    
    if (!walletAddress) {
      setTransactionState({ status: "error", message: "Wallet not connected" });
      return false;
    }

    try {
      setTransactionState({ status: "claiming", message: "Processing claim request..." });
      
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletAddress,
          amount: amount,
          gameId: gameId,
          signature: signature,
          nonce: nonce,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Claim failed");
      }
      
      const data = await response.json();
      
      await get().refreshBalance();
      
      setTransactionState({ 
        status: "success", 
        message: "Claim verified! Your winnings have been recorded.",
        txHash: data.txHash 
      });
      
      return true;
    } catch (error: any) {
      console.error("Claim error:", error);
      setTransactionState({ status: "error", message: error.message || "Failed to claim tokens" });
      return false;
    }
  },
}));

declare global {
  interface Window {
    ethereum?: any;
  }
}
