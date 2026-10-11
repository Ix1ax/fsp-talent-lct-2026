import { RemoteState, Skeleton } from '@/shared/ui';

interface AdminListLoadingProps {
  loading: boolean;
  hasData: boolean;
}
export const AdminListLoading = ({
  loading,
  hasData,
}: AdminListLoadingProps) => {
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-4 top-0 h-0.5 bg-primary transition-opacity duration-200 motion-reduce:transition-none sm:inset-x-6 ${loading ? 'opacity-100' : 'opacity-0'}`}
      />
      {loading && !hasData && (
        <RemoteState
          loading
          loadingLabel="Загрузка списка"
          loadingContent={
            <div className="grid gap-2 py-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          }
        />
      )}
    </>
  );
};
