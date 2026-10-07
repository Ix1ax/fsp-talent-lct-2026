import type { Skill } from '@/entities/catalog';

interface SkillCardProps {
  skill: Skill;
}

export const SkillCard = ({ skill }: SkillCardProps) => {
  return (
    <li className="min-w-0 rounded-lg border border-border bg-card p-4 [overflow-wrap:anywhere]">
      <h3 className="font-medium">{skill.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{skill.code}</p>

      {skill.aliases.length > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Синонимы: {skill.aliases.join(', ')}
        </p>
      )}
    </li>
  );
};
