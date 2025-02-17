import { Asset, Balance } from '@/lib/types';

export const getLogoURI = (logoURIs: { svg?: string; png?: string } | undefined) => {
  if (!logoURIs) return '/placeholder.svg';
  return logoURIs.svg || logoURIs.png || '/placeholder.svg';
};

export const formatBalance = (balance: string, decimals: number) => {
  return (Number(balance) / Math.pow(10, decimals)).toFixed(decimals);
};

export const getAssetBalance = (symbol: string, assets: Asset[], balances: Balance[]): string => {
  try {
    const asset = assets.find((a) => a.symbol === symbol);
    if (!asset) {
      console.log(`No asset found for symbol: ${symbol}`);
      return '0';
    }

    const baseDenom = asset.denom_units.find((unit) => unit.exponent === 0)?.denom;
    if (!baseDenom) {
      console.log(`No base denom found for asset: ${symbol}`);
      return '0';
    }

    const balance = balances.find((b) => b.denom === baseDenom);
    if (!balance) {
      console.log(`No balance found for denom: ${baseDenom}`);
      return '0';
    }

    const displayUnit = asset.denom_units.find((unit) => unit.denom === asset.display);
    const exponent = displayUnit?.exponent || 6;
    return formatBalance(balance.amount, exponent);
  } catch (error) {
    console.error('Error getting asset balance:', error);
    return '0';
  }
};

export const getSortedAssets = (assets: Asset[], balances: Balance[]) => {
  return [...assets].sort((a, b) => {
    const balanceA = Number(getAssetBalance(a.symbol, assets, balances));
    const balanceB = Number(getAssetBalance(b.symbol, assets, balances));

    if (balanceA > 0 && balanceB === 0) return -1;
    if (balanceA === 0 && balanceB > 0) return 1;

    if (balanceA !== balanceB) return balanceB - balanceA;

    return a.symbol.localeCompare(b.symbol);
  });
};
