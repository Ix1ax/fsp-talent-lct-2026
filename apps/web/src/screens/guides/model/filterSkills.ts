import type { Skill } from '@/entities/catalog';

const normalize = (value: string) => value.trim().toLocaleLowerCase('ru');

/** Поиск навыка в браузере по названию, коду и синонимам — список статичен (ISR). */
export const filterSkills = (skills: Skill[], q?: string): Skill[] => {
  const needle = q ? normalize(q) : '';
  if (!needle) return skills;
  return skills.filter((skill) =>
    [skill.name, skill.code, ...skill.aliases].some((value) =>
      normalize(value).includes(needle),
    ),
  );
};
