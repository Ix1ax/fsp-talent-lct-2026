import type { CompanyFilePurpose } from '@/entities/company';

export const validateCompanyFile = async (
  file: File,
  purpose: CompanyFilePurpose,
) => {
  const isLogo = purpose === 'company_logo';
  const types = isLogo
    ? ['image/jpeg', 'image/png']
    : ['application/pdf', 'image/jpeg', 'image/png'];
  if (!types.includes(file.type))
    throw new Error(
      isLogo ? 'Выберите логотип JPEG или PNG.' : 'Выберите PDF, JPEG или PNG.',
    );
  const max = (isLogo ? 2 : 10) * 1024 * 1024;
  if (!file.size || file.size > max)
    throw new Error(
      `Размер файла должен быть от 1 байта до ${isLogo ? 2 : 10} МБ.`,
    );
  if (file.type.startsWith('image/')) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(
        'Не удалось прочитать изображение. Выберите другой файл.',
      );
    }
    const pixels = bitmap.width * bitmap.height;
    bitmap.close();
    if (pixels > 4_000_000)
      throw new Error(
        'Изображение должно содержать не более 4 миллионов пикселей.',
      );
  }
};
