import Image from 'next/image';
import { profile } from '../../content/profile';

export function ProfileCard() {
  return (
    <article className="card card--profile">
      <div className="profile-split">
        <Image
          src={profile.photo}
          alt="Çağrı Bilginer"
          width={876}
          height={1200}
          className="profile-photo"
          sizes="(max-width: 720px) 45vw, 240px"
        />
        <div>
          <h3 className="card-title">{profile.heading}</h3>
          {profile.paragraphs.map((text, i) => (
            <p key={i} className="card-body">
              {text}
            </p>
          ))}
        </div>
      </div>

      <p className="card-body card-body--lead">{profile.awayIntro}</p>
      <ul className="away-grid">
        {profile.away.map((entry) => (
          <li key={entry.title}>
            <strong>{entry.title}</strong>
            <span>{entry.note}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
