import React from 'react';

// 嬲爆面 — level 1 小嬲 / 2 中嬲 / 3 勁嬲. Hand-drawn wobbly circle + brows.
export function AngryFace({ level = 1, size = 32 }) {
  const brow = { 1: 'M9 13 L14 15', 2: 'M8 12 L14 15.5', 3: 'M7 11 L14 16' }[level];
  const browR = { 1: 'M23 13 L18 15', 2: 'M24 12 L18 15.5', 3: 'M25 11 L18 16' }[level];
  const mouth = {
    1: 'M12 22 Q16 20 20 22',                    // pout
    2: 'M12 23 Q16 19.5 20 23',                  // frown
    3: 'M12 24 Q16 18 20 24 Q16 26 12 24 Z',     // open shout
  }[level];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 C24 2.4 29.6 9 29 16 C28.4 24 23 29.6 16 29 C8 28.4 2.4 23 3 16 C3.6 8 9 3.6 16 3 Z"
        fill="var(--shb-face, #ffe3e0)" stroke="var(--shb-ink, #b3402f)" strokeWidth="1.6" strokeLinecap="round" />
      <path d={brow} stroke="var(--shb-ink, #b3402f)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d={browR} stroke="var(--shb-ink, #b3402f)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="17" r="1.4" fill="var(--shb-ink, #b3402f)" />
      <circle cx="20" cy="17" r="1.4" fill="var(--shb-ink, #b3402f)" />
      <path d={mouth} stroke="var(--shb-ink, #b3402f)" strokeWidth="1.8" strokeLinecap="round"
        fill={level === 3 ? 'var(--shb-ink, #b3402f)' : 'none'} />
      {level >= 2 && <path d="M24 7 L27 4 M26 9 L29.5 7" stroke="var(--shb-ink, #b3402f)" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

// 儲印卡格仔 — empty dashed slot, or a red ink seal with a tiny angry face.
export function StampSeal({ filled = false, size = 34 }) {
  if (!filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--shb-line, #d8c9b8)"
          strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shb-seal">
      <path d="M16 2.6 C24.8 2 30 9 29.4 16.4 C28.8 24.6 23 30 15.6 29.4 C7.8 28.8 2 23 2.6 15.6 C3.2 8 8.4 3.2 16 2.6 Z"
        fill="#c94f3d" opacity="0.9" />
      <g transform="translate(6.5 6.5) scale(0.6)" opacity="0.95">
        <path d="M8 12 L13 14.5 M24 12 L19 14.5" stroke="#fff2ec" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="11.5" cy="17.5" r="1.6" fill="#fff2ec" />
        <circle cx="20.5" cy="17.5" r="1.6" fill="#fff2ec" />
        <path d="M11 23.5 Q16 20 21 23.5" stroke="#fff2ec" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

export function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.1 0 11.2-2 15-5.5l-7.5-5.8c-2.1 1.4-4.7 2.2-7.5 2.2-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
