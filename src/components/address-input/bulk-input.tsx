'use client';

import { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface BulkInputProps {
  value: string;
  onChange: (value: string) => void;
  errors: { [key: string]: string };
  isInputEnabled: boolean;
}

export const BulkInput = memo(function BulkInput({
  value,
  onChange,
  errors,
  isInputEnabled,
}: BulkInputProps) {
  return (
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
  );
});
