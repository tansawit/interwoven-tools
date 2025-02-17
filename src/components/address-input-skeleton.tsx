import { Skeleton } from '@/components/ui/skeleton';

export function AddressInputSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
