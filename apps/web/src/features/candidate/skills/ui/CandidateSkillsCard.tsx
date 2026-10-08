import { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
} from '@/shared/ui';
import type { CandidateSkill } from '@/entities/candidate';

import { SKILL_LIMIT, useCandidateSkills } from '../model';
import { AddSkillForm } from './AddSkillForm';
import { CandidateSkillItem } from './CandidateSkillItem';

interface CandidateSkillsCardProps {
  skills: CandidateSkill[];
  busy: boolean;
  profileExists: boolean;
  onBusyChange: (busy: boolean) => void;
  onSkillsChange: (skills: CandidateSkill[]) => void;
}
export const CandidateSkillsCard = (props: CandidateSkillsCardProps) => {
  const actions = useCandidateSkills(props);
  const sortedSkills = [...props.skills].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  );
  const [deletingSkill, setDeletingSkill] = useState<CandidateSkill>();
  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>Навыки</CardTitle>
        <CardDescription>
          Добавьте навыки и оцените свой уровень. Подтвердить его можно с
          помощью тестирования.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!props.profileExists && (
          <p className="text-sm text-muted-foreground">
            Сначала создайте профиль, чтобы добавлять навыки.
          </p>
        )}
        <AddSkillForm
          disabled={
            props.busy ||
            !props.profileExists ||
            props.skills.length >= SKILL_LIMIT
          }
          onAdd={actions.add}
        />
        <div className="flex flex-col gap-2">
          <p role="alert" className="min-h-5 text-sm text-destructive">
            {actions.message}
          </p>
          <p className="text-sm text-muted-foreground">
            Добавлено: {props.skills.length} из {SKILL_LIMIT}
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {sortedSkills.map((skill) => (
            <CandidateSkillItem
              key={skill.skillId}
              skill={skill}
              busy={props.busy}
              onLevelChange={(level) => {
                if (level !== skill.claimedLevel)
                  void actions.changeLevel(skill.skillId, level);
              }}
              onDelete={() => setDeletingSkill(skill)}
            />
          ))}
        </ul>
        {props.skills.length === 0 && (
          <p className="text-sm text-muted-foreground">Навыков пока нет.</p>
        )}
      </CardContent>
      {deletingSkill && (
        <ConfirmDeleteDialog
          title={`Удалить навык «${deletingSkill.name}»?`}
          description="Навык и его самооценка будут убраны из вашего списка."
          busy={props.busy}
          onConfirm={() => actions.remove(deletingSkill.skillId)}
          onClose={() => setDeletingSkill(undefined)}
        />
      )}
    </Card>
  );
};
