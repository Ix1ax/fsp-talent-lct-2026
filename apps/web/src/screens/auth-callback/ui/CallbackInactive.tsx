export const CallbackInactive = () => {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm space-y-2 text-center">
        <p className="text-lg font-semibold">Аккаунт заблокирован</p>
        <p className="text-sm text-muted-foreground">
          Ваша учётная запись деактивирована. Обратитесь к администратору.
        </p>
      </div>
    </main>
  );
};
