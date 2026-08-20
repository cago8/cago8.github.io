import Image from 'next/image';
import type { Project } from '../../content/projects';

export function ProjectCard({ project, headless }: { project: Project; headless?: boolean }) {
  return (
    <article className="card card--project">
      {project.image && (
        <Image
          src={project.image}
          alt={`${project.title} screenshot`}
          width={1600}
          height={1000}
          className="card-shot"
          sizes="(max-width: 720px) 92vw, 420px"
        />
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
