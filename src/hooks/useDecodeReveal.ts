'use client';

import { RefObject, useEffect } from 'react';
import { cancelDecodes, decodeTree, observeDecode } from '@/lib/decode';

/**
 * While `active`, decode the text inside `ref` when it first appears and whenever
 * content inside it is added or changed (section switches, edition changes, filters).
 */
export function useDecodeReveal(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;

    decodeTree(root);
    const stop = observeDecode(root);

    return () => {
      stop();
      cancelDecodes();
    };
  }, [ref, active]);
}
