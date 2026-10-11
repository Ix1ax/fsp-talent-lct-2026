import { ApiError } from '@/shared/api';
import {
  addCandidateSkill,
  type CandidateSkill,
  getCandidateSkills,
  saveCandidateSkill,
} from '@/entities/candidate';

import { sameResumeSkill } from '../lib';
import { type AppliedResume, useResumeRecords } from '../model';
import { ResumeSkillForm } from './ResumeSkillForm';

interface ResumeSkillDraftsProps {
  resume: AppliedResume;
  profileExists: boolean;
  processing: boolean;
  skills: CandidateSkill[];
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSkillsChange: (skills: CandidateSkill[]) => void;
  onSaved: () => void;
}

export const ResumeSkillDrafts = (props: ResumeSkillDraftsProps) => {
  const actions = useResumeRecords(props);
  if (!props.resume.result.draft.skills.length) return null;
  return (
    <section aria-label="Навыки из резюме" className="mb-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Навыки из резюме</h2>
      {!props.profileExists && (
        <p>Сначала создайте профиль. Черновики навыков остаются здесь.</p>
      )}
      {!props.processing && (
        <p>Для сохранения навыков нужно согласие на обработку данных.</p>
      )}
      {props.resume.result.draft.skills.map((skill, index) => {
        const status = actions.statuses[index];
        if (status?.dismissed) return null;
        if (status?.savedId)
          return (
            <p key={index} role="status">
              Навык {index + 1} сохранён. Повторно добавляться не будет.
            </p>
          );
        if (props.skills.some((current) => sameResumeSkill(current, skill)))
          return (
            <p key={index} className="text-sm">
              «{skill.name}» уже есть в профиле. Самооценка сохранена.
            </p>
          );
        return (
          <ResumeSkillForm
            key={index}
            skill={skill}
            disabled={props.busy || !props.profileExists || !props.processing}
            error={status?.error}
            onDismiss={() => actions.dismiss(index)}
            onSave={(name, claimedLevel) =>
              actions.save(index, async () => {
                const current = await getCandidateSkills();
                const existing = current.items.find((record) =>
                  sameResumeSkill(record, {
                    name,
                    skillId:
                      name.trim() === skill.name.trim() ? skill.skillId : null,
                  }),
                );
                // A resolved catalog skill is written by ID. Existing skills are retained.
                if (existing) return { id: existing.skillId };
                if (current.items.length >= 50)
                  throw new ApiError(409, 'Limit reached', 'limit_reached');
                const next =
                  skill.skillId && name.trim() === skill.name.trim()
                    ? await saveCandidateSkill(skill.skillId, { claimedLevel })
                    : await addCandidateSkill({
                        name: name.trim(),
                        claimedLevel,
                      });
                props.onSkillsChange([...current.items, next]);
                return { id: next.skillId };
              })
            }
          />
        );
      })}
    </section>
  );
};
