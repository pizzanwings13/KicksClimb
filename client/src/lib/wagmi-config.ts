export type WalletType = "metamask" | "zerion" | "glyph";

export interface WalletOption {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
}

export const walletOptions: WalletOption[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    description: "Connect using MetaMask wallet",
    available: true,
  },
  {
    id: "zerion",
    name: "Zerion",
    icon: "⚡",
    description: "Connect using Zerion wallet",
    available: true,
  },
  {
    id: "glyph",
    name: "Glyph",
    icon: "🔮",
    description: "Sign in with X or Email (ApeChain)",
    available: false,
    comingSoon: true,
  },
];
