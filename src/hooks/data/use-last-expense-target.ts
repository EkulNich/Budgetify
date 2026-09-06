import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export const INDIVIDUAL_TARGET = "individual";

const storageKey = (userId: string) => `budgetify:lastExpenseTarget:${userId}`;

/**
 * Remembers which pool (or "individual") was last used on the Add tab, per user,
 * so the screen re-opens on the same selection across app restarts.
 */
export function useLastExpenseTarget(userId: string | undefined) {
  const [target, setTargetState] = useState<string>(INDIVIDUAL_TARGET);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setTargetState(INDIVIDUAL_TARGET);
      setLoaded(false);
      return;
    }

    let isMounted = true;
    AsyncStorage.getItem(storageKey(userId)).then((stored) => {
      if (!isMounted) return;
      setTargetState(stored ?? INDIVIDUAL_TARGET);
      setLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const setTarget = useCallback(
    (value: string) => {
      setTargetState(value);
      if (userId) AsyncStorage.setItem(storageKey(userId), value);
    },
    [userId],
  );

  return { target, setTarget, loaded };
}
