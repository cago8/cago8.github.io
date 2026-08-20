'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project } from '../../content/projects';

export function ProjectCard({ project, headless }: { project: Project; headless?: boolean }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [zoomed]);

  return (
    <article className="card card--project">
      {project.image && (
        <>
          <button
            type="button"
            className="card-shot-btn"
            onClick={() => setZoomed(true)}
            aria-label={`View larger screenshot of ${project.title}`}
          >
            <Image
              src={project.image}
              alt={`${project.title} screenshot`}
              width={1600}
              height={1000}
              className="card-shot"
              sizes="(max-width: 720px) 92vw, 420px"
            />
          </button>
          {zoomed &&
            createPortal(
              // Portalled to the body: the card this button lives in gets a
              // `transform` on hover/focus-within, and a transformed ancestor
              // turns `position: fixed` into something scoped to that
              // ancestor instead of the viewport.
              <div className="lightbox-layer">
                <button
                  type="button"
                  className="lightbox-scrim"
                  aria-label="Close larger screenshot"
                  onClick={() => setZoomed(false)}
                />
                <div className="lightbox" role="dialog" aria-modal="true">
                  <button
                    type="button"
                    className="lightbox-close"
                    onClick={() => setZoomed(false)}
                  >
                    <span aria-hidden="true">✕</span>
                    <span className="sr-only">Close</span>
                  </button>
                  <Image
                    src={project.image}
                    alt={`${project.title} screenshot`}
                    width={1600}
                    height={1000}
                    className="lightbox-image"
                    sizes="90vw"
                  />
                </div>
              </div>,
              document.body,
            )}
        </>
      )}
      {project.status && <p className="card-flag">{project.status}</p>}
      {!headless && <h3 className="card-title">{project.title}</h3>}
      <p className="card-body">{project.summary}</p>
      <ul className="chips">
        {project.technologies.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
      </ul>
      {project.links.length > 0 && (
        <ul className="card-links">
          {project.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
