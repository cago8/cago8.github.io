import type { SkillGroup } from '../../content/skills';

export function SkillGroupCard({ group, headless }: { group: SkillGroup; headless?: boolean }) {
  return (
    <article className="card card--skills">
      {!headless && <h3 className="card-title">{group.title}</h3>}
      <ul className="chips chips--lg">
        {group.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
