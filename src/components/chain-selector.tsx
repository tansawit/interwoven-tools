'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import { Chain } from '@/lib/types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLogoURI } from '@/lib/utils/asset-utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ChainSelectorProps {
  chains: Chain[];
  selectedChain: string;
  onChainSelect: (chain: string) => void;
}

const ChainButton = memo(
  ({ selectedChain, chains }: { selectedChain: string; chains: Chain[] }) => {
    const selectedChainData = useMemo(
      () => chains.find((chain) => chain.chain_name === selectedChain),
      [chains, selectedChain]
    );

    return (
      <div className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <div className="flex items-center gap-2">
          {selectedChain ? (
            <>
              <img
                src={getLogoURI(selectedChainData?.logo_URIs)}
                alt={selectedChain}
                className="h-4 w-4 rounded-full"
              />
              <span>{selectedChainData?.pretty_name || selectedChain}</span>
            </>
          ) : (
            <span>Select Chain</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>
    );
  }
);

ChainButton.displayName = 'ChainButton';

const ChainList = memo(
  ({
    chains,
    selectedChain,
    onSelect,
  }: {
    chains: Chain[];
    selectedChain: string;
    onSelect: (value: string) => void;
  }) => (
    <CommandGroup>
      {chains.map((chain) => (
        <CommandItem
          key={chain.chain_id}
          value={chain.chain_name}
          onSelect={(currentValue) => {
            onSelect(currentValue === selectedChain ? '' : currentValue);
          }}
          className="px-2"
        >
          <Check
            className={cn(
              'mr-2 h-4 w-4',
              selectedChain === chain.chain_name ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div className="flex items-center gap-2">
            <img
              src={getLogoURI(chain.logo_URIs) || '/placeholder.svg'}
              alt={chain.pretty_name}
              className="h-4 w-4 rounded-full"
            />
            {chain.pretty_name}
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  )
);

ChainList.displayName = 'ChainList';

export const ChainSelector = memo(
  ({ chains, selectedChain, onChainSelect }: ChainSelectorProps) => {
    const [open, setOpen] = useState(false);

    const handleSelect = useCallback(
      (value: string) => {
        onChainSelect(value);
        setOpen(false);
      },
      [onChainSelect]
    );

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Chain</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full">
              <ChainButton selectedChain={selectedChain} chains={chains} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]" align="start">
            <Command>
              <CommandInput placeholder="Search chains..." />
              <CommandList>
                <CommandEmpty>No chain found.</CommandEmpty>
                <ChainList chains={chains} selectedChain={selectedChain} onSelect={handleSelect} />
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

ChainSelector.displayName = 'ChainSelector';
