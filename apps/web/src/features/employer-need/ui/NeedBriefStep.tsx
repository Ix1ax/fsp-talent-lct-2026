import { Input } from '@/shared/ui';
import { type Catalogs } from '@/entities/catalog';

import { useNeedFlowEditor } from '../model';
import { BriefPhrase } from './BriefPhrase';
import { NeedAdvancedFields } from './NeedAdvancedFields';
import { NeedFlowFieldError } from './NeedFlowFieldError';

interface NeedBriefStepProps {
  editor: ReturnType<typeof useNeedFlowEditor>;
  catalogs: Catalogs;
  readonly: boolean | undefined;
  pending: boolean;
}
export const NeedBriefStep = ({
  editor,
  catalogs,
  readonly,
  pending,
}: NeedBriefStepProps) => {
  const { value, errors, change, skills, skillSearch, q, setQ } = editor;
  return (
    <>
      <label className="grid gap-2 text-sm font-medium">
        Название потребности *
        <Input
          value={value.title}
          maxLength={200}
          onChange={(e) => change({ title: e.target.value })}
          aria-invalid={!!errors.title}
          placeholder="Например, Frontend-разработчик в команду платформы"
        />
        <NeedFlowFieldError errors={errors} name="title" />
      </label>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Кого ищем</p>
        <BriefPhrase
          value={value}
          onChange={(next) => change(next)}
          catalogs={catalogs}
          skills={skills}
          searchItems={skillSearch.items}
          skillQuery={q}
          onSkillQuery={setQ}
          skillsLoading={skillSearch.loading}
          skillsError={skillSearch.error}
          onRetrySkills={skillSearch.retry}
          catalogsUnavailable={false}
          disabled={readonly || pending}
          errors={errors}
        />
        <NeedFlowFieldError errors={errors} name="specializationId" />
        <NeedFlowFieldError errors={errors} name="gradeId" />
        <NeedFlowFieldError errors={errors} name="workFormatIds" />
        <NeedFlowFieldError errors={errors} name="skills" />
      </div>
      <NeedAdvancedFields
        skillsOnly
        value={value}
        skills={skills}
        errors={errors}
        change={(patch) => {
          if (patch.skills) change({ skills: patch.skills });
        }}
      />
    </>
  );
};
