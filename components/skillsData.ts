import type { IconType } from 'react-icons';
import {
  FaBrain,
  FaC,
  FaCode,
  FaDatabase,
  FaGithub,
  FaHashtag,
  FaImage,
  FaJava,
  FaPython,
} from 'react-icons/fa6';
import {
  SiAnthropic,
  SiDart,
  SiDocker,
  SiFlutter,
  SiGit,
  SiJavascript,
  SiPostgresql,
  SiRailway,
  SiRedis,
  SiSwift,
  SiDotnet,
} from 'react-icons/si';

export interface SkillItem {
  title: string;
  icon: IconType;
  color: string;
}

export interface SkillCategory {
  title: string;
  data: SkillItem[];
}

export const skillsData: SkillCategory[] = [
  {
    title: 'Programming languages',
    data: [
      { title: 'Java', icon: FaJava, color: '#f89820' },
      { title: 'Python', icon: FaPython, color: '#3776ab' },
      { title: 'C', icon: FaC, color: '#a8b9cc' },
      { title: 'C#', icon: FaHashtag, color: '#9333ea' },
      { title: 'Swift', icon: SiSwift, color: '#fa7343' },
      { title: 'Dart', icon: SiDart, color: '#0175c2' },
      { title: 'JavaScript', icon: SiJavascript, color: '#f7df1e' },
    ],
  },
  {
    title: 'Frontend & mobile',
    data: [
      { title: 'Flutter', icon: SiFlutter, color: '#02569b' },
      { title: '.NET / XAML', icon: SiDotnet, color: '#512bd4' },
    ],
  },
  {
    title: 'Databases & data',
    data: [
      { title: 'SQL', icon: SiPostgresql, color: '#336791' },
      { title: 'Redis', icon: SiRedis, color: '#dc382d' },
      { title: 'Qdrant', icon: FaDatabase, color: '#1e90ff' },
    ],
  },
  {
    title: 'DevOps & tooling',
    data: [
      { title: 'Docker', icon: SiDocker, color: '#2496ed' },
      { title: 'Railway', icon: SiRailway, color: '#0b0d0e' },
      { title: 'Git', icon: SiGit, color: '#f05032' },
      { title: 'GitHub', icon: FaGithub, color: '#e2e8f0' },
    ],
  },
  {
    title: 'AI & assistants',
    data: [
      { title: 'Claude', icon: SiAnthropic, color: '#181818' },
      { title: 'Cursor', icon: FaCode, color: '#00d4ff' },
      { title: 'ML exploration', icon: FaBrain, color: '#3b82f6' },
    ],
  },
  {
    title: 'Design',
    data: [{ title: 'Photoshop', icon: FaImage, color: '#31a8ff' }],
  },
];
