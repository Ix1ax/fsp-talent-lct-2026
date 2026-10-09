import { type ReactNode, useLayoutEffect, useRef } from 'react';

import { cn } from '@/shared/lib/utils';

interface AdminListViewportProps {
  loading: boolean;
  children: ReactNode;
  className?: string;
}

export const AdminListViewport = ({
  loading,
  children,
  className,
}: AdminListViewportProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const height = useRef(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (loading) {
      element.style.minHeight = `${height.current}px`;
      return;
    }
    element.style.minHeight = '';
    const observer = new ResizeObserver(() => {
      height.current = Math.max(
        height.current,
        element.getBoundingClientRect().height,
      );
    });
    height.current = element.getBoundingClientRect().height;
    observer.observe(element);

    return () => observer.disconnect();
  }, [loading]);

  return (
    <div ref={ref} aria-busy={loading} className={cn('min-w-0', className)}>
      {children}
    </div>
  );
};
