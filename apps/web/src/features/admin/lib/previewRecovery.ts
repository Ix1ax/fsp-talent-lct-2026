import { z } from 'zod';

const recoverySchema = z.object({
  id: z.uuid().optional(),
  key: z.uuid().optional(),
});
export const getPreviewRecovery = (
  saved: string | null,
  urlId: string | null,
) => {
  let recovery: { id?: string; key?: string } = {};
  try {
    const parsed = recoverySchema.safeParse(JSON.parse(saved ?? '{}'));
    if (parsed.success) recovery = parsed.data;
  } catch {
    recovery = {};
  }

  return { ...recovery, id: urlId ?? recovery.id };
};
