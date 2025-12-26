import { useState, useCallback } from "react";

const MAX_HISTORY_STATES = 50;

export interface UseHistoryResult<T> {
  current: T;
  push: (state: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (state: T) => void;
}

export function useHistory<T>(initial: T): UseHistoryResult<T> {
  const [history, setHistory] = useState<T[]>([initial]);
  const [index, setIndex] = useState(0);

  const current = history[index] as T;
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const push = useCallback((state: T) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, index + 1);
      newHistory.push(state);
      if (newHistory.length > MAX_HISTORY_STATES) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setIndex((prev) => Math.min(prev + 1, MAX_HISTORY_STATES - 1));
  }, [index]);

  const undo = useCallback(() => {
    if (canUndo) {
      setIndex((prev) => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setIndex((prev) => prev + 1);
    }
  }, [canRedo]);

  const reset = useCallback((state: T) => {
    setHistory([state]);
    setIndex(0);
  }, []);

  return { current, push, undo, redo, canUndo, canRedo, reset };
}
