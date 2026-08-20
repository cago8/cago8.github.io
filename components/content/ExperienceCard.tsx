import type { ExperienceItem } from '../../content/experience';

/** Used both inside a playground panel and in the List View timeline. */
export function ExperienceCard({ item, headless }: { item: ExperienceItem; headless?: boolean }) {
  return (
    <article className="card card--experience">
      <p className="card-meta">{item.year}</p>
      {!headless && <h3 className="card-title">{item.role}</h3>}
      <p className="card-org">{item.company}</p>
      <p className="card-place">{item.location}</p>
      {item.description.map((line, i) => (
        <p key={i} className="card-body">
          {line}
        </p>
      ))}
      <ul className="chips">
        {item.technologies.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
      </ul>
    </article>
  );
}
