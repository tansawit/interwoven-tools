import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Chain } from '@/lib/hooks/useChains';

interface ChainSelectorProps {
  chains: Chain[];
  selectedChain: string;
  onChainChange: (chainName: string) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChainSelector({
  chains,
  selectedChain,
  onChainChange,
  loading = false,
  placeholder = 'Select a chain',
  className = '',
}: ChainSelectorProps) {
  const selectedChainData = chains.find((chain) => chain.chain_name === selectedChain);

  return (
    <Select value={selectedChain} onValueChange={onChainChange}>
      <SelectTrigger className={`w-full ${className}`}>
        <SelectValue placeholder={loading ? 'Loading chains...' : placeholder}>
          {selectedChainData && (
            <div className="flex items-center gap-2 sm:gap-3">
              {selectedChainData.logo_URIs?.png && (
                <div className="relative w-5 h-5 sm:w-6 sm:h-6 shrink-0">
                  <Image
                    src={selectedChainData.logo_URIs.png}
                    alt={selectedChainData.chain_name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                </div>
              )}
              <span className="text-sm">
                {selectedChainData.pretty_name || selectedChainData.chain_name}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-black border border-gray-600 max-h-64 rounded-none">
        {chains.map((chain) => (
          <SelectItem
            key={chain.chain_name}
            value={chain.chain_name}
            className="focus:bg-gray-800 focus:text-white cursor-pointer hover:bg-gray-700 text-white"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {chain.logo_URIs?.png && (
                <div className="relative w-5 h-5 sm:w-6 sm:h-6 shrink-0">
                  <Image
                    src={chain.logo_URIs.png}
                    alt={chain.chain_name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                </div>
              )}
              <span className="text-white text-sm">{chain.pretty_name || chain.chain_name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
