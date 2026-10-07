import { useRef, useState } from 'react';

import { ensureClientAccessToken } from '@/shared/api';
import { toast } from '@/shared/ui';
import {
  addCandidateSkill,
  type CandidateSkill,
  type ClaimedLevel,
  deleteCandidateSkill,
  saveCandidateSkill,
} from '@/entities/candidate-skill';

import { getSkillErrorMessage, upsertCandidateSkill } from '../lib';

type Options = {
  skills: CandidateSkill[];
  busy: boolean;
  profileExists: boolean;
  onBusyChange: (busy: boolean) => void;
  onSkillsChange: (skills: CandidateSkill[]) => void;
};

export const useCandidateSkills = (options: Options) => {
  const mutating = useRef(false);
  const [message, setMessage] = useState('');
  const mutate = async (
    action: () => Promise<CandidateSkill[]>,
    success: string,
  ) => {
    if (options.busy || mutating.current || !options.profileExists)
      return false;
    mutating.current = true;
    options.onBusyChange(true);
    setMessage('');
    try {
      await ensureClientAccessToken();
      const next = await action();
      options.onSkillsChange(next);
      toast.success(success);
      return true;
    } catch (error) {
      const text = getSkillErrorMessage(error);
      setMessage(text);
      toast.error(text);
      return false;
    } finally {
      mutating.current = false;
      options.onBusyChange(false);
    }
  };
  const add = (name: string, claimedLevel: ClaimedLevel, skillId?: string) =>
    mutate(async () => {
      const next = skillId
        ? await saveCandidateSkill(skillId, { claimedLevel })
        : await addCandidateSkill({ name, claimedLevel });
      return upsertCandidateSkill(options.skills, next);
    }, 'Навык сохранён.');
  const changeLevel = (skillId: string, claimedLevel: ClaimedLevel) =>
    mutate(async () => {
      const current = options.skills.find((skill) => skill.skillId === skillId);
      const next =
        current?.moderationStatus === 'pending'
          ? await addCandidateSkill({ name: current.name, claimedLevel })
          : await saveCandidateSkill(skillId, { claimedLevel });
      return upsertCandidateSkill(options.skills, next);
    }, 'Самооценка обновлена.');
  const remove = (skillId: string) =>
    mutate(async () => {
      await deleteCandidateSkill(skillId);
      return options.skills.filter((skill) => skill.skillId !== skillId);
    }, 'Навык удалён.');

  return { add, changeLevel, remove, message };
};
