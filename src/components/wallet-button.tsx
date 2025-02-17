'use client';

import { memo, useCallback } from 'react';
import { useAddress, useWallet } from '@initia/react-wallet-widget';
import { Button } from '@/components/ui/button';

const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-6)}`;

const ConnectButton = memo(({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    onClick={onClick}
    className="h-16 w-[200px] rounded-none border-l border-border/50 hover:bg-accent font-medium"
  >
    Connect Wallet
  </Button>
));

ConnectButton.displayName = 'ConnectButton';

const ViewButton = memo(({ onClick, address }: { onClick: () => void; address: string }) => (
  <Button
    variant="ghost"
    onClick={onClick}
    className="h-16 w-[200px] rounded-none border-l border-border/50 hover:bg-accent font-medium flex items-center justify-center"
  >
    <span className="font-medium text-primary">{truncateAddress(address)}</span>
  </Button>
));

ViewButton.displayName = 'ViewButton';

export const WalletButton = memo(() => {
  const address = useAddress();
  const { onboard, view } = useWallet();

  const handleOnboard = useCallback(() => {
    onboard();
  }, [onboard]);

  const handleView = useCallback(() => {
    view();
  }, [view]);

  if (!address) {
    return <ConnectButton onClick={handleOnboard} />;
  }

  return <ViewButton onClick={handleView} address={address} />;
});

WalletButton.displayName = 'WalletButton';
