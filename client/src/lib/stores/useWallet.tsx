import { create } from "zustand";
import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";

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
  walletAddress: string | null;
  kicksBalance: string;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  kicksContract: ethers.Contract | null;
  error: string | null;
  kicksTokenAddress: string | null;
  houseWalletAddress: string | null;
  
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  setTokenAddresses: (kicks: string, house: string) => void;
  sendKicksToHouse: (amount: string) => Promise<string | null>;
  requestKicksFromHouse: (amount: string) => Promise<boolean>;
}

export const useWallet = create<WalletState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  walletAddress: null,
  kicksBalance: "0",
  provider: null,
  signer: null,
  kicksContract: null,
  error: null,
  kicksTokenAddress: null,
  houseWalletAddress: null,

  setTokenAddresses: (kicks: string, house: string) => {
    set({ kicksTokenAddress: kicks, houseWalletAddress: house });
  },

  connect: async () => {
    const { kicksTokenAddress } = get();
    
    if (typeof window.ethereum === "undefined") {
      set({ error: "Please install MetaMask or another Web3 wallet" });
      return;
    }

    set({ isConnecting: true, error: null });

    try {
      const provider = new BrowserProvider(window.ethereum);
      
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: APECHAIN_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [APECHAIN_CONFIG],
          });
        } else {
          throw switchError;
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
        walletAddress,
        provider,
        signer,
        kicksContract,
        kicksBalance,
      });

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          get().disconnect();
        } else {
          set({ walletAddress: accounts[0] });
          get().refreshBalance();
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });

    } catch (error: any) {
      console.error("Connection error:", error);
      set({
        isConnecting: false,
        error: error.message || "Failed to connect wallet",
      });
    }
  },

  disconnect: () => {
    set({
      isConnected: false,
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
    const { kicksContract, houseWalletAddress, kicksTokenAddress } = get();
    
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
