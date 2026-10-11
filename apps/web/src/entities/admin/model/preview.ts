import type { QuestionKind, QuestionPrompt } from './types';

export type PreviewAnswer = {
  selected?: string[];
  text?: string;
};
export type PreviewQuestion = {
  id: string;
  question_id: string;
  position: number;
  version: number;
  skill_id: string;
  skill_name: string;
  difficulty: number;
  weight: number;
  kind: QuestionKind;
  prompt: QuestionPrompt;
  answer_form: { type: 'choice' | 'text'; multiple: boolean };
  answer: PreviewAnswer | null;
};
export type Preview = {
  id: string;
  template_id: string;
  template_version: number;
  status: 'in_progress' | 'submitted' | 'expired';
  started_at: string;
  expires_at: string;
  server_time: string;
  finished_at: string | null;
  retain_until: string;
  time_limit_sec: number;
  pass_score: number;
  questions: PreviewQuestion[];
  result: {
    score_percent: number;
    pass_score: number;
    passed: boolean;
    correct_count: number;
    unanswered_count: number;
    question_count: number;
    skills: { skill_id: string; percent: number }[];
    questions: {
      id: string;
      correct: boolean;
      answered: boolean;
      correct_answer: {
        type: 'choice' | 'text';
        correct?: string[];
        accepted?: string[];
        multiple: boolean;
        case_sensitive: boolean;
      };
    }[];
  } | null;
};
