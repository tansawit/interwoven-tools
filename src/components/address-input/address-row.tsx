'use client';

import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressRowProps {
  index: number;
  address: string;
  amount: string;
  onAddressChange: (index: number, value: string) => void;
  onAmountChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  errors: { [key: string]: string };
  isInputEnabled: boolean;
}

export const AddressRow = memo(function AddressRow({
  index,
  address,
  amount,
  onAddressChange,
  onAmountChange,
  onRemove,
  errors,
  isInputEnabled,
}: AddressRowProps) {
  return (
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
  );
});
