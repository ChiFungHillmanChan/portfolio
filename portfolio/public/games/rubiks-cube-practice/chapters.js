export const stages = {
  C: { title: 'Build the cross', short: 'Cross', subtitle: 'Four edges. A solid foundation.', count: 'Calculated for your cube', color: '#3159df' },
  F: { title: 'Solve the first two layers', short: 'First two layers', subtitle: 'Find the pair. Give it a home.', count: '41 standard cases', color: '#bc551d' },
  O: { title: 'Orient the last layer', short: 'Orient last layer', subtitle: 'Recognise the pattern. Turn the top yellow.', count: '57 algorithms', color: '#7953c2' },
  P: { title: 'Permute the last layer', short: 'Permute last layer', subtitle: 'Put every piece in its final position.', count: '21 algorithms', color: '#147e73' },
};

export const chapters = {
  N: {
    title: 'Get to know your cube', subtitle: 'The notation and habits behind every algorithm.', time: '4 min read',
    intro: 'CFOP is a four-stage method for a standard 3 × 3 cube: Cross, First two layers, Orient the last layer, and Permute the last layer. Start slowly. A move you understand is more useful than a string you can only recite.',
    sections: [
      { title: 'Hold it consistently', text: 'The default diagrams use yellow on top, white underneath, green in front and red on the right. Centers identify the faces; they never swap places during ordinary face turns. Match your real cube to the shown centers before following an algorithm. If your cube has a different color scheme, set its centers in the color editor.' },
      { title: 'Read the moves', text: 'U is the upper face, D down, R right, L left, F front and B back. A letter alone turns that face 90° clockwise as if you were looking straight at it. A prime (′) reverses the direction. A 2 means a half-turn. R U R′ U′ is four separate moves, not one simultaneous motion.' },
      { title: 'Wide turns, slices and rotations', text: 'A lowercase letter turns two layers: r turns the right two layers. M turns the middle slice in the direction of L; E follows D; S follows F. x rotates the entire cube like R, y like U, and z like F. These change your holding position. The player shows the new centers after every move.' },
      { title: 'Learn in manageable steps', text: 'Learn the cross, then understand how a corner and edge form an F2L pair. Two-look OLL and PLL give you a manageable bridge to a complete solve. Add full PLL, then more OLL cases as your recognition improves. Revisit slow F2L solutions throughout. Chapter checkmarks and learned cases stay in this browser.' },
    ],
    drill: 'Try R U R′ U′ on a solved cube. Repeat the same four moves six times: you will return to solved. Watch the corner travel instead of rushing.',
    links: [['WCA move notation', 'https://www.worldcubeassociation.org/regulations/#article-12-notation'], ['J Perm notation guide', 'https://jperm.net/3x3/moves']],
  },
  C: {
    title: 'Build the cross', subtitle: 'Solve four edges while planning ahead.', time: '5 min read',
    intro: 'Make a white cross on the bottom face, with each edge’s other sticker matching its side center. Four white stickers together are not enough: the white–green edge belongs beside the green center, and the same rule applies to the other three edges.',
    sections: [
      { title: '01 · Locate the four edges', text: 'Keep white underneath. Find the white–green, white–red, white–blue and white–orange edges. Ignore corners for now. Note where each edge is and which way its white sticker points. In practice mode, enter all six faces so the tool can check that your cube is physically possible.' },
      { title: '02 · Plan before turning', text: 'Work out an insertion for one edge, then extend your plan to a second. A half-turn of a side face can place an aligned edge from the top onto the bottom. If an edge is flipped, move it into a position where a side turn can orient it. Turn the bottom layer when it helps preserve relationships between the cross pieces.' },
      { title: '03 · Keep the side colors aligned', text: 'Edges can travel together. Think about their order around the bottom: green, red, blue, orange in our default scheme. You may temporarily build the cross offset from the centers, then align it with a D turn. Finish with all four side stickers matching before starting F2L.' },
      { title: '04 · Practise efficient solutions', text: 'Cross has no small, fixed list of algorithms. The tool calculates a shortest solution for the four bottom edges using face turns, with a half-turn counting as one move. Use it to compare your plan with another route. The shortest solution is not always the easiest to execute or the best setup for your first pair.' },
    ],
    drill: 'Inspect a scramble, plan two cross edges, then close your eyes and execute. Add a third and fourth edge as this becomes comfortable. Aim for a planned solution before aiming for speed.',
    links: [['J Perm cross lesson', 'https://jperm.net/3x3/cfop'], ['CubeSkills cross tutorials', 'https://www.cubeskills.com/tutorials']],
  },
  F: {
    title: 'Solve the first two layers', subtitle: 'Treat a corner and edge as one pair.', time: '7 min read',
    intro: 'F2L solves the four bottom corners and the four middle-layer edges together. Each slot needs one corner with white on it and the matching edge without yellow. The library contains the 41 standard unsolved cases, including pairs in their slot.',
    sections: [
      { title: '01 · Choose a pair', text: 'Start with the white–green–red corner and the green–red edge. Their home is the front-right slot in the default holding position. Locate both pieces by all their colors, not just a single sticker. To solve another slot, turn the whole cube until that slot is front-right, or select the target slot in practice mode.' },
      { title: '02 · Bring the pieces into view', text: 'Most pair-building happens on the upper layer. If a needed piece is trapped in an unsolved slot, lift it out with a short side–upper–side sequence, then reassess. Use an unsolved slot as working space. Do not extract a completed pair just to make another case look familiar.' },
      { title: '03 · Pair, then insert', text: 'Watch the stickers facing upward. Separated pieces with different colors on top behave differently from pieces with matching colors on top. A connected corner–edge pair can be moved above its slot, then inserted with a short trigger such as R U′ R′. The case diagram supplies the exact orientation; a trigger alone is not a solution for every pair.' },
      { title: '04 · Preserve what you have solved', text: 'After each insertion, the cross and previously completed slots must remain solved. Repeat for all four slots. When a corner or edge is buried elsewhere, the practice tool first looks for a short extraction and then a standard case. Read its preparation moves before the main algorithm.' },
      { title: '05 · Make it flow', text: 'Understand the short cases first, then learn efficient solutions to awkward ones. Practise without timing: turn slowly enough to locate your next pair while finishing the current one. Alternative algorithms can favor a different grip; their Practice buttons set up the exact holding position for that variation.' },
    ],
    drill: 'Pick one case. Set it up from solved using the setup moves, identify the corner and edge, then solve it while watching only those two pieces. Repeat from each of the four slots.',
    links: [['CubeSkills F2L reference', 'https://www.cubeskills.com/uploads/pdf/tutorials/f2l.pdf'], ['J Perm advanced F2L', 'https://jperm.net/3x3/cfop/f2l']],
  },
  O: {
    title: 'Orient the last layer', subtitle: 'Make the top one color without breaking F2L.', time: '6 min read',
    intro: 'OLL changes the orientation of the last-layer pieces until all nine top stickers are yellow. Their side colors do not need to match yet. There are 57 unsolved orientation cases, plus the already-oriented state.',
    sections: [
      { title: '01 · Check the first two layers', text: 'All four F2L slots and the cross must be complete before applying an OLL algorithm. Keep yellow on top. The recognition diagrams highlight yellow stickers on the top and around its four sides. Grey means any non-yellow color; it is deliberately not a required color match.' },
      { title: '02 · Recognise the shape and side stickers', text: 'First look at the top: a dot, line, L, cross or another shape narrows the choices. Next compare the yellow stickers on the sides. Two cases can have the same top pattern but different corner orientations. Rotate only the upper face to match the shown angle; the tool includes this alignment in the returned solution.' },
      { title: '03 · Start with two-look OLL', text: 'First orient the edges to form a yellow cross. The line algorithm F R U R′ U′ F′ and the wide-front variation f R U R′ U′ f′ cover the line and L situations in the correct holding angles; the dot needs both stages. Then use one of seven corner-orientation algorithms: OLL 21 through 27. The chapter’s two-look filter includes these and the two edge-building cases. Reassess the pattern after each algorithm.' },
      { title: '04 · Expand to full OLL', text: 'Learn shapes in small groups, not numerical order. Begin with Sune and anti-Sune, then familiar shapes that reuse the same triggers. Execute deliberately and check that the lower layers survive. Full OLL reduces the whole orientation stage to one recognized case and its algorithm, with any required upper-face alignment.' },
    ],
    drill: 'Choose a case, hide the algorithm, and identify its group and holding angle. Reveal and execute it. Practise recognition again with a U turn added to the same case.',
    links: [['J Perm full OLL', 'https://jperm.net/algs/oll'], ['J Perm two-look OLL', 'https://jperm.net/algs/2look/oll'], ['CubeSkills OLL algorithms', 'https://www.cubeskills.com/uploads/pdf/tutorials/oll-algorithms.pdf']],
  },
  P: {
    title: 'Permute the last layer', subtitle: 'Move the pieces into place, then align the top.', time: '6 min read',
    intro: 'PLL rearranges the last-layer corners and edges while keeping the top oriented and the first two layers solved. There are 21 unsolved permutation cases. One final upper-face turn, called AUF, may still be needed after the algorithm.',
    sections: [
      { title: '01 · Read the sides', text: 'The yellow face is already complete, so look around its sides. A bar is a row of matching stickers; headlights are matching corner stickers on the same face. Compare which pieces need to cycle or swap. The diagrams show all four side strips so similar cases can be distinguished.' },
      { title: '02 · Use a two-look bridge', text: 'First place the corners using a suitable corner-permuting algorithm, then reassess and solve the edges with Ua, Ub, H or Z. A common learning set uses Aa and E for the corner step. These algorithms can also move edges during the first look; that is expected. The two-look filter collects these six cases for focused learning.' },
      { title: '03 · Learn all 21 cases', text: 'Start with the four edge-only permutations. Add A, T and J cases, then build out the remaining families. Pay special attention to similar-looking G and R permutations. A short algorithm with difficult regrips can be slower than a longer one you execute smoothly. Use recommended sequences as a starting point and try the provided variations.' },
      { title: '04 · Finish with AUF', text: 'After the pieces are in the right relative order, align the top to the side centers with U, U′ or U2 if needed. The recognizer checks the entered colors against the centers and includes the final adjustment. Do every move in the result, including preparation and AUF, before checking for solved.' },
    ],
    drill: 'Recognise the permutation from its side stickers before showing the algorithm. Execute slowly, predict the final AUF, then check all six faces. Mark a case learned only when you recognise and execute it reliably.',
    links: [['J Perm full PLL', 'https://jperm.net/algs/pll'], ['J Perm two-look PLL', 'https://jperm.net/algs/2look/pll'], ['CubeSkills PLL algorithms', 'https://www.cubeskills.com/uploads/pdf/tutorials/pll-algorithms.pdf']],
  },
};

export const twoLookIds = new Set(['oll-21', 'oll-22', 'oll-23', 'oll-24', 'oll-25', 'oll-26', 'oll-27', 'oll-44', 'oll-45', 'pll-aa', 'pll-e', 'pll-ua', 'pll-ub', 'pll-h', 'pll-z']);
