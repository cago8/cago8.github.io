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
  // Every screen starts in the playground now. Small ones used to start in the
  // list because the whole reef at once was unreadable on a phone — the tab
  // layout shows one category at a time instead, so that reason is gone. The
  // toggle stays available either way.
  return 'play';
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
