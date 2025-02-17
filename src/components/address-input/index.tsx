'use client';

import { useMemo, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useChainData } from '@/lib/hooks/use-chain-data';
import { useAddressInput } from '@/lib/hooks/use-address-input';
import { getAssetBalance } from '@/lib/utils/asset-utils';
import { useAddress, useWallet } from '@initia/react-wallet-widget';
import { MsgSend, Coin } from '@initia/initia.js';
import type { EncodeObject } from '@cosmjs/proto-signing';
import type { Msg } from '@initia/initia.js';
import { ChainSelector } from '@/components/chain-selector';
import { AssetSelector } from '@/components/asset-selector';
import { BalanceSummary } from '@/components/balance-summary';
import { AddressRow } from './address-row';
import { BulkInput } from './bulk-input';
import { validateAddress, validateAmount, validateBulkInput } from './validation';
import { useTransactionState } from '@/lib/hooks/use-transaction-state';

const toEncodeObject = (msgs: Msg[]): { messages: EncodeObject[] } => ({
  messages: msgs.map((msg) => ({ typeUrl: msg.packAny().typeUrl, value: msg.toProto() })),
});

export default function AddressInput() {
  const {
    isLoading,
    transactionHash,
    setTransactionHash,
    handleTransactionStart,
    handleTransactionEnd,
  } = useTransactionState();

  const [selectedAsset, setSelectedAsset] = useState('');
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
    if (selectedAssetBalance === 'Loading...') return '0.000000';
    const total = Number.parseFloat(totalAmount || '0');
    const balance = Number.parseFloat(selectedAssetBalance);
    return (balance - total).toFixed(6);
  }, [totalAmount, selectedAssetBalance]);

  const isSendEnabled = useMemo(() => {
    if (!selectedChain || !selectedAsset || !address) return false;
    if (isLoading || isLoadingBalances) return false;

    const hasValidInput =
      activeTab === 'separate'
        ? addresses.some((addr) => addr.address?.trim() && addr.amount?.trim())
        : Boolean(bulkInput.trim());

    return hasValidInput && Object.keys(errors).length === 0;
  }, [
    selectedChain,
    selectedAsset,
    address,
    addresses,
    bulkInput,
    activeTab,
    errors,
    isLoading,
    isLoadingBalances,
  ]);

  const handleAddressChange = useCallback(
    (index: number, value: string) => {
      updateAddress(index, value);
      const { errors: newErrors } = validateAddress(value, index, errors);
      setErrors(newErrors);
    },
    [updateAddress, errors]
  );

  const handleAmountChange = useCallback(
    (index: number, value: string) => {
      if (/^\d*\.?\d*$/.test(value)) {
        updateAmount(index, value);
        const { errors: newErrors } = validateAmount(value, index, selectedAssetBalance, errors);
        setErrors(newErrors);
      }
    },
    [updateAmount, selectedAssetBalance, errors]
  );

  const handleBulkInputChange = useCallback(
    (value: string) => {
      setBulkInput(value);
      const { errors: newErrors } = validateBulkInput(value, selectedAssetBalance, errors);
      setErrors(newErrors);
    },
    [setBulkInput, selectedAssetBalance, errors]
  );

  const handleSend = useCallback(async () => {
    if (!selectedChain || !selectedAsset || !address || !isSendEnabled) return;

    handleTransactionStart();
    try {
      const msgs: MsgSend[] =
        activeTab === 'separate'
          ? addresses
              .filter((addr) => addr.address && addr.amount)
              .map(
                (addr) =>
                  new MsgSend(address, addr.address!, [new Coin(selectedAsset, addr.amount!)])
              )
          : bulkInput
              .trim()
              .split('\n')
              .map((line) => {
                const [toAddress, amount] = line.trim().split(/\s+/);
                return new MsgSend(address, toAddress, [new Coin(selectedAsset, amount)]);
              });

      const response = await requestTx(toEncodeObject(msgs));
      const hash =
        typeof response === 'string'
          ? response
          : (response as { transactionHash: string })?.transactionHash;
      if (hash) {
        setTransactionHash(hash);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      // Handle error appropriately
    } finally {
      handleTransactionEnd();
    }
  }, [
    selectedChain,
    selectedAsset,
    address,
    isSendEnabled,
    activeTab,
    addresses,
    bulkInput,
    requestTx,
    handleTransactionStart,
    handleTransactionEnd,
    setTransactionHash,
  ]);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value as 'separate' | 'bulk');
      setErrors({}); // Clear errors on tab change
    },
    [setActiveTab]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
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
        />
      </div>

      <BalanceSummary
        selectedAsset={selectedAsset}
        selectedAssetBalance={selectedAssetBalance}
        totalAmount={totalAmount}
        remainingBalance={remainingBalance}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="separate">Separate Inputs</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Input</TabsTrigger>
        </TabsList>

        <TabsContent value="separate" className="space-y-4">
          {addresses.map((addr, index) => (
            <AddressRow
              key={`${index}-${addr.address}`}
              index={index}
              address={addr.address}
              amount={addr.amount}
              onAddressChange={handleAddressChange}
              onAmountChange={handleAmountChange}
              onRemove={removeRow}
              errors={errors}
              isInputEnabled={!isLoading}
            />
          ))}
          <Button variant="outline" onClick={addNewRow} disabled={isLoading} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </Button>
        </TabsContent>

        <TabsContent value="bulk">
          <BulkInput
            value={bulkInput}
            onChange={handleBulkInputChange}
            errors={errors}
            isInputEnabled={!isLoading}
          />
        </TabsContent>
      </Tabs>

      <Button onClick={handleSend} disabled={!isSendEnabled || isLoading} className="w-full">
        {isLoading ? 'Sending...' : 'Send'}
      </Button>

      {transactionHash && (
        <p className="text-sm text-muted-foreground">Transaction Hash: {transactionHash}</p>
      )}
    </div>
  );
}
