'use client';

import type { ReactNode } from 'react';
import { playTap } from './playground/audio';

/**
 * Gives the List View cards the same tactile answer a playground badge gives:
 * a pop and a quick wobble on press. One delegated listener rather than a
 * handler per card, so the cards themselves stay server-rendered markup.
 *
 * The wobble is a CSS animation, so `prefers-reduced-motion` already neuters
 * it site-wide; the sound still plays, and is muted with the site's own
 * sound toggle.
 */
export function TapSurface({ className, children }: { className: string; children: ReactNode }) {
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const target = event.target as HTMLElement;
    // Typing in the contact form is not a badge press.
    if (target.closest('input, textarea, select')) return;
    const card = target.closest('.card') as HTMLElement | null;
    if (!card) return;

    playTap();
    // Restarting an animation needs the class gone and a reflow between,
    // otherwise a second press on the same card does nothing.
    card.classList.remove('is-tapped');
    void card.offsetWidth;
    card.classList.add('is-tapped');
  };

  const onAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.animationName.startsWith('card-tap')) {
      (event.target as HTMLElement).classList.remove('is-tapped');
    }
  };

  return (
    <div className={className} onPointerDown={onPointerDown} onAnimationEnd={onAnimationEnd}>
      {children}
    </div>
  );
}
