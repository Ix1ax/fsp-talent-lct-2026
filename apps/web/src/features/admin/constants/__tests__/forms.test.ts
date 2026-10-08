import { describe, expect, it } from 'vitest';

import {
  accountFormSchema,
  questionContent,
  questionFormSchema,
  type QuestionFormValues,
  templateFormSchema,
} from '../index';

const skill = '11111111-1111-4111-8111-111111111111';
const values: QuestionFormValues = {
  skill_id: skill,
  difficulty: 1,
  kind: 'choice',
  text: 'Вопрос',
  code: '',
  language: '',
  grading: 'choice',
  options: [
    { id: 'a', text: 'Да', correct: true },
    { id: 'b', text: 'Нет', correct: false },
  ],
  multiple: false,
  accepted: '',
  case_sensitive: false,
};
describe('admin forms', () => {
  it('uses UTF-8 bytes and preserves spaces in passwords', () => {
    expect(
      accountFormSchema.safeParse({
        email: 'ADMIN@example.org ',
        password: 'я'.repeat(6),
      }).success,
    ).toBe(true);
    expect(
      accountFormSchema.safeParse({
        email: 'admin@example.org',
        password: 'я'.repeat(37),
      }).success,
    ).toBe(false);
    expect(
      accountFormSchema.parse({
        email: 'ADMIN@example.org ',
        password: ' 1234567890 ',
      }).password,
    ).toBe(' 1234567890 ');
  });
  it('does not accept multiple correct answers for a single-choice question', () => {
    const options = values.options.map((o) => ({ ...o, correct: true }));
    expect(questionFormSchema.safeParse({ ...values, options }).success).toBe(
      false,
    );
    expect(
      questionFormSchema.safeParse({ ...values, options, multiple: true })
        .success,
    ).toBe(true);
  });
  it('omits stale choice and code fields after switching to short answer', () => {
    const input = questionFormSchema.parse({
      ...values,
      kind: 'short_answer',
      grading: 'text',
      code: 'old code',
      language: 'js',
      accepted: ' const \n let ',
    });
    expect(questionContent(input)).toEqual({
      prompt: { text: 'Вопрос' },
      grading_spec: {
        type: 'text',
        accepted: ['const', 'let'],
        case_sensitive: false,
      },
    });
  });
  it('requires code for code-reading questions and permits both grading types', () => {
    expect(
      questionFormSchema.safeParse({ ...values, kind: 'code_reading' }).success,
    ).toBe(false);
    expect(
      questionFormSchema.safeParse({
        ...values,
        kind: 'code_reading',
        code: 'console.log(2)',
      }).success,
    ).toBe(true);
    expect(
      questionFormSchema.safeParse({
        ...values,
        kind: 'code_reading',
        code: 'console.log(2)',
        grading: 'text',
        accepted: '2',
      }).success,
    ).toBe(true);
  });
  it('requires the stack in blueprint, unique pairs and explicit valid weights', () => {
    const template = {
      stack_skill_id: skill,
      specialization_id: 1,
      grade_id: 1,
      time_limit_sec: 300,
      pass_score: 70,
      blueprint: [
        { skill_id: skill, difficulty: 1, question_count: 5, weight: 1 },
      ],
    };
    expect(templateFormSchema.safeParse(template).success).toBe(true);
    expect(
      templateFormSchema.safeParse({
        ...template,
        blueprint: [...template.blueprint, ...template.blueprint],
      }).success,
    ).toBe(false);
    expect(
      templateFormSchema.safeParse({
        ...template,
        stack_skill_id: '22222222-2222-4222-8222-222222222222',
      }).success,
    ).toBe(false);
    expect(
      templateFormSchema.safeParse({
        ...template,
        blueprint: [{ ...template.blueprint[0], weight: 0.001 }],
      }).success,
    ).toBe(false);
    expect(
      templateFormSchema.safeParse({ ...template, specialization_id: '1' })
        .success,
    ).toBe(false);
  });
});
