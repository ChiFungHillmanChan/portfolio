import React, { useEffect, useRef, useState } from 'react';
import RoomIcon from './RoomIcon';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]';

// The viewer projects the physical display after its camera settles. This page
// occupies that display; enlarging changes only its bounds, preserving scroll.
export default function ComputerScreen({ action, rect, webcam, onWebcam, title, children, onClose, onBackToRoom, returnFocus }) {
  const screenRef = useRef(null);
  const headingRef = useRef(null);
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      Promise.resolve().then(() => {
        if (returnFocus?.isConnected && !returnFocus.closest('[hidden], [inert]')) returnFocus.focus();
      });
    };
  }, [returnFocus]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const items = [...screenRef.current.querySelectorAll(FOCUSABLE)].filter((element) => !element.closest('[hidden]'));
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) { event.preventDefault(); last?.focus(); }
    if (event.shiftKey && active === headingRef.current) { event.preventDefault(); first?.focus(); }
    if (!event.shiftKey && active === last) { event.preventDefault(); first?.focus(); }
  };

  const bounds = enlarged ? undefined : {
    left: `${rect.x * 100}%`, top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`, height: `${rect.height * 100}%`,
  };

  return <section
    ref={screenRef} className="room-computer-dialog"
    role="dialog" aria-modal="true" aria-labelledby="room-screen-title" aria-describedby="room-screen-instructions"
    onKeyDown={handleKeyDown}
  >
    <button type="button" className="room-computer-back" onClick={onBackToRoom}><RoomIcon name="left" /> Back to room</button>
    {!enlarged && webcam && <button
      type="button" className="room-webcam-hotspot"
      style={{ left: `${(webcam.rect.x + webcam.rect.width / 2) * 100}%`, top: `${(webcam.rect.y + webcam.rect.height / 2) * 100}%`, width: `${webcam.rect.width * 100}%`, height: `${webcam.rect.height * 100}%` }}
      aria-label={`${webcam.open ? 'Close' : 'Open'} webcam privacy cover`} aria-pressed={webcam.open}
      title={`${webcam.open ? 'Close' : 'Open'} webcam privacy cover`} onClick={onWebcam}
    />}
    <div className="room-computer-screen" style={bounds} data-device={action === 'experience' ? 'laptop' : 'monitor'} data-enlarged={enlarged}>
      <header className="room-screen-heading">
        <h2 ref={headingRef} id="room-screen-title" tabIndex="-1">{title}</h2>
        <div className="room-screen-actions">
          <button type="button" aria-label={enlarged ? 'Fit to computer' : 'Enlarge page'} aria-pressed={enlarged} onClick={() => setEnlarged(!enlarged)}>
            <RoomIcon name={enlarged ? 'collapse' : 'expand'} /><span>{enlarged ? 'Fit to screen' : 'Enlarge'}</span>
          </button>
          <button type="button" className="room-screen-close" aria-label="Close computer page" title="Close computer page" onClick={onClose}><span aria-hidden="true">×</span></button>
        </div>
      </header>
      <p className="room-screen-instructions" id="room-screen-instructions">Scroll this page to explore {title.toLowerCase()}. Enlarge it for more reading space. Close or Escape restores your previous view. Back to room opens the room overview.</p>
      <div className="room-screen-page" role="region" aria-label={`${title} page`} tabIndex="0">{children}</div>
    </div>
  </section>;
}
