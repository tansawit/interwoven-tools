'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/error-boundary';
import { AddressInputSkeleton } from '@/components/address-input-skeleton';
import { PageLayout } from '@/components/page-layout';

const AddressInput = dynamic(() => import('@/components/address-input'), {
  ssr: false,
  loading: () => <AddressInputSkeleton />,
});

export default function MultisendPage() {
  return (
    <PageLayout
      title="Multisend"
      description="Send tokens to multiple addresses in a single transaction"
    >
      <ErrorBoundary fallback={<div>Something went wrong. Please try again later.</div>}>
        <AddressInput />
      </ErrorBoundary>
    </PageLayout>
  );
}
