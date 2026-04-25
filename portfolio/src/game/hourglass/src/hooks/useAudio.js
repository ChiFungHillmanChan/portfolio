import { Howl } from 'howler';
import { useEffect, useRef } from 'react';

export function useAudio({ muted, running, done }) {
  const sandRef = useRef(null);
  const chimeRef = useRef(null);
  const initialisedRef = useRef(false);
  const doneFiredRef = useRef(false);

  // Lazy-initialise on first user interaction (autoplay policy).
  useEffect(() => {
    const init = () => {
      if (initialisedRef.current) return;
      initialisedRef.current = true;
      sandRef.current = new Howl({ src: ['/audio/sand-loop.mp3'], loop: true, volume: 0.25 });
      chimeRef.current = new Howl({ src: ['/audio/chime.mp3'], volume: 0.7 });
    };
    const on = () => init();
    window.addEventListener('pointerdown', on, { once: true });
    window.addEventListener('keydown', on, { once: true });
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, []);

  // Sand loop follows running + muted.
  useEffect(() => {
    const sand = sandRef.current;
    if (!sand) return;
    if (running && !muted) {
      if (!sand.playing()) sand.play();
      sand.fade(0, 0.25, 800);
    } else {
      if (sand.playing()) sand.fade(sand.volume(), 0, 400);
      setTimeout(() => sand.stop(), 450);
    }
  }, [running, muted]);

  // Chime fires once per "done" transition.
  useEffect(() => {
    if (done && !doneFiredRef.current) {
      doneFiredRef.current = true;
      if (!muted && chimeRef.current) chimeRef.current.play();
    }
    if (!done) doneFiredRef.current = false;
  }, [done, muted]);
}
