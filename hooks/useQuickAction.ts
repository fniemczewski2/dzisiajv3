// hooks/useQuickAction.ts

import { useRouter } from "next/router";
import { useEffect } from "react";

interface UseQuickActionOptions {
  onActionAdd?: () => void;
  removeQueryAfterTrigger?: boolean;
}

export function useQuickAction(options: UseQuickActionOptions = {}) {
  const router = useRouter();
  const { onActionAdd, removeQueryAfterTrigger = true } = options;

  useEffect(() => {
    if (router.query.action === "add" && onActionAdd) {
      onActionAdd();
      if (removeQueryAfterTrigger) {
        const { action, ...rest } = router.query;
        router.replace(
          { pathname: router.pathname, query: rest },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [router, onActionAdd, removeQueryAfterTrigger]);

  return {
    isQuickAction: router.query.action === "add",
  };
}