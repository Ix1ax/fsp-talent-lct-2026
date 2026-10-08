import { animate } from 'framer-motion';

export const fadeProfileTransition = (
  element: HTMLElement | null,
  visible: boolean,
  onComplete?: () => void,
) => {
  const reset = () => {
    if (element) element.style.opacity = '';
  };
  if (
    !element ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    reset();
    onComplete?.();
    return reset;
  }
  const animation = animate(
    element,
    { opacity: visible ? 1 : 0 },
    {
      duration: visible ? 0.16 : 0.1,
      ease: 'easeOut',
      onComplete: () => {
        if (visible) reset();
        onComplete?.();
      },
    },
  );
  return () => {
    animation.stop();
    reset();
  };
};
