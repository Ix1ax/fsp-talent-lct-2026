type GalleryOffsetOptions = {
  progress: number;
  speed: number;
  direction: number;
};

export const getGalleryOffset = ({
  progress,
  speed,
  direction,
}: GalleryOffsetOptions) => {
  const scrollOffset = (progress - 0.5) * 100;
  const velocityOffset = Math.max(-30, Math.min(30, speed / 100));

  return direction * (scrollOffset + velocityOffset);
};
