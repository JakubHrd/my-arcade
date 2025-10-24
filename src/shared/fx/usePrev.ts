import { useRef } from 'react';
export function usePrev<T>(v: T) {
  const r = useRef<T>(v);
  const prev = r.current;
  r.current = v;
  return prev;
}
