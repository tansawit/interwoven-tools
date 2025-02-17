'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import { Asset, Balance } from '@/lib/types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLogoURI, getAssetBalance, getSortedAssets } from '@/lib/utils/asset-utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AssetSelectorProps {
  assets: Asset[];
  balances: Balance[];
  selectedAsset: string;
  onAssetSelect: (asset: string) => void;
  isLoadingAssets: boolean;
  isLoadingBalances: boolean;
  disabled?: boolean;
}

const AssetButton = memo(
  ({
    selectedAsset,
    assets,
    isLoadingAssets,
    disabled,
  }: {
    selectedAsset: string;
    assets: Asset[];
    isLoadingAssets: boolean;
    disabled: boolean;
  }) => {
    const selectedAssetData = useMemo(
      () => assets.find((asset) => asset.symbol === selectedAsset),
      [assets, selectedAsset]
    );

    return (
      <div
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          (disabled || isLoadingAssets) && 'cursor-not-allowed opacity-50'
        )}
      >
        <div className="flex items-center gap-2">
          {selectedAsset ? (
            <>
              <img
                src={getLogoURI(selectedAssetData?.logo_URIs)}
                alt={selectedAsset}
                className="h-4 w-4 rounded-full"
              />
              <span>{selectedAsset}</span>
            </>
          ) : isLoadingAssets ? (
            <span className="animate-pulse">Loading assets...</span>
          ) : (
            <span>Select Asset</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>
    );
  }
);

AssetButton.displayName = 'AssetButton';

const AssetItem = memo(
  ({
    asset,
    isLoadingBalances,
    assets,
    balances,
  }: {
    asset: Asset;
    isLoadingBalances: boolean;
    assets: Asset[];
    balances: Balance[];
  }) => {
    const assetBalance = useMemo(
      () => getAssetBalance(asset.symbol, assets, balances),
      [asset.symbol, assets, balances]
    );

    return (
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <img
            src={getLogoURI(asset.logo_URIs) || '/placeholder.svg'}
            alt={asset.symbol}
            className="h-4 w-4 rounded-full flex-shrink-0"
          />
          <span className="truncate">{asset.symbol}</span>
        </div>
        {isLoadingBalances ? (
          <span className="text-sm text-muted-foreground text-right flex-shrink-0 tabular-nums">
            Loading...
          </span>
        ) : (
          Number(assetBalance) > 0 && (
            <span className="text-sm text-muted-foreground text-right flex-shrink-0 tabular-nums">
              {assetBalance}
            </span>
          )
        )}
      </div>
    );
  }
);

AssetItem.displayName = 'AssetItem';

const AssetList = memo(
  ({
    sortedAssets,
    selectedAsset,
    onSelect,
    isLoadingBalances,
    assets,
    balances,
  }: {
    sortedAssets: Asset[];
    selectedAsset: string;
    onSelect: (value: string) => void;
    isLoadingBalances: boolean;
    assets: Asset[];
    balances: Balance[];
  }) => {
    const assetsWithBalance = useMemo(() => {
      if (isLoadingBalances) return sortedAssets;
      return sortedAssets.filter((asset) => {
        const balance = getAssetBalance(asset.symbol, assets, balances);
        return Number(balance) > 0;
      });
    }, [sortedAssets, assets, balances, isLoadingBalances]);

    if (assetsWithBalance.length === 0 && !isLoadingBalances) {
      return (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">No assets with balance found</p>
        </div>
      );
    }

    return (
      <CommandGroup>
        {assetsWithBalance.map((asset) => (
          <CommandItem
            key={asset.symbol}
            value={asset.symbol}
            onSelect={(currentValue) => {
              onSelect(currentValue === selectedAsset ? '' : currentValue);
            }}
            className="px-2"
          >
            <Check
              className={cn(
                'mr-2 h-4 w-4',
                selectedAsset === asset.symbol ? 'opacity-100' : 'opacity-0'
              )}
            />
            <AssetItem
              asset={asset}
              isLoadingBalances={isLoadingBalances}
              assets={assets}
              balances={balances}
            />
          </CommandItem>
        ))}
      </CommandGroup>
    );
  }
);

AssetList.displayName = 'AssetList';

export const AssetSelector = memo(
  ({
    assets,
    balances,
    selectedAsset,
    onAssetSelect,
    isLoadingAssets,
    isLoadingBalances,
    disabled = false,
  }: AssetSelectorProps) => {
    const [open, setOpen] = useState(false);
    const sortedAssets = useMemo(() => getSortedAssets(assets, balances), [assets, balances]);

    const handleSelect = useCallback(
      (value: string) => {
        onAssetSelect(value);
        setOpen(false);
      },
      [onAssetSelect]
    );

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Asset</label>
        <Popover open={open} onOpenChange={disabled || isLoadingAssets ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full" disabled={disabled || isLoadingAssets}>
              <AssetButton
                selectedAsset={selectedAsset}
                assets={assets}
                isLoadingAssets={isLoadingAssets}
                disabled={disabled}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]" align="start">
            <Command>
              <CommandInput placeholder="Search assets with balance..." />
              <CommandList>
                <CommandEmpty>No matching assets with balance found</CommandEmpty>
                <AssetList
                  sortedAssets={sortedAssets}
                  selectedAsset={selectedAsset}
                  onSelect={handleSelect}
                  isLoadingBalances={isLoadingBalances}
                  assets={assets}
                  balances={balances}
                />
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

AssetSelector.displayName = 'AssetSelector';
