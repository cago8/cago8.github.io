import { site } from '../config/site';
import { experience } from '../content/experience';
import { hero } from '../content/profile';
import { projects } from '../content/projects';
import { sections } from '../content/sections';
import { skills } from '../content/skills';
import { ContactCard } from './content/ContactCard';
import { ExperienceCard } from './content/ExperienceCard';
import { ProfileCard } from './content/ProfileCard';
import { ProjectCard } from './content/ProjectCard';
import { SkillGroupCard } from './content/SkillGroupCard';

const BODIES = {
  profile: <ProfileCard />,
  experience: (
    <div className="stack">
      {experience.map((item, i) => (
        <ExperienceCard key={i} item={item} />
      ))}
    </div>
  ),
  skills: (
    <div className="grid grid--skills">
      {skills.map((group) => (
        <SkillGroupCard key={group.title} group={group} />
      ))}
    </div>
  ),
  projects: (
    <div className="grid grid--projects">
      {projects.map((project) => (
        <ProjectCard key={project.title} project={project} />
      ))}
    </div>
  ),
  contact: <ContactCard />,
};

/**
 * The complete content as a plain document, hero included. This is not a stripped-down
 * fallback — it is the same cards the playground panels use, in reading order.
 * It is always present in the HTML, so search engines and no-JS visitors get
 * everything even when the playground is the active view.
 */
export function ListView() {
  return (
    <div className="listview">
      <section className="hero">
        <h1 className="hero-name">
          {site.givenName}
          <span>{site.familyName}</span>
        </h1>
        <p className="hero-tagline">{hero.tagline}</p>
        <p className="hero-statement">{hero.statement}</p>
        <dl className="hero-facts">
          {hero.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {sections.map((section) => (
        <section key={section.id} id={`section-${section.id}`} className="listview-section">
          <header className="listview-head">
            <h2>{section.label}</h2>
            <p>{section.blurb}</p>
          </header>
          {BODIES[section.id]}
        </section>
      ))}
    </div>
  );
}
