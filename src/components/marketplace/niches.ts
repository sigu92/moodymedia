import {
  DollarSign,
  Gamepad2,
  ShieldAlert,
  Heart,
  Leaf,
  Bitcoin,
  TrendingUp,
  type LucideIcon
} from "lucide-react";

export interface Niche {
  slug: string;
  label: string;
  icon: LucideIcon;
  defaultMultiplier: number;
}

export const NICHES: Niche[] = [
  {
    slug: 'casino',
    label: 'Casino',
    icon: Gamepad2,
    defaultMultiplier: 2.0
  },
  {
    slug: 'loans',
    label: 'Loans',
    icon: DollarSign,
    defaultMultiplier: 1.8
  },
  {
    slug: 'adult',
    label: 'Adult',
    icon: ShieldAlert,
    defaultMultiplier: 1.5
  },
  {
    slug: 'dating',
    label: 'Dating',
    icon: Heart,
    defaultMultiplier: 1.5
  },
  {
    slug: 'cbd',
    label: 'CBD',
    icon: Leaf,
    defaultMultiplier: 1.5
  },
  {
    slug: 'crypto',
    label: 'Crypto',
    icon: Bitcoin,
    defaultMultiplier: 1.5
  },
  {
    slug: 'forex',
    label: 'Forex',
    icon: TrendingUp,
    defaultMultiplier: 1.8
  }
];

export const getNicheBySlug = (slug: string): Niche | undefined => {
  return NICHES.find(niche => niche.slug === slug);
};

export const formatMultiplier = (multiplier: number): string => {
  return `x${multiplier.toFixed(1)}`;
};