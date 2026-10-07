import React, { Suspense, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Outlet, useLocation } from 'react-router-dom';
import RoomPortfolio from './RoomPortfolio';

// Keep a single prepared room for this document's lifetime. It is never stored
// in Cache Storage, IndexedDB or localStorage, and starts only on a room visit.
export default function RoomSession() {
  const active = useLocation().pathname.replace(/\/$/, '') === '/room';
  const [visited, setVisited] = useState(active);
  const [departed, setDeparted] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => { if (active && !departed) setVisited(true); }, [active, departed]);
  useEffect(() => {
    const leave = () => {
      // Complete teardown before the browser can freeze this page in bfcache.
      flushSync(() => { setDeparted(true); setVisited(false); });
    };
    const restore = (event) => {
      if (!event.persisted) return;
      // A disposed WebGL context must not be reused after a browser restoration.
      setGeneration((value) => value + 1);
      setDeparted(false);
    };
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', restore);
    return () => {
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', restore);
    };
  }, []);

  return <>
    <Suspense fallback={<main style={{ padding: '3rem' }}><p role="status">Opening page…</p></main>}><Outlet /></Suspense>
    {!departed && (active || visited) && <RoomPortfolio key={generation} active={active} />}
  </>;
}
