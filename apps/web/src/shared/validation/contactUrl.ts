import { z } from 'zod';

export const contactUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return (
        ['https:', 'http:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        new TextEncoder().encode(value).length <= 2048
      );
    } catch {
      return false;
    }
  }, 'Укажите HTTP(S)-ссылку без логина и пароля');
