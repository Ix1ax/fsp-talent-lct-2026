const KB = 1024;
const MB = KB * 1024;

/** Размер файла по-русски: «512 Б», «1 КБ», «2,4 МБ». Мелкий файл — не «0.0 МБ». */
export const formatFileSize = (bytes: number): string => {
  if (bytes < KB) return `${bytes} Б`;
  if (bytes < MB)
    return `${Math.max(1, Math.round(bytes / KB)).toLocaleString('ru-RU')} КБ`;
  return `${(bytes / MB).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ`;
};
