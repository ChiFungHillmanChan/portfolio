// Existing launch surfaces. These load only after Play and never share the room's DOM.
export const ROOM_GAMES = {
  rubiks: { projectId: 23, title: 'Rubik’s Cube Practice', src: '/games/rubiks-cube-practice/index.html', route: '/rubiks-cube-practice', note: 'Learn the moves, practise algorithms, and solve at your own pace.' },
  connect4: { projectId: 14, title: 'Connect 4', src: '/games/connect4/index.html', route: '/connect4', note: 'Four in a row. One human, one machine. No account needed.' },
  cards: { projectId: 18, title: 'Card Drawer', src: '/games/card-drawer/index.html', route: '/card-drawer', note: 'A tabletop collection for a night with friends. Your game is saved on this device.' },
  siuheibou: { projectId: 21, title: '小氣簿 Siu Hei Bou', src: '/siu-hei-bou', route: '/siu-hei-bou', note: 'A little notebook for little grudges. Google sign-in and an internet connection are needed for your private book. If sign-in is blocked here, open the standalone app.' },
  dasiuyan: { projectId: 19, title: '打小人 Da Siu Yan', externalUrl: 'https://da-siu-yan.hillmanchan.com/', route: '/da-siu-yan', note: 'A playful Cantonese ritual for letting off steam. This game has moved to its own site and opens in a new tab. Your room will be waiting here.' },
};

// Shelf discoveries use the same projects and launch surfaces as the original props.
for (const action of ['rubiks', 'connect4', 'siuheibou', 'dasiuyan']) {
  ROOM_GAMES[`drawer-${action}`] = ROOM_GAMES[action];
}
