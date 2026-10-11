export const MAX_SOLUTION_SIZE = 10 * 1024 * 1024;

export const validateSolutionFile = (
  file: Pick<File, 'name' | 'size'>,
): string | null => {
  if (!file.size) return 'Выберите непустой файл.';
  if (file.size > MAX_SOLUTION_SIZE) return 'Файл должен быть не больше 10 МБ.';
  if (!/\.(pdf|jpe?g|png|zip|txt|md)$/i.test(file.name))
    return 'Допустимы PDF, JPEG, PNG, ZIP, TXT и Markdown.';
  return null;
};

export const isTaskOpen = (
  task: { status: string; deadlineAt: string | null },
  now = Date.now(),
) => {
  return (
    task.status === 'open' &&
    (!task.deadlineAt || Date.parse(task.deadlineAt) > now)
  );
};
