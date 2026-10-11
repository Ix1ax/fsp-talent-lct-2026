import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  getIncomingOffers,
  INCOMING_OFFERS_CHANGED,
} from '@/entities/candidate-offers';

export const useNewOffersCount = () => {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let controller: AbortController | undefined;

    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      void getIncomingOffers('sent', 0, request.signal)
        .then((page) => {
          if (!request.signal.aborted) setCount(page.total);
        })
        .catch(() => {
          if (!request.signal.aborted) setCount(null);
        });
    };

    refresh();
    const interval = window.setInterval(refresh, 60_000);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener(INCOMING_OFFERS_CHANGED, refresh);

    return () => {
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener(INCOMING_OFFERS_CHANGED, refresh);
    };
  }, [pathname]);

  return count;
};
