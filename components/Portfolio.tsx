'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { site } from '../config/site';
import { getMuted, getServerMuted, setMuted, subscribeMuted } from './playground/audio';
import { Playground } from './playground/Playground';
import { getServerView, getView, setView, subscribeView } from './viewStore';

/**
 * Page shell. Owns the one global choice on this site: playground or list.
 *
 * The list markup is rendered on the server and passed in as `listView`, so it
 * is present in the static HTML no matter which view is active — crawlers and
 * no-JS visitors always get the full content, hero included.
 *
 * In play view the stage takes the whole viewport under the sticky masthead,
 * so nothing else is rendered around it: the hero and the footer belong to the
 * document, not to the game.
 */
export function Portfolio({ listView }: { listView: ReactNode }) {
  const view = useSyncExternalStore(subscribeView, getView, getServerView);
  const muted = useSyncExternalStore(subscribeMuted, getMuted, getServerMuted);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <div className="masthead-id">
          <span className="masthead-name">{site.name}</span>
          <span className="masthead-role">Computer Engineering</span>
        </div>

        <div className="masthead-actions">
          <div className="switch" role="group" aria-label="Choose how to browse this site">
            <button
              type="button"
              aria-pressed={view === 'play'}
              onClick={() => setView('play')}
            >
              Playground
            </button>
            <button
              type="button"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              List view
            </button>
          </div>
          {view === 'play' && (
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              aria-pressed={!muted}
              onClick={() => setMuted(!muted)}
            >
              <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
              <span className="sr-only">{muted ? 'Turn sound on' : 'Turn sound off'}</span>
            </button>
          )}
          <a className="btn btn--ghost" href={site.resume} target="_blank" rel="noopener noreferrer">
            Resume
          </a>
        </div>
      </header>

      <main id="main">
        {view === 'play' && <Playground />}
        <div hidden={view !== 'list'}>{listView}</div>
      </main>

      {/* Hidden rather than unmounted in play view, so it stays in the HTML. */}
      <footer className="site-footer" hidden={view === 'play'}>
        <p>
          Built with Next.js and Matter.js · <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <p>© {new Date().getFullYear()} {site.name}</p>
      </footer>
    </>
  );
}
