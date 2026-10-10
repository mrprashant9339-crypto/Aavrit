import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, FolderKanban, LockKeyhole, UserRound } from 'lucide-react';
import { api } from './api';

type Portfolio = { profile: { name: string; bio: string; skills: string[] }; projects: { title: string; description: string; url: string }[] };

export default function PublicPortfolio() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const id = window.location.pathname.slice('/portfolio/'.length);
    api<Portfolio>(`/api/portfolio/${encodeURIComponent(id)}`).then(setData).catch((error) => setError(error.message));
  }, []);
  return <main className="public-portfolio"><a href="/" className="brand"><span className="brand-mark"><UserRound size={21} /></span>yuvann.</a>{data ? <><span className="eyebrow">A STUDENT’S STORY</span><h1>{data.profile.name}</h1><p className="portfolio-bio">{data.profile.bio}</p><div className="note-tags">{data.profile.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div><section className="panel"><div className="section-heading"><h2>Projects</h2><span className="tag"><LockKeyhole size={12} />Only opt-in information</span></div>{data.projects.map((project, index) => <article className="portfolio-project" key={index}><FolderKanban size={24} /><div><h3>{project.title}</h3><p>{project.description}</p>{project.url && <a href={project.url} target="_blank" rel="noreferrer" className="text-button">Explore project<ExternalLink size={14} /></a>}</div></article>)}{!data.projects.length && <p className="muted">No projects shared yet.</p>}</section></> : <section className="panel"><h1>{error ? 'A private story.' : 'Opening portfolio…'}</h1><p className="portfolio-bio" role="status">{error || 'Loading information this student has chosen to share.'}</p></section>}<a href="/" className="button secondary"><ArrowLeft size={15} />Back to Yuvann</a></main>;
}
