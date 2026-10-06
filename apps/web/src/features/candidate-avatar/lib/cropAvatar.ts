type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const getRotatedImageSize = (
  width: number,
  height: number,
  rotation: number,
) => {
  const radians = (rotation * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(radians) * width) +
      Math.abs(Math.sin(radians) * height),
    height:
      Math.abs(Math.sin(radians) * width) +
      Math.abs(Math.cos(radians) * height),
  };
};

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('Не удалось прочитать фото. Выберите другой файл.'));
    image.src = url;
  });

export const cropAvatar = async (
  file: File,
  area: CropArea,
  rotation: number,
): Promise<File> => {
  if (
    ![area.x, area.y, area.width, area.height, rotation].every(
      Number.isFinite,
    ) ||
    area.width <= 0 ||
    area.height <= 0 ||
    area.x < 0 ||
    area.y < 0
  ) {
    throw new Error('Выберите область фото для обрезки.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const bounds = getRotatedImageSize(
      image.naturalWidth,
      image.naturalHeight,
      rotation,
    );
    const canvas = document.createElement('canvas');
    const size = Math.max(
      1,
      Math.min(512, Math.floor(Math.min(area.width, area.height))),
    );

    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');

    if (!context) throw new Error('Браузер не поддерживает обработку фото.');

    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

    if (type === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.scale(size / area.width, size / area.height);
    context.translate(-area.x, -area.y);
    context.translate(bounds.width / 2, bounds.height / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new Error('Не удалось обработать фото. Попробуйте ещё раз.'),
              ),
        type,
        0.9,
      ),
    );

    const extension = type === 'image/png' ? 'png' : 'jpg';

    return new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, '')}-avatar.${extension}`,
      { type },
    );
  } finally {
    URL.revokeObjectURL(url);
  }
};
