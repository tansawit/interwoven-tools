import { useState, useMemo, useCallback } from 'react';
import { AddressAmount } from '@/lib/types';

export function useAddressInput() {
  const [addresses, setAddresses] = useState<AddressAmount[]>([{ address: '', amount: '' }]);
  const [bulkInput, setBulkInput] = useState('');
  const [activeTab, setActiveTab] = useState<'separate' | 'bulk'>('separate');

  const addNewRow = useCallback(() => {
    setAddresses((prev) => [...prev, { address: '', amount: '' }]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setAddresses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAddress = useCallback((index: number, value: string) => {
    setAddresses((prev) =>
      prev.map((addr, i) => (i === index ? { ...addr, address: value } : addr))
    );
  }, []);

  const updateAmount = useCallback((index: number, value: string) => {
    setAddresses((prev) =>
      prev.map((addr, i) => (i === index ? { ...addr, amount: value } : addr))
    );
  }, []);

  const parseBulkInput = useCallback((input: string) => {
    return input.split('\n').reduce((sum, line) => {
      const match = line.match(/.*?\s+(\d*\.?\d*)$/);
      return sum + (match ? Number.parseFloat(match[1]) || 0 : 0);
    }, 0);
  }, []);

  const totalAmount = useMemo(() => {
    if (activeTab === 'bulk') {
      return parseBulkInput(bulkInput).toFixed(2);
    }
    return addresses
      .reduce((sum, addr) => {
        const amount = Number.parseFloat(addr.amount) || 0;
        return sum + amount;
      }, 0)
      .toFixed(2);
  }, [addresses, bulkInput, activeTab, parseBulkInput]);

  return {
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
  };
}
