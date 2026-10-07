import React, { useEffect, useRef, useState } from 'react';
import { education, experience } from '../data/career';
import socialLinks from '../data/socialLinks';
import { resolveDemoLink } from '../data/projectLinks';
import projectData from '../projectData.json';
import { ROOM_GAMES } from './roomGames';

const CATEGORIES = [['all', 'Selected work'], ['fullstack', 'Full stack'], ['program', 'Software'], ['website', 'Websites'], ['game', 'Games'], ['mobile', 'Mobile']];

export function RoomGuideContent({ onExplore }) {
  return <div className="room-content room-guide-content">
    <p className="room-intro">Hi! I’m Hillman, a software engineer who likes building useful things and making room for a little play.</p>
    <p>This is my room. Click the objects to explore — the two computers are a good place to start.</p>
    <div className="room-guide-choices">
      <button className="room-guide-choice" onClick={() => onExplore('experience')} aria-label="Explore Experience on the MacBook"><strong>Experience <span aria-hidden="true">↗</span></strong><span>The MacBook holds my work, skills and education.</span></button>
      <button className="room-guide-choice" onClick={() => onExplore('projects')} aria-label="Explore Projects on the Dell monitor"><strong>Projects <span aria-hidden="true">↗</span></strong><span>The Dell monitor shows what I’ve built, with demos and games to try.</span></button>
    </div>
    <a href="/about">More about me and my interests <span aria-hidden="true">↗</span></a>
    <h3>Make your own house</h3>
    <p>A room can tell your story too. Imagine yours filled with the projects, hobbies and little things that make it yours.</p>
  </div>;
}

