import type { Skill } from '@/entities/catalog/model';

interface SkillCardProps {
  skill: Skill;
}

export const SkillCard = ({ skill }: SkillCardProps) => {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-medium">{skill.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{skill.code}</p>

      {skill.aliases.length > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Синонимы: {skill.aliases.join(', ')}
        </p>
      )}
    </li>
  );
};
