import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { searchCatalogSkills, type Skill } from '@/entities/catalog';

export type NeedSkillLoader = (
  q: string,
  signal?: AbortSignal,
) => Promise<Skill[]>;
export const loadNeedSkills: NeedSkillLoader = async (q, signal) =>
  (await searchCatalogSkills(q, 50, 0, signal)).items;
type Result = {
  load: NeedSkillLoader;
  query: string;
  revision: number;
  items: Skill[];
  known: Skill[];
  error: string;
};
export const useNeedSkills = (
  load: NeedSkillLoader,
  query: string,
  selectedIds: readonly string[],
) => {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        void load(query, controller.signal).then(
          (items) => {
            if (controller.signal.aborted) return;
            setResult((previous) => {
              const known = new Map(
                (previous?.load === load ? previous.known : []).map((skill) => [
                  skill.id,
                  skill,
                ]),
              );
              for (const skill of items) known.set(skill.id, skill);
              return {
                load,
                query,
                revision,
                items,
                known: [...known.values()],
                error: '',
              };
            });
          },
          (error: unknown) => {
            if (!controller.signal.aborted)
              setResult((previous) => ({
                load,
                query,
                revision,
                items: [],
                known: previous?.load === load ? previous.known : [],
                error: getApiErrorMessage(error),
              }));
          },
        );
      },
      query ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, query, revision]);
  const current =
    result?.load === load &&
    result.query === query &&
    result.revision === revision
      ? result
      : null;
  const known = result?.load === load ? result.known : [];
  // Saved IDs remain visible even when the public API cannot resolve their names by ID.
  const skills = new Map(known.map((skill) => [skill.id, skill]));
  for (const id of selectedIds)
    if (!skills.has(id))
      skills.set(id, { id, code: id, name: `Навык ${id}`, aliases: [] });
  return {
    skills: [...skills.values()],
    items: current?.items ?? [],
    loading: !current,
    error: current?.error ?? '',
    retry: () => setRevision((value) => value + 1),
  };
};
