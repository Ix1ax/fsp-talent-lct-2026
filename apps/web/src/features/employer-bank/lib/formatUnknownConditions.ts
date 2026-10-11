type SkillRef = { id: string; name: string };

const SKILL_PREFIX = 'skill:';

/**
 * «Кандидат не указал: …» по-человечески. Бэк присылает навыки как
 * `skill:<id>` — подставляем названия и собираем их в одну группу.
 */
export const formatUnknownConditions = (
  conditions: string[],
  labels: Record<string, string>,
  skills: SkillRef[] = [],
): string => {
  const names: string[] = [];
  const skillNames: string[] = [];
  for (const condition of conditions) {
    if (condition.startsWith(SKILL_PREFIX)) {
      const id = condition.slice(SKILL_PREFIX.length);
      const name = skills.find((skill) => skill.id === id)?.name;
      if (name && !skillNames.includes(name)) skillNames.push(name);
      continue;
    }
    names.push((labels[condition] ?? condition).toLowerCase());
  }
  if (skillNames.length) names.push(`навыки: ${skillNames.join(', ')}`);
  else if (conditions.some((c) => c.startsWith(SKILL_PREFIX)))
    names.push('часть навыков');
  return names.join(', ');
};
