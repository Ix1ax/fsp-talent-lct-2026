import type { Transition } from 'framer-motion';

export const MOTION_TRANSITION: Transition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
};

export const MOTION_SPRING = { stiffness: 120, damping: 30, restDelta: 0.001 };

export const MOTION_LAYOUT_IDS = {
  ADMIN_SIDEBAR_ACTIVE: 'admin-sidebar-active',
  ADMIN_CATALOG_KIND: 'admin-catalog-kind',
} as const;
