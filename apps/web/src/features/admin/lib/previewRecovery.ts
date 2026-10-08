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
    /* Ignore corrupt storage. */
  }
  // Explicit URLs must be read, never silently replaced with a fresh start.
  return { ...recovery, id: urlId ?? recovery.id };
};
