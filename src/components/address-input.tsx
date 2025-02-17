'use client';

import { useMemo, useState, memo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useChainData } from '@/lib/hooks/use-chain-data';
import { useAddressInput } from '@/lib/hooks/use-address-input';
import { getAssetBalance } from '@/lib/utils/asset-utils';
import { isValidInitiaAddress, isValidAmount } from '@/lib/utils/validation';
import { ChainSelector } from '@/components/chain-selector';
import { AssetSelector } from '@/components/asset-selector';
import { BalanceSummary } from '@/components/balance-summary';
import { useAddress, useWallet } from '@initia/react-wallet-widget';
import { MsgSend } from '@initia/initia.js';
import type { EncodeObject } from '@cosmjs/proto-signing';
import type { Msg } from '@initia/initia.js';
import { DenomUnit } from '@/lib/types';
import { cn } from '@/lib/utils';

const toEncodeObject = (msgs: Msg[]): EncodeObject[] => {
  return msgs.map((msg) => ({ typeUrl: msg.packAny().typeUrl, value: msg.toProto() }));
};

const AddressRow = memo(
  ({
    index,
    address,
    amount,
    onAddressChange,
    onAmountChange,
    onRemove,
    errors,
    isInputEnabled,
  }: {
    index: number;
    address: string;
    amount: string;
    onAddressChange: (index: number, value: string) => void;
    onAmountChange: (index: number, value: string) => void;
    onRemove: (index: number) => void;
    errors: { [key: string]: string };
    isInputEnabled: boolean;
  }) => (
    <div className="space-y-2">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="init address"
            value={address}
            onChange={(e) => onAddressChange(index, e.target.value)}
            className={cn(errors[`address-${index}`] && 'border-destructive')}
            disabled={!isInputEnabled}
          />
          {errors[`address-${index}`] && (
            <p className="text-sm text-destructive mt-1">{errors[`address-${index}`]}</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Amount"
              type="text"
              value={amount}
              onChange={(e) => onAmountChange(index, e.target.value)}
              className={cn('w-32', errors[`amount-${index}`] && 'border-destructive')}
              disabled={!isInputEnabled}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="hover:bg-destructive/90 hover:text-destructive-foreground"
              disabled={!isInputEnabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {errors[`amount-${index}`] && (
            <p className="text-sm text-destructive">{errors[`amount-${index}`]}</p>
          )}
        </div>
      </div>
    </div>
  )
);

AddressRow.displayName = 'AddressRow';

const BulkInput = memo(
  ({
    value,
    onChange,
    errors,
    isInputEnabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    errors: { [key: string]: string };
    isInputEnabled: boolean;
  }) => (
    <div className="space-y-2">
      <Textarea
        placeholder={`Enter addresses and amounts (one per line)\nExample:\ninit1... 100\ninit1... 200`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'min-h-[200px]',
          Object.keys(errors).some((key) => key.startsWith('bulk-')) && 'border-destructive'
        )}
        disabled={!isInputEnabled}
      />
      {Object.entries(errors)
        .filter(([key]) => key.startsWith('bulk-'))
        .map(([key, value]) => (
          <p key={key} className="text-sm text-destructive">
            Line {parseInt(key.split('-')[1]) + 1}: {value}
          </p>
        ))}
    </div>
  )
);

BulkInput.displayName = 'BulkInput';

export default function AddressInput() {
  const [selectedAsset, setSelectedAsset] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const address = useAddress();
  const { requestTx } = useWallet();
  const {
    chains,
    selectedChain,
    setSelectedChain,
    assets,
    balances,
    isLoadingAssets,
    isLoadingBalances,
  } = useChainData();

  const {
    addresses,
    bulkInput,
    setBulkInput,
    activeTab,
    setActiveTab,
    addNewRow,
    removeRow,
    updateAddress,
    updateAmount,
    totalAmount,
  } = useAddressInput();

  const selectedAssetBalance = useMemo(() => {
    if (!selectedAsset || isLoadingBalances) return 'Loading...';
    return getAssetBalance(selectedAsset, assets, balances);
  }, [selectedAsset, assets, balances, isLoadingBalances]);

  const remainingBalance = useMemo(() => {
    const total = Number.parseFloat(totalAmount);
    const balance = Number.parseFloat(selectedAssetBalance);
    return (balance - total).toFixed(6);
  }, [totalAmount, selectedAssetBalance]);

  const isSendEnabled = useMemo(() => {
    const hasChain = Boolean(selectedChain);
    const hasAsset = Boolean(selectedAsset);
    const hasWallet = Boolean(address);
    const hasValidInput =
      activeTab === 'separate'
        ? addresses.some((addr) => Boolean(addr.address?.trim()) && Boolean(addr.amount?.trim()))
        : Boolean(bulkInput.trim());

    console.log('Send button conditions:', {
      hasChain,
      hasAsset,
      hasWallet,
      hasValidInput,
      activeTab,
      addresses: addresses.map((addr) => ({
        hasAddress: Boolean(addr.address?.trim()),
        hasAmount: Boolean(addr.amount?.trim()),
      })),
    });

    return hasChain && hasAsset && hasWallet && hasValidInput;
  }, [selectedChain, selectedAsset, address, addresses, bulkInput, activeTab]);

  const validateAddress = (address: string, index: number) => {
    if (!address) {
      setErrors((prev) => ({ ...prev, [`address-${index}`]: 'Address is required' }));
      return false;
    }
    if (!isValidInitiaAddress(address)) {
      setErrors((prev) => ({ ...prev, [`address-${index}`]: 'Invalid Initia address' }));
      return false;
    }
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`address-${index}`];
      return newErrors;
    });
    return true;
  };

  const handleAddressChange = useCallback(
    (index: number, value: string) => {
      updateAddress(index, value);
      validateAddress(value, index);
    },
    [updateAddress]
  );

  const handleAmountChange = useCallback(
    (index: number, value: string) => {
      if (/^\d*\.?\d*$/.test(value)) {
        updateAmount(index, value);
        // Inline validation
        if (!value) {
          setErrors((prev) => ({ ...prev, [`amount-${index}`]: 'Amount is required' }));
          return;
        }
        if (!isValidAmount(value)) {
          setErrors((prev) => ({ ...prev, [`amount-${index}`]: 'Invalid amount' }));
          return;
        }
        const parsedAmount = parseFloat(value);
        const balance = parseFloat(selectedAssetBalance);
        if (parsedAmount > balance) {
          setErrors((prev) => ({ ...prev, [`amount-${index}`]: 'Insufficient balance' }));
          return;
        }
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`amount-${index}`];
          return newErrors;
        });
      }
    },
    [updateAmount, selectedAssetBalance]
  );

  const handleRemoveRow = useCallback(
    (index: number) => {
      removeRow(index);
    },
    [removeRow]
  );

  const handleBulkInputChange = useCallback(
    (value: string) => {
      setBulkInput(value);

      // Inline validation
      const lines = value.split('\n');
      let isValid = true;
      const newErrors: { [key: string]: string } = {};

      lines.forEach((line, index) => {
        const [address, amount] = line.trim().split(/\s+/);
        if (!address || !amount) {
          newErrors[`bulk-${index}`] = 'Each line must contain both address and amount';
          isValid = false;
          return;
        }
        if (!isValidInitiaAddress(address)) {
          newErrors[`bulk-${index}`] = 'Invalid Initia address';
          isValid = false;
        }
        if (!isValidAmount(amount)) {
          newErrors[`bulk-${index}`] = 'Invalid amount';
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [setBulkInput]
  );

  const isInputEnabled = Boolean(selectedChain && selectedAsset);

  const parseBulkAddresses = (input: string): { address: string; amount: string }[] => {
    return input
      .split('\n')
      .map((line) => {
        const [address, amount] = line.trim().split(/\s+/);
        return { address: address || '', amount: amount || '' };
      })
      .filter(({ address, amount }) => address && amount);
  };

  const handleSend = useCallback(async () => {
    if (!address || !selectedAsset) return;
    setIsLoading(true);
    const toastId = toast.loading('Sending transaction...');
    try {
      const selectedAssetData = assets.find((asset) => asset.symbol === selectedAsset);
      if (!selectedAssetData) throw new Error('Asset not found');

      const addressList =
        activeTab === 'separate'
          ? addresses.filter((addr) => addr.address && addr.amount)
          : parseBulkAddresses(bulkInput);

      const msgs = addressList.map(({ address: recipient, amount }) => {
        const baseDenom = selectedAssetData.denom_units.find(
          (unit: DenomUnit) => unit.exponent === 0
        )?.denom;
        if (!baseDenom) throw new Error('Base denom not found');

        const displayUnit = selectedAssetData.denom_units.find(
          (unit: DenomUnit) => unit.denom === selectedAssetData.display
        );
        const exponent = displayUnit?.exponent || 6;

        const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
        if (isNaN(parsedAmount)) {
          throw new Error(`Invalid amount: ${amount}`);
        }

        const amountInBaseUnits = Math.floor(parsedAmount * Math.pow(10, exponent)).toString();

        return new MsgSend(address, recipient, `${amountInBaseUnits}${baseDenom}`);
      });

      const selectedChainData = chains.find((chain) => chain.chain_name === selectedChain);
      if (!selectedChainData) throw new Error('Selected chain not found');

      const hash = await requestTx(
        {
          messages: toEncodeObject(msgs),
          memo: `Interwoven Tools`,
        },
        { chainId: selectedChainData.chain_id }
      );
      toast.success('Transaction successful', {
        id: toastId,
        description: (
          <a
            href={`https://scan.testnet.initia.xyz/${selectedChainData.chain_id}/txs/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            View on Explorer
          </a>
        ),
      });
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error('Transaction failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    address,
    selectedAsset,
    activeTab,
    addresses,
    bulkInput,
    assets,
    chains,
    selectedChain,
    requestTx,
  ]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <ChainSelector
          chains={chains}
          selectedChain={selectedChain}
          onChainSelect={setSelectedChain}
        />
        <AssetSelector
          assets={assets}
          balances={balances}
          selectedAsset={selectedAsset}
          onAssetSelect={setSelectedAsset}
          isLoadingAssets={isLoadingAssets}
          isLoadingBalances={isLoadingBalances}
          disabled={!selectedChain}
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'separate' | 'bulk')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="separate" disabled={!isInputEnabled}>
            Formatted
          </TabsTrigger>
          <TabsTrigger value="bulk" disabled={!isInputEnabled}>
            Raw
          </TabsTrigger>
        </TabsList>
        <TabsContent value="separate" className="space-y-4">
          {addresses.map((item, index) => (
            <AddressRow
              key={index}
              index={index}
              address={item.address}
              amount={item.amount}
              onAddressChange={handleAddressChange}
              onAmountChange={handleAmountChange}
              onRemove={handleRemoveRow}
              errors={errors}
              isInputEnabled={isInputEnabled}
            />
          ))}
          <Button
            onClick={addNewRow}
            variant="outline"
            className="w-full"
            disabled={!isInputEnabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Address
          </Button>
        </TabsContent>
        <TabsContent value="bulk">
          <BulkInput
            value={bulkInput}
            onChange={handleBulkInputChange}
            errors={errors}
            isInputEnabled={isInputEnabled}
          />
        </TabsContent>
      </Tabs>

      <BalanceSummary
        selectedAsset={selectedAsset}
        selectedAssetBalance={selectedAssetBalance}
        totalAmount={totalAmount}
        remainingBalance={remainingBalance}
      />

      <div className="space-y-4">
        <Button
          onClick={handleSend}
          disabled={!isSendEnabled || isLoading || Object.keys(errors).length > 0}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
