import { type KeyboardEvent, useId, useState } from 'react';

import type { Skill } from '@/entities/catalog';

import { getSkillAutocompleteHint } from '../lib';
import { useSkillSearch } from './useSkillSearch';

type UseSkillAutocompleteOptions = {
  name: string;
  disabled: boolean;
  error?: string;
  onSelect: (skill: Skill) => void;
};

export const useSkillAutocomplete = ({
  name,
  disabled,
  error,
  onSelect,
}: UseSkillAutocompleteOptions) => {
  const [selectedId, setSelectedId] = useState<string>();
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const search = useSkillSearch(selectedId || disabled ? '' : name);
  const open = focused && !disabled && !selectedId && search.items.length > 0;
  const activeSkill = open ? search.items[activeIndex] : undefined;
  const hint = getSkillAutocompleteHint({
    name,
    selected: !!selectedId,
    focused,
    loading: search.loading,
    hasResults: search.items.length > 0,
    searchError: search.error,
    validationError: error,
  });

  const selectSkill = (skill: Skill) => {
    onSelect(skill);
    setSelectedId(skill.id);
    setActiveIndex(-1);
  };
  const onQueryChange = () => {
    setSelectedId(undefined);
    setActiveIndex(-1);
    setFocused(true);
  };
  const reset = () => {
    setSelectedId(undefined);
    setActiveIndex(-1);
    setFocused(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
      return;
    }
    if (
      (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
      search.items.length
    ) {
      event.preventDefault();
      setFocused(true);
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      let index =
        (activeIndex + direction + search.items.length) % search.items.length;
      if (activeIndex < 0) index = direction > 0 ? 0 : search.items.length - 1;
      setActiveIndex(index);
      document
        .getElementById(`${listId}-${search.items[index].id}`)
        ?.scrollIntoView({ block: 'nearest' });
    }
    if (event.key === 'Enter' && activeSkill) {
      event.preventDefault();
      selectSkill(activeSkill);
    }
  };

  return {
    selectedId,
    listId,
    open,
    activeSkill,
    activeIndex,
    hint,
    items: search.items,
    selectSkill,
    onQueryChange,
    onKeyDown,
    reset,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
};
