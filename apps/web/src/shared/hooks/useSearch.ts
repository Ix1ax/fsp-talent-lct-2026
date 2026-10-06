'use client';

import { useCallback, useState } from 'react';

import { useDebounce } from './useDebounce';

export const useSearch = (
  defaultSearch = '',
  onChange: (search: string) => void,
  delay = 400,
) => {
  const [value, setValue] = useState(defaultSearch);
  const [search, setSearch] = useState(defaultSearch);

  const handleChange = useCallback(
    (nextSearch: string) => {
      setSearch(nextSearch);
      onChange(nextSearch);
    },
    [onChange],
  );

  const { debounce, cancel } = useDebounce(handleChange, delay);

  const onSearch = useCallback(
    (nextValue: string) => {
      setValue(nextValue);
      debounce(nextValue);
    },
    [debounce],
  );

  const searchNow = useCallback(
    (nextValue: string) => {
      cancel();
      setValue(nextValue);
      handleChange(nextValue);
    },
    [cancel, handleChange],
  );

  return { search, value, onSearch, setValue, cancel, searchNow };
};
