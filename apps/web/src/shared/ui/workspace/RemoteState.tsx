import { AsyncState } from '../AsyncState';
import { Skeleton } from '../Skeleton';

interface RemoteStateProps {
  loading: boolean;
  error: string;
  retry: () => void;
}
export const RemoteState = ({ loading, error, retry }: RemoteStateProps) => {
  if (loading)
    return (
      <div role="status" aria-label="Загрузка данных" className="grid gap-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  if (error)
    return (
      <AsyncState
        error
        title="Не удалось загрузить данные"
        description={error}
        onRetry={retry}
      />
    );
  return null;
};
