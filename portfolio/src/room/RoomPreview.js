import React from 'react';

export default function RoomPreview() {
  return <div className="room-preview-image"><img
    className="room-preview"
    src="/room-preview-1600.webp"
    srcSet="/room-preview-800.webp 800w, /room-preview-1600.webp 1600w, /room-preview-2400.webp 2400w"
    sizes="(max-width: 426px) calc(100vw - 36px), (max-width: 700px) 390px, (max-width: 1000px) 52vw, (min-width: 1600px) 870px, calc(56.82vw - 40px)"
    width="2400" height="2182"
    alt="Hillman’s room, with a desk, bed, shelf of plush toys and wardrobe"
    fetchpriority="high" decoding="async"
  /></div>;
}
