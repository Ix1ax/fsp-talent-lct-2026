import { LoadingText } from '@/shared/ui';

export const CallbackLoading = () => {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <LoadingText text="Завершение входа…" />
    </main>
  );
};
