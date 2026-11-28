import { useState, useEffect, useRef, useCallback } from 'react';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export type DraftPatch<T extends Record<string, any>> = Partial<Omit<T, 'copy'>> & {
  copy?: Partial<Record<string, any>>;
};

function mergeDraftPatches<T extends Record<string, any>>(
  base: DraftPatch<T>,
  incoming: DraftPatch<T>
): DraftPatch<T> {
  const merged: any = { ...base, ...incoming };
  if (base.copy || incoming.copy) {
    merged.copy = { ...(base.copy || {}), ...(incoming.copy || {}) };
  }
  return merged;
}

function hasPatchKeys(patch: Record<string, any>): boolean {
  for (const key of Object.keys(patch)) {
    if (key === 'copy') {
      if (patch.copy && Object.keys(patch.copy).length > 0) return true;
    } else if (patch[key] !== undefined) {
      return true;
    }
  }
  return false;
}

interface UseEntityDraftOptions<T extends { id: string }> {
  entityId: string;
  entity: T;
  onPersist: (id: string, patch: DraftPatch<T>) => Promise<void> | void;
  debounceMs?: number;
  onUnmountError?: (error: unknown) => void;
}

export function useEntityDraft<T extends { id: string }>({
  entityId,
  entity,
  onPersist,
  debounceMs = 600,
  onUnmountError,
}: UseEntityDraftOptions<T>) {
  const [draft, setDraft] = useState<T>(entity);
  const [saveState, setSaveState] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const activeIdRef = useRef(entityId);
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;
  const onUnmountErrorRef = useUnmountErrorRef(onUnmountError);

  const pendingPatchRef = useRef<DraftPatch<T>>({});
  const failedPatchRef = useRef<DraftPatch<T> | null>(null);
  const dirtyKeysRef = useRef<Set<string>>(new Set());
  const dirtyCopyKeysRef = useRef<Set<string>>(new Set());
  const editSeqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (savedFadeTimerRef.current) {
      clearTimeout(savedFadeTimerRef.current);
      savedFadeTimerRef.current = null;
    }
  }, []);

  const persistBatch = useCallback(
    async (targetId: string, batch: DraftPatch<T>, attemptSeq: number, isFromCurrentEntity: boolean) => {
      try {
        await onPersistRef.current(targetId, batch);
        failedPatchRef.current = null;

        if (!isMountedRef.current || activeIdRef.current !== targetId || !isFromCurrentEntity) {
          return;
        }

        if (editSeqRef.current === attemptSeq) {
          dirtyKeysRef.current.clear();
          dirtyCopyKeysRef.current.clear();
          setSaveState('saved');
          setErrorMsg(null);
          if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current);
          savedFadeTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && editSeqRef.current === attemptSeq) {
              setSaveState('idle');
            }
          }, 2000);
        } else if (!hasPatchKeys(pendingPatchRef.current) && !timerRef.current) {
          setSaveState('idle');
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;

        if (isMountedRef.current && activeIdRef.current === targetId && isFromCurrentEntity) {
          // Restore failed patch underneath any newer local edits so no text is ever lost
          failedPatchRef.current = failedPatchRef.current
            ? mergeDraftPatches(failedPatchRef.current, batch)
            : batch;
          pendingPatchRef.current = mergeDraftPatches(batch, pendingPatchRef.current);
          setSaveState('error');
          setErrorMsg(err?.message || 'Save failed');
        } else {
          onUnmountErrorRef.current?.(err);
        }
      }
    },
    []
  );

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const batch = pendingPatchRef.current;
    if (!hasPatchKeys(batch)) return;

    pendingPatchRef.current = {};
    failedPatchRef.current = null;
    const targetId = activeIdRef.current;
    const attemptSeq = editSeqRef.current;

    if (isMountedRef.current) {
      setSaveState('saving');
      setErrorMsg(null);
    }

    await persistBatch(targetId, batch, attemptSeq, true);
  }, [persistBatch]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Flush previous entity when switching entityId; reset dirty tracking for new entity
  useEffect(() => {
    if (activeIdRef.current !== entityId) {
      const prevId = activeIdRef.current;
      const prevBatch = pendingPatchRef.current;
      const prevSeq = editSeqRef.current;
      clearTimers();
      pendingPatchRef.current = {};
      failedPatchRef.current = null;
      dirtyKeysRef.current.clear();
      dirtyCopyKeysRef.current.clear();

      if (hasPatchKeys(prevBatch)) {
        void persistBatch(prevId, prevBatch, prevSeq, false);
      }

      activeIdRef.current = entityId;
      setDraft(entity);
      setSaveState('idle');
      setErrorMsg(null);
    }
  }, [entityId, entity, clearTimers, persistBatch]);

  // Safely merge external updates ONLY for non-dirty fields (protects active typing from echoes)
  useEffect(() => {
    if (activeIdRef.current !== entity.id) return;

    setDraft((prev) => {
      if (
        dirtyKeysRef.current.size === 0 &&
        dirtyCopyKeysRef.current.size === 0 &&
        !hasPatchKeys(pendingPatchRef.current)
      ) {
        return entity;
      }

      const next: any = { ...entity };
      for (const key of dirtyKeysRef.current) {
        if (key !== 'copy') {
          next[key] = (prev as any)[key];
        }
      }
      if ('copy' in entity && (entity as any).copy) {
        const nextCopy: any = { ...(entity as any).copy };
        for (const cKey of dirtyCopyKeysRef.current) {
          nextCopy[cKey] = (prev as any).copy?.[cKey];
        }
        next.copy = nextCopy;
      }
      return next as T;
    });
  }, [entity]);

  // Flush pending edits when unmounting (e.g., navigation or drawer unmount)
  useEffect(() => {
    isMountedRef.current = true;
    const handleBeforeUnload = () => {
      if (hasPatchKeys(pendingPatchRef.current)) {
        void flushRef.current();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isMountedRef.current = false;
      clearTimers();
      const targetId = activeIdRef.current;
      const remaining = pendingPatchRef.current;
      const attemptSeq = editSeqRef.current;
      pendingPatchRef.current = {};
      if (hasPatchKeys(remaining)) {
        void persistBatch(targetId, remaining, attemptSeq, false);
      }
    };
  }, [clearTimers, persistBatch]);

  const markPatchDirty = useCallback((patch: DraftPatch<T>) => {
    editSeqRef.current += 1;
    const raw = patch as Record<string, any>;
    for (const key of Object.keys(raw)) {
      if (key === 'copy' && raw.copy) {
        for (const cKey of Object.keys(raw.copy)) {
          dirtyCopyKeysRef.current.add(cKey);
        }
        dirtyKeysRef.current.add('copy');
      } else if (raw[key] !== undefined) {
        dirtyKeysRef.current.add(key);
      }
    }
    setDraft((prev) => {
      const next: any = { ...prev, ...patch };
      if (patch.copy) {
        next.copy = { ...((prev as any).copy || {}), ...patch.copy };
      }
      return next as T;
    });
    pendingPatchRef.current = mergeDraftPatches(pendingPatchRef.current, patch);
  }, []);

  const queuePatch = useCallback(
    (patch: DraftPatch<T>) => {
      markPatchDirty(patch);
      setSaveState('dirty');
      setErrorMsg(null);

      if (savedFadeTimerRef.current) {
        clearTimeout(savedFadeTimerRef.current);
        savedFadeTimerRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flushRef.current();
      }, debounceMs);
    },
    [debounceMs, markPatchDirty]
  );

  const commitImmediate = useCallback(
    async (patch: DraftPatch<T>) => {
      markPatchDirty(patch);
      await flushRef.current();
    },
    [markPatchDirty]
  );

  const flushIfDirty = useCallback(() => {
    if (hasPatchKeys(pendingPatchRef.current)) {
      void flushRef.current();
    }
  }, []);

  const retry = useCallback(() => {
    if (!hasPatchKeys(pendingPatchRef.current) && failedPatchRef.current) {
      pendingPatchRef.current = failedPatchRef.current;
    }
    void flushRef.current();
  }, []);

  return {
    draft,
    saveState,
    errorMsg,
    queuePatch,
    commitImmediate,
    flush,
    flushIfDirty,
    retry,
  };
}

function useUnmountErrorRef(cb?: (err: unknown) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  return ref;
}
