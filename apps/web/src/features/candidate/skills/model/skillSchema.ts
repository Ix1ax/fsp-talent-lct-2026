import { z } from 'zod';

export const skillSchema = z.object({
  name: z.string().trim().min(1, 'Введите название навыка.'),
  claimedLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export const SKILL_LEVELS = [1, 2, 3, 4, 5] as const;
export const SKILL_LIMIT = 50;
