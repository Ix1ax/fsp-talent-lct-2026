import { STATIC_ROUTES } from '@/shared/contants';

type CallbackErrorProps = {
  message: string;
};

export const CallbackError = ({ message }: CallbackErrorProps) => (
  <main className="flex min-h-screen items-center justify-center p-6">
    <div className="max-w-sm space-y-2 text-center">
      <p className="text-lg font-semibold text-destructive">Ошибка входа</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <a href={STATIC_ROUTES.LOGIN} className="text-sm underline">
        Попробовать снова
      </a>
    </div>
  </main>
);
