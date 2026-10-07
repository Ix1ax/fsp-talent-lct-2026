import { clientApi } from '@/shared/api/client';

import type { CandidateSkill, CandidateSkills, ClaimedLevel } from '../model';

export type AddCandidateSkillInput = {
  name: string;
  claimedLevel: ClaimedLevel;
};

export type SaveCandidateSkillInput = {
  claimedLevel: ClaimedLevel;
};

export const getCandidateSkills = async (): Promise<CandidateSkills> => {
  const { data } = await clientApi.get<CandidateSkills>('/v1/me/skills');
  return data;
};

export const addCandidateSkill = async (
  input: AddCandidateSkillInput,
): Promise<CandidateSkill> => {
  const { data } = await clientApi.post<CandidateSkill>('/v1/me/skills', input);
  return data;
};

export const saveCandidateSkill = async (
  skillId: string,
  input: SaveCandidateSkillInput,
): Promise<CandidateSkill> => {
  const { data } = await clientApi.put<CandidateSkill>(
    `/v1/me/skills/${encodeURIComponent(skillId)}`,
    input,
  );

  return data;
};

export const deleteCandidateSkill = async (skillId: string): Promise<void> => {
  await clientApi.delete(`/v1/me/skills/${encodeURIComponent(skillId)}`);
};
