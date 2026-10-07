import React, { useEffect, useRef } from 'react';
import RoomIcon from './RoomIcon';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, iframe, [tabindex="0"]';

export default function RoomDialog({ title, children, onClose, game, variant, returnFocus }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = returnFocus || document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('button').focus();
    return () => {
      document.body.style.overflow = overflow;
      // Wait until the background's inert attribute has been removed.
      Promise.resolve().then(() => { if (previousFocus?.isConnected && !previousFocus.closest('[hidden], [inert]')) previousFocus.focus(); });
    };
  }, [returnFocus]);

  const trapFocus = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((element) => !element.closest('[hidden]'));
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return <dialog className={`room-dialog${game ? ' room-dialog-game' : ''}${variant === 'door' ? ' room-dialog-door' : ''}`} ref={dialogRef} aria-labelledby="room-dialog-title" onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="room-dialog-heading"><h2 id="room-dialog-title">{title}</h2><button className="room-close" onClick={onClose} aria-label="Back to room"><span className="room-close-label">Back to room</span><span aria-hidden="true">×</span></button></header>
    <div className="room-dialog-body">{children}</div>
  </dialog>;
}

export function IsolatedGame({ game, onClose }) {
  const frame = useRef(null);
  const listenerCleanup = useRef(() => {});
  useEffect(() => {
    frame.current?.focus();
    return () => listenerCleanup.current();
  }, []);
  const connectKeyboard = () => {
    listenerCleanup.current();
    frame.current?.focus();
    // Same-origin game documents do not bubble keyboard events to the parent.
    // Add just Escape; all other keys remain owned by the game.
    try {
      const document = frame.current.contentDocument;
      const handler = (event) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
      document.addEventListener('keydown', handler, true);
      listenerCleanup.current = () => document.removeEventListener('keydown', handler, true);
    } catch { /* The persistent return bar is available for independent apps. */ }
  };
  return <div className="room-game-view">
    <p className="room-game-bar">Your room is waiting. <a href={game.route} target="_blank" rel="noreferrer">Open standalone <RoomIcon /></a></p>
    <iframe ref={frame} src={game.src} title={game.title} onLoad={connectKeyboard} allow="fullscreen" />
  </div>;
}
