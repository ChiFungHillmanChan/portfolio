import React from 'react';

const PATHS = {
  'up-right': 'M7 17 17 7M7 7h10v10',
  left: 'M19 12H5m6-6-6 6 6 6',
  expand: 'M14 4h6v6m0-6-7 7M10 20H4v-6m0 6 7-7',
  collapse: 'M20 4l-7 7m0-6v6h6M4 20l7-7m-6 0h6v6',
};

export default function RoomIcon({ name = 'up-right' }) {
  return <svg className="room-icon" viewBox="0 0 24 24" width="1em" height="1em"
    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false"><path d={PATHS[name]} /></svg>;
}
