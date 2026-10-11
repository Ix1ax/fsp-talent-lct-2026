export const getNeedValidationStep = (
  errors: Record<string, string>,
): number => {
  if (
    [
      'title',
      'specializationId',
      'gradeId',
      'skills',
      'workFormatIds',
      'salaryFromRub',
      'salaryToRub',
    ].some((field) => errors[field])
  ) {
    return 0;
  }

  if (['description', 'city', 'timezone'].some((field) => errors[field])) {
    return 1;
  }

  return 2;
};
