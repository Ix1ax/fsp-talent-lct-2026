import { ApiError } from '@/shared/api/errors';
import type { CandidateSkill } from '@/entities/candidate-skill';

export const upsertCandidateSkill = (
  skills: CandidateSkill[],
  next: CandidateSkill,
) =>
  [...skills.filter((skill) => skill.skillId !== next.skillId), next].sort(
    (a, b) => a.name.localeCompare(b.name, 'ru'),
  );

export const getSkillErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 400) return error.message;
    if (error.status === 404)
      return 'Профиль или навык не найден. Обновите страницу.';
    if (error.status === 401) return 'Сессия истекла. Войдите снова.';
    if (error.status === 403)
      return 'Изменение навыков недоступно для вашего аккаунта.';
  }
  return 'Не удалось изменить навыки. Попробуйте ещё раз.';
};
