import React, { useCallback, useEffect, useRef, useState } from 'react';
import Seo from '../components/Seo';
import RoomPreview from './RoomPreview';
import ComputerScreen from './ComputerScreen';
import RoomDialog, { IsolatedGame } from './RoomDialog';
import { ContactContent, ExperienceContent, GameIntroduction, ProjectContent, RoomGuideContent } from './PortfolioContent';
import { COMPUTER_ACTIONS, readRoomMessage, sendRoomCommand } from './roomBridge';
import { ROOM_GAMES } from './roomGames';
import './roomPortfolio.css';

const TITLES = { experience: 'Experience', projects: 'Projects', contact: 'Let’s talk', door: 'Working from home', guide: 'Make yourself at home' };

export default function RoomPortfolio() {
  const portfolioRef = useRef(null);
  const frame = useRef(null);
  const readyWindow = useRef(null);
  const returnFocus = useRef(null);
  const current = useRef({ entered: false, panel: null });
  const [loading, setLoading] = useState({ state: 'loading', stage: 'Opening the room…', progress: null });
  const [attempt, setAttempt] = useState(0);
  const [entered, setEntered] = useState(false);
  const [panel, setPanel] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [screenRects, setScreenRects] = useState({});
  const game = playing && ROOM_GAMES[playing];
  const computerPage = entered && COMPUTER_ACTIONS.has(panel) && !game;
  const screenRect = screenRects[panel]?.rect;
  const webcam = screenRects[panel]?.webcam;
  const contentActive = Boolean(panel && (!computerPage || screenRect));
  current.current = { entered, panel, contentActive };

  const command = useCallback((type, action) => sendRoomCommand(frame.current?.contentWindow, type, action), []);

  useEffect(() => {
    let ready = Boolean(readyWindow.current && readyWindow.current === frame.current?.contentWindow);
    const receive = (event) => {
      const data = readRoomMessage(event, frame.current?.contentWindow, window.location.origin);
      if (!data) return;
      if (data.type === 'ready') {
        ready = true;
        readyWindow.current = frame.current.contentWindow;
        setLoading({ state: 'ready', stage: 'The room is ready. Come on in.', progress: null });
        command(current.current.entered && !current.current.contentActive && !document.hidden ? 'resume' : 'pause');
      } else if (data.type === 'progress' && !ready) {
        setLoading({ state: 'loading', stage: data.stage || 'Preparing the room…', progress: data.progress ?? null });
      } else if (data.type === 'error') {
        ready = false;
        readyWindow.current = null;
        setLoading({ state: 'error', stage: data.stage || 'The 3D room could not open on this device.', progress: null });
        setEntered(false);
      } else if (data.type === 'screen' && ready && current.current.entered) {
        setScreenRects((rects) => ({ ...rects, [data.action]: { rect: data.rect, webcam: data.webcam } }));
      } else if (data.type === 'action' && ready && current.current.entered && !current.current.panel && !['sound', 'watch'].includes(data.action)) {
        returnFocus.current = frame.current;
        setPlaying(null);
        setPanel(data.action);
      }
    };
    window.addEventListener('message', receive);
    const timeout = window.setTimeout(() => {
      if (!ready) setLoading({ state: 'error', stage: 'The room is taking longer than expected. Retry, or explore the portfolio while it loads.', progress: null });
    }, 60000);
    return () => { window.removeEventListener('message', receive); window.clearTimeout(timeout); };
  }, [attempt, command]);

  useEffect(() => {
    const update = () => command(document.hidden || !entered || contentActive ? 'pause' : 'resume');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [entered, contentActive, command]);

  useEffect(() => {
    // A game replacing a computer page mounts a new native dialog. Give the
    // game focus after that dialog has finished its own initial-focus setup.
    if (playing) portfolioRef.current?.querySelector('.room-game-view iframe')?.focus();
  }, [playing]);

  const openPanel = (action) => {
    returnFocus.current = document.activeElement;
    if (entered) { command('focus', action); return; }
    setPlaying(null);
    setPanel(action);
  };
  const closePanel = useCallback(() => {
    command('restore');
    setScreenRects({});
    setPlaying(null);
    setPanel(null);
    if (current.current.entered && !document.hidden) command('resume');
  }, [command]);
  const backToRoom = () => {
    command('overview');
    setScreenRects({});
    setPlaying(null);
    setPanel(null);
    if (current.current.entered && !document.hidden) command('resume');
  };
  const backToWork = () => {
    setPanel(null);
    command('resume');
    command('desk');
  };
  const exploreFromGuide = (action) => {
    setPanel(null);
    command('resume');
    command('focus', action);
  };
  const retry = () => {
    readyWindow.current = null;
    setLoading({ state: 'loading', stage: 'Opening the room again…', progress: null });
    setScreenRects({});
    setAttempt((value) => value + 1);
  };
  const enter = () => {
    setEntered(true);
    command('resume');
    window.requestAnimationFrame(() => frame.current?.focus());
  };
  const play = (action) => { if (ROOM_GAMES[action]?.src) { setPanel(action); setPlaying(action); } };
  const ready = loading.state === 'ready';

  return <div ref={portfolioRef} className={`room-portfolio${entered ? ' room-entered' : ''}`}>
    <Seo />
    <div className="room-background" inert={contentActive ? '' : undefined}>
      <iframe key={attempt} ref={frame} className="room-scene-frame" title="Explore Hillman’s interactive room" src={`/room-viewer/index.html?embedded=1&attempt=${attempt}`} aria-hidden={!entered || contentActive} tabIndex={entered && !contentActive ? 0 : -1} onError={() => setLoading({ state: 'error', stage: 'The room could not be downloaded. Check your connection and retry.', progress: null })} />
      {entered && !panel && <a className="room-portfolio-exit" href="/"><span aria-hidden="true">← </span>Back to portfolio</a>}
      {!entered ? <main className="room-welcome">
        <header className="room-welcome-header"><a className="room-wordmark" href="/">Hillman Chan<span>Software engineer</span></a><a href="/" className="room-standard-link">Standard portfolio <span aria-hidden="true">↗</span></a></header>
        <div className="room-welcome-layout">
          <section className="room-welcome-copy"><h1>Welcome to<br /> my house</h1><p className="room-welcome-intro">A little room for the things I build,<br className="room-desktop-break" /> the work I do, and a bit of play.</p>
            <div className="room-loading" aria-live="polite"><span className={`room-status-dot ${ready ? 'ready' : loading.state}`} aria-hidden="true" /><p>{loading.stage}</p></div>
            {loading.progress !== null && !ready && <div className="room-download"><progress max="1" value={loading.progress} aria-label={loading.stage} /><span>{Math.round(loading.progress * 100)}% of this stage</span></div>}
            <div className="room-welcome-actions">{loading.state === 'error' ? <button className="room-button" onClick={retry}>Retry room</button> : <button className="room-button" disabled={!ready} onClick={enter}>{ready ? 'Enter my room' : 'Getting the room ready…'}<span aria-hidden="true">↗</span></button>}<button className="room-text-button" onClick={() => openPanel('projects')}>View projects</button></div>
            <p className="room-welcome-note">No need to wait to look around my work.</p>
          </section>
          <figure className="room-preview-wrap"><RoomPreview /><figcaption>Make yourself at home.</figcaption></figure>
        </div>
        <footer className="room-welcome-footer"><span>Built with curiosity. Best explored at your own pace.</span><nav aria-label="Portfolio"><button onClick={() => openPanel('experience')}>Experience</button><button onClick={() => openPanel('contact')}>Contact</button></nav></footer>
      </main> : null}
    </div>
    {computerPage && screenRect && <ComputerScreen key={panel} action={panel} rect={screenRect} webcam={webcam} onWebcam={() => command('webcam')} title={TITLES[panel]} onClose={closePanel} onBackToRoom={backToRoom} returnFocus={returnFocus.current}>
      {panel === 'experience' ? <ExperienceContent /> : <ProjectContent onPlay={play} />}
    </ComputerScreen>}
    {computerPage && !screenRect && <p className="room-screen-instructions" role="status">Preparing the computer screen…</p>}
    {panel && !computerPage && <RoomDialog variant={panel === 'door' ? 'door' : undefined} title={TITLES[panel] || ROOM_GAMES[panel]?.title} onClose={closePanel} game={Boolean(game)} returnFocus={returnFocus.current}>
      {game ? <IsolatedGame game={game} onClose={closePanel} /> : panel === 'experience' ? <ExperienceContent /> : panel === 'projects' ? <ProjectContent onPlay={play} /> : panel === 'contact' ? <ContactContent /> : panel === 'guide' ? <RoomGuideContent onExplore={exploreFromGuide} /> : panel === 'door' ? <div className="room-content room-door-content"><p className="room-door-quote">“You’re working from home. You cannot get out!!! Go back to work.”</p><button className="room-button" onClick={backToWork}>Fine, back to work</button><button className="room-text-button" onClick={closePanel}>I’ll stay here a little longer</button></div> : <GameIntroduction key={panel} action={panel} onPlay={play} />}
    </RoomDialog>}
  </div>;
}
