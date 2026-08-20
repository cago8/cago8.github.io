/**
 * The one persistent preference on this site: playground or list.
 *
 * It lives in localStorage, which makes it genuinely external state, so it is
 * exposed through `useSyncExternalStore` rather than read in an effect. The
 * server snapshot is always 'play'; React re-renders with the real preference
 * immediately after hydration, with no mismatch and no cascading render.
 */
export type ViewMode = 'play' | 'list';

const STORAGE_KEY = 'cb-view';
const listeners = new Set<() => void>();
let current: ViewMode | null = null;

function read(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'play' || stored === 'list') return stored;
  } catch {
    /* private browsing — fall through to the viewport default */
  }
  // A 1600×1000 play space is cramped on a phone, so small screens start in
  // the list. The toggle stays available either way.
  return window.matchMedia('(max-width: 760px)').matches ? 'list' : 'play';
}

export function subscribeView(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getView(): ViewMode {
  if (current === null) current = read();
  return current;
}

export function getServerView(): ViewMode {
  return 'play';
}

export function setView(next: ViewMode) {
  if (current === next) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* the choice just does not persist */
  }
  listeners.forEach((listener) => listener());
}
