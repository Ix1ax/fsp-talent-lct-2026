import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
} from '@/shared/ui';
import type { CandidateSkill, ClaimedLevel } from '@/entities/candidate-skill';

import { SKILL_LIMIT } from '../constants';
import { useCandidateSkills } from '../model';
import { AddSkillForm } from './AddSkillForm';
import { SkillLevelSelect } from './SkillLevelSelect';

interface CandidateSkillsCardProps {
  skills: CandidateSkill[];
  busy: boolean;
  profileExists: boolean;
  onBusyChange: (busy: boolean) => void;
  onSkillsChange: (skills: CandidateSkill[]) => void;
}
export const CandidateSkillsCard = (props: CandidateSkillsCardProps) => {
  const actions = useCandidateSkills(props);
  const [deletingSkill, setDeletingSkill] = useState<CandidateSkill>();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Навыки</CardTitle>
        <CardDescription>
          Самооценка и подтверждение навыков. Работодателям навыки пока не
          видны.
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
        {actions.message && (
          <p role="alert" className="text-sm text-destructive">
            {actions.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Добавлено: {props.skills.length} из {SKILL_LIMIT}
        </p>
        <ul className="flex flex-col gap-3">
          {props.skills.map((skill) => (
            <li
              key={skill.skillId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <p className="font-medium">{skill.name}</p>
                {skill.moderationStatus === 'pending' && (
                  <Badge variant="outline">На модерации</Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  Источник: {skill.source}. Вес подтверждения:{' '}
                  {skill.confidence}
                </p>
              </div>
              <SkillLevelSelect
                value={skill.claimedLevel}
                label={`Самооценка: ${skill.name}`}
                disabled={
                  props.busy ||
                  !['approved', 'pending'].includes(skill.moderationStatus)
                }
                onChange={(level: ClaimedLevel) => {
                  if (level !== skill.claimedLevel)
                    void actions.changeLevel(skill.skillId, level);
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={props.busy}
                aria-label={`Удалить навык ${skill.name}`}
                onClick={() => setDeletingSkill(skill)}
              >
                Удалить
              </Button>
            </li>
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
import { useState } from 'react';
