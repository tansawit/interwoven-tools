import { cn } from '@/lib/utils';

interface BalanceSummaryProps {
  selectedAsset: string;
  selectedAssetBalance: string;
  totalAmount: string;
  remainingBalance: string;
}

export function BalanceSummary({
  selectedAsset,
  selectedAssetBalance,
  totalAmount,
  remainingBalance,
}: BalanceSummaryProps) {
  if (!selectedAsset) return null;

  return (
    <div className="mt-6 space-y-2 p-4 border rounded-lg bg-muted/50">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Current Balance:</span>
        <span className="font-medium">
          {selectedAssetBalance} {selectedAsset}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Total Amount:</span>
        <span className="font-medium">
          {totalAmount} {selectedAsset}
        </span>
      </div>
      <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
        <span className="text-muted-foreground">Remaining Balance:</span>
        <span
          className={cn(
            'font-medium',
            Number.parseFloat(remainingBalance) < 0 ? 'text-destructive' : ''
          )}
        >
          {remainingBalance} {selectedAsset}
        </span>
      </div>
    </div>
  );
}
