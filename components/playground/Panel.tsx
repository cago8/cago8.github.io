'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { experience } from '../../content/experience';
import { projects } from '../../content/projects';
import { skills } from '../../content/skills';
import { ContactCard } from '../content/ContactCard';
import { ExperienceCard } from '../content/ExperienceCard';
import { ProfileCard } from '../content/ProfileCard';
import { ProjectCard } from '../content/ProjectCard';
import { SkillGroupCard } from '../content/SkillGroupCard';
import type { SceneObject } from './scene';

const HEADINGS: Record<SceneObject['category'], string> = {
  profile: 'Profile',
  experience: 'Experience',
  skills: 'Skills',
  projects: 'Project',
  contact: 'Contact',
};

function bodyFor(object: SceneObject): ReactNode {
  switch (object.category) {
    case 'profile':
      return <ProfileCard />;
    case 'experience':
      return <ExperienceCard item={experience[object.index]} headless />;
    case 'skills':
      return <SkillGroupCard group={skills[object.index]} headless />;
    case 'projects':
      return <ProjectCard project={projects[object.index]} headless />;
    case 'contact':
      return <ContactCard />;
  }
}

/**
 * Content always lands here: an opaque sand panel over a dimmed scene. Text is
 * never drawn on the moving water — that rule is what keeps the whole thing
 * readable.
 */
export function Panel({ object, onClose }: { object: SceneObject; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [object.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      // Keep focus inside the dialog while it is open.
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  return (
    <div className="panel-layer">
      <button
        type="button"
        className="panel-scrim"
        aria-label="Close panel"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-heading"
      >
        <header className="panel-head">
          <p className="panel-kicker" data-category={object.category}>
            {HEADINGS[object.category]}
          </p>
          <h2 id="panel-heading" className="panel-title">
            {object.title}
          </h2>
          <button ref={closeRef} type="button" className="panel-close" onClick={onClose}>
            <span aria-hidden="true">✕</span>
            <span className="sr-only">Close</span>
          </button>
        </header>
        <div className="panel-body">{bodyFor(object)}</div>
      </div>
    </div>
  );
}
