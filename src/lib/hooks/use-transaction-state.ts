import { useState, useCallback } from 'react';

interface TransactionState {
  isLoading: boolean;
  transactionHash: string | null;
  setTransactionHash: (hash: string) => void;
  handleTransactionStart: () => void;
  handleTransactionEnd: () => void;
}

export function useTransactionState(): TransactionState {
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const handleTransactionStart = useCallback(() => {
    setIsLoading(true);
    setTransactionHash(null);
  }, []);

  const handleTransactionEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    transactionHash,
    setTransactionHash,
    handleTransactionStart,
    handleTransactionEnd,
  };
}
