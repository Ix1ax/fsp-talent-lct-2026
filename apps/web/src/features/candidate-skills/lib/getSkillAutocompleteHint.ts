type SkillAutocompleteHintOptions = {
  name: string;
  selected: boolean;
  focused: boolean;
  loading: boolean;
  hasResults: boolean;
  searchError: string;
  validationError?: string;
};

export const getSkillAutocompleteHint = ({
  name,
  selected,
  focused,
  loading,
  hasResults,
  searchError,
  validationError,
}: SkillAutocompleteHintOptions): string => {
  if (validationError) return validationError;
  if (selected) return 'Навык выбран из справочника. Укажите свой уровень.';
  if (focused && loading) return 'Поиск навыков…';
  if (focused && searchError) return searchError;
  if (name.trim() && !loading && !hasResults)
    return 'Нет в справочнике? Добавьте название — мы проверим новый навык.';
  return 'Введите название или выберите навык из подсказок.';
};
