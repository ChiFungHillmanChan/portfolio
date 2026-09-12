import React, { useEffect } from 'react';

export default function RubiksCubePractice() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Rubik’s Cube Practice';
    return () => { document.title = previousTitle; };
  }, []);

  return <iframe title="Rubik’s Cube Practice" src="/games/rubiks-cube-practice/index.html" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, background: '#f5f7fb' }} />;
}
