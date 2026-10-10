// Цвета бренда ФСП и тёплый акцент: салют на светлой и тёмной теме.
const COLORS = ['#402fff', '#ec1d35', '#7b6dff', '#ffc21a', '#13b07a'];

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  round: boolean;
};

const GRAVITY = 0.32;
const DRAG = 0.985;
const DURATION_MS = 2600;

const burst = (originX: number, originY: number, angle: number, count = 70) =>
  Array.from({ length: count }, (): Piece => {
    const spread = (Math.random() - 0.5) * (Math.PI / 2.2);
    const speed = 9 + Math.random() * 9;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle + spread) * speed,
      vy: Math.sin(angle + spread) * speed,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.3,
    };
  });

/**
 * Салют из двух нижних углов экрана. Без зависимостей: один canvas поверх
 * страницы, удаляется сам. При «уменьшении движения» ничего не делает.
 */
export const launchConfetti = () => {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '100',
  });
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return;
  }
  context.scale(ratio, ratio);

  const pieces = [
    ...burst(0, height, -Math.PI / 3),
    ...burst(width, height, (-2 * Math.PI) / 3),
  ];
  const start = performance.now();

  const frame = (now: number) => {
    const elapsed = now - start;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 1800) / 800);

    for (const piece of pieces) {
      piece.vx *= DRAG;
      piece.vy = piece.vy * DRAG + GRAVITY;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rotation += piece.spin;

      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      if (piece.round) {
        context.beginPath();
        context.arc(0, 0, piece.size / 2.4, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(
          -piece.size / 2,
          -piece.size / 4,
          piece.size,
          piece.size / 2,
        );
      }
      context.restore();
    }

    if (elapsed < DURATION_MS) requestAnimationFrame(frame);
    else canvas.remove();
  };

  requestAnimationFrame(frame);
};
