export const getAdminPasswordIssue = (password: string): string | null => {
  if (!password) return 'Введите пароль';
  const length = new TextEncoder().encode(password).length;
  if (length < 12) return 'Пароль слишком короткий. Добавьте ещё символы.';
  if (length > 72) return 'Пароль слишком длинный. Уберите несколько символов.';
  return null;
};
