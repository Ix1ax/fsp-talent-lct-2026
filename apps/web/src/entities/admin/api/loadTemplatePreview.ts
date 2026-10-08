import type {
  PreviewQuestion,
  Shortage,
  Template,
  TemplatePreview,
} from '../model';
import { adminRequest, adminSchemas, queryString } from './index';

export const loadTemplatePreview = async (
  token: string,
  template: Template,
  signal: AbortSignal,
): Promise<TemplatePreview> => {
  const questions: PreviewQuestion[] = [];
  const shortages: Shortage[] = [];
  if (!template.blueprint?.length)
    throw new Error('У шаблона отсутствует состав теста');
  for (const row of template.blueprint) {
    let found = 0;
    for (
      let offset = 0;
      offset <= 10000 && found < row.question_count;
      offset += 100
    ) {
      const page = await adminRequest(
        token,
        `/assessments/questions?${queryString({ skill_id: row.skill_id, difficulty: row.difficulty, active: 'true', status: 'published', limit: 100, offset })}`,
        adminSchemas.questions,
        { signal },
      );
      // A preview reads the bank; it never creates a candidate attempt.
      for (const candidate of page.items) {
        if (found >= row.question_count) break;
        const question = await adminRequest(
          token,
          `/assessments/questions/${candidate.id}`,
          adminSchemas.question,
          { signal },
        );
        const version = question.versions?.find(
          (v) =>
            v.version === question.published_version &&
            v.status === 'published',
        );
        if (
          !question.active ||
          question.skill_id !== row.skill_id ||
          question.difficulty !== row.difficulty ||
          !version
        )
          continue;
        questions.push({
          id: question.id,
          skillName: question.skill_name,
          difficulty: question.difficulty,
          weight: row.weight,
          version,
        });
        found++;
      }
      if (page.items.length < 100) break;
    }
    if (found < row.question_count)
      shortages.push({
        skill_id: row.skill_id,
        difficulty: row.difficulty,
        required: row.question_count,
        available: found,
      });
  }
  return { questions, shortages };
};