export function ExperienceContent() {
  return <div className="room-content">
    <p className="room-intro">I’m Hillman, a software engineer specialising in AI and full-stack development. I build software with engineering teams, work with clients, and lead JARVIS AI.</p>
    <h3>Where I’ve been</h3>
    <ol className="room-timeline">{experience.map((role) => <li key={role.company}>
      <p className="room-meta">{role.start_date} – {role.end_date}</p>
      <h4>{role.title}</h4><p className="room-company">{role.company} <span>{role.location}</span></p>
      <ul className="room-achievements">{role.description.map((item) => <li key={item}>{item}</li>)}</ul>
      <ul className="room-tags" aria-label="Skills">{role.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
    </li>)}</ol>
    <h3>Education</h3>
    {education.map((item) => <section className="room-education" key={item.school}><p className="room-meta">{item.year}</p><h4>{item.degree}</h4><p>{item.school}</p><p>{item.description}</p></section>)}
    <a href="/about" target="_blank" rel="noreferrer">More about me and my interests <span aria-hidden="true">↗</span></a>
  </div>;
}

export function ProjectActions({ project, onPlay }) {
  const demo = resolveDemoLink(project.demoUrl);
  const gameEntry = Object.entries(ROOM_GAMES).find(([, game]) => game.projectId === project.id);
  const source = project.sourceCode && project.sourceCode !== 'no-source-code';
  const stores = [['iosUrl', 'App Store'], ['androidUrl', 'Google Play']].filter(([key]) => project[key] && project[key] !== 'not-available');
  return <div className="room-project-actions">
    {gameEntry?.[1].externalUrl ? <a className="room-button" href={gameEntry[1].externalUrl} target="_blank" rel="noreferrer">Play on its own site ↗</a> : gameEntry && onPlay ? <button className="room-button" onClick={() => onPlay(gameEntry[0])}>Play</button> : demo.url ? <a className="room-button" href={demo.subdomainUrl || demo.url} target="_blank" rel="noreferrer">{demo.isContactLink ? 'Request demo access' : project.category === 'game' ? 'Play game' : 'Try demo'} <span aria-hidden="true">↗</span></a> : <span className="room-unavailable">{stores.length ? 'Available on mobile' : 'Demo unavailable'}</span>}
    {source && <a className="room-button room-button-quiet" href={project.sourceCode} target="_blank" rel="noreferrer">Source code <span aria-hidden="true">↗</span></a>}
    {stores.map(([key, label]) => <a key={key} className="room-button room-button-quiet" href={project[key]} target="_blank" rel="noreferrer">{label} <span aria-hidden="true">↗</span></a>)}
  </div>;
}

export function ProjectContent({ onPlay }) {
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const contentRef = useRef(null);
  const detailHeading = useRef(null);
  const returnProjectId = useRef(null);
  useEffect(() => {
    if (selected) detailHeading.current?.focus();
    else if (returnProjectId.current !== null) contentRef.current?.querySelector(`[data-project-id="${returnProjectId.current}"]`)?.focus();
  }, [selected]);
  const projects = projectData.filter((project) => project.category !== 'none' && (category === 'all' || project.category === category));
  if (selected) return <div className="room-content room-project-detail" ref={contentRef}>
    <button className="room-text-button" onClick={() => setSelected(null)}>← All projects</button>
    <img src={require(`../assets/${selected.image}`)} alt="" className="room-project-cover" />
    <h3 ref={detailHeading} tabIndex="-1">{selected.title}</h3><p className="room-intro">{selected.shortDescription}</p>
    <p>{selected.fullDescription}</p>
    <ul className="room-tags" aria-label="Technologies">{selected.technologies?.map((tag) => <li key={tag}>{tag}</li>)}</ul>
    <ProjectActions project={selected} onPlay={onPlay} />
    <a href={`/project/${selected.id}`} target="_blank" rel="noreferrer">Full project page and demo media <span aria-hidden="true">↗</span></a>
  </div>;
  return <div className="room-content" ref={contentRef}>
    <p className="room-intro">Things I’ve built, from everyday tools to worlds you can play in.</p>
    <div className="room-categories" aria-label="Project categories">{CATEGORIES.map(([value, label]) => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)}</div>
    <div className="room-projects">{projects.map((project) => <article className="room-project-card" key={project.id}>
      <button className="room-project-select" data-project-id={project.id} onClick={() => { returnProjectId.current = project.id; setSelected(project); }} aria-label={`About ${project.title}`}>
        <img src={require(`../assets/${project.image}`)} alt="" loading="lazy" width="400" height="220" />
        <strong className="room-project-title">{project.title}</strong>
        <span className="room-project-description">{project.shortDescription}</span>
        <span className="room-project-open">About this project <span aria-hidden="true">↗</span></span>
      </button>
    </article>)}</div>
  </div>;
}

export function ContactContent() {
  return <div className="room-content room-contact">
    <p className="room-intro">Have something in mind?</p><p>I’m happy to talk about software engineering opportunities, a project you’re building, or an idea worth exploring.</p>
    <a className="room-contact-email" href={`mailto:${socialLinks.email}`}>{socialLinks.email}</a>
    <div className="room-project-actions"><a className="room-button" href={socialLinks.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a><a className="room-button room-button-quiet" href={socialLinks.github} target="_blank" rel="noreferrer">GitHub ↗</a></div>
    <a href="/contact" target="_blank" rel="noreferrer">Send a message through my contact page ↗</a>
  </div>;
}

export function GameIntroduction({ action, onPlay }) {
  const game = ROOM_GAMES[action];
  const project = projectData.find((item) => item.id === game.projectId);
  const [showAbout, setShowAbout] = useState(false);
  return <div className="room-content room-game-intro">
    <img src={require(`../assets/${project.image}`)} className="room-project-cover" alt="" />
    <p className="room-intro">{game.note}</p>
    <div className="room-project-actions">{game.externalUrl ? <a className="room-button" href={game.externalUrl} target="_blank" rel="noreferrer">Play {game.title} ↗</a> : <button className="room-button" onClick={() => onPlay(action)}>Play {game.title}</button>}<button className="room-button room-button-quiet" aria-expanded={showAbout} onClick={() => setShowAbout(!showAbout)}>About this project</button></div>
    {showAbout && <section><h3>{project.title}</h3><p>{project.fullDescription}</p><ul className="room-tags">{project.technologies?.map((tag) => <li key={tag}>{tag}</li>)}</ul><a href={`/project/${project.id}`} target="_blank" rel="noreferrer">Full project page ↗</a></section>}
    {action === 'cards' && <p>Looking for another party game? <a href="/card-game" target="_blank" rel="noreferrer">Play Never Have I Ever ↗</a></p>}
    {!game.externalUrl && <a href={game.route} target="_blank" rel="noreferrer">Open the standalone game ↗</a>}
  </div>;
}
