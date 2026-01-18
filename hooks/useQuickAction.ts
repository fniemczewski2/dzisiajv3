import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface UseQuickActionOptions {
  onActionAdd?: () => void;
  removeQueryAfterTrigger?: boolean;
}

export function useQuickAction(options: UseQuickActionOptions = {}) {
  const router = useRouter();
  const { onActionAdd, removeQueryAfterTrigger = true } = options;

  useEffect(() => {
    // Sprawdź czy URL zawiera ?action=add
    if (router.query.action === 'add' && onActionAdd) {
      // Wywołaj callback (np. setShowForm(true))
      onActionAdd();
      
      // Opcjonalnie: usuń query param z URL (czyści adres)
      if (removeQueryAfterTrigger) {
        const { action, ...rest } = router.query;
        router.replace(
          {
            pathname: router.pathname,
            query: rest,
          },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [router.query.action]);

  return {
    isQuickAction: router.query.action === 'add',
  };
}