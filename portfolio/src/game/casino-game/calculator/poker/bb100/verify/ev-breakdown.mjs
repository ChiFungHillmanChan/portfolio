// verify/ev-breakdown.mjs
// Prints per-hand EV breakdown for all all-in showdown hands.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../js/parser/gg-parser.mjs';
import { formatUSD } from '../js/stats/money.mjs';
import { equity, equityMultiway } from '../js/equity/equity.mjs';
import { encodeHand } from '../js/equity/cards.mjs';

const DIR = process.argv[2] || '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8';
const STREET_BOARD_LEN = { preflop: 0, flop: 3, turn: 4, river: 5 };

const files = readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.txt'));
const allHands = [];
for (const f of files) {
  const r = parseFile(f, readFileSync(join(DIR, f), 'utf8'));
  allHands.push(...r.hands);
}

// Filter: anyAllIn=true AND Hero reached showdown AND showdown has villain cards
const evHands = allHands.filter(h =>
  h.anyAllIn && h.reachedShowdown && h.showdown &&
  Object.keys(h.showdown.villains ?? {}).length > 0
);

console.log(`Hands triggering EV calc: ${evHands.length}\n`);

for (const h of evHands) {
  const villainNames = Object.keys(h.showdown.villains ?? {});
  const heroAllIn = h.heroAllIn;
  const hasUncalled = h.uncalledUC > 0n;
  const isMultiway = villainNames.length > 1;

  const tag = isMultiway ? 'MULTI-WAY'
    : (!heroAllIn ? 'VILLAIN-ALLIN'
      : (hasUncalled ? 'HERO-ALLIN-UNCALLED' : 'HERO-ALLIN-CLEAN'));

  const heroEffective = h.contributedUC - h.uncalledUC;
  const street = h.allInStreet ?? h.anyAllInStreet;
  const streetLen = STREET_BOARD_LEN[street];
  const board = h.showdown.board ?? [];
  const partialBoard = encodeHand(board.slice(0, streetLen));
  const heroCardsEnc = encodeHand(h.showdown.hero);

  let evBeforeRake = null;
  let evDetail = '';

  try {
    if (villainNames.length === 1) {
      const vCards = encodeHand(h.showdown.villains[villainNames[0]]);
      const eq = equity(heroCardsEnc, vCards, partialBoard);
      const potAtRisk = h.totalPotUC;
      const evShare = BigInt(Math.round(eq * 1_000_000)) * potAtRisk / 1_000_000n;
      evBeforeRake = evShare - heroEffective;
      evDetail = `eq=${(eq * 100).toFixed(1)}%`;
    } else {
      // Multi-way: side-pot decomposition
      const fees = h.rakeUC + (h.jackpotUC ?? 0n);
      const players = [{ name: 'Hero', cards: heroCardsEnc, contrib: heroEffective }];
      for (const name of villainNames) {
        const contrib = h.contributions?.[name] ?? 0n;
        if (contrib <= 0n) continue;
        players.push({ name, cards: encodeHand(h.showdown.villains[name]), contrib });
      }

      let sumContribs = 0n;
      for (const p of players) sumContribs += p.contrib;
      const deadInPot = h.totalPotUC - sumContribs; // before-rake

      players.sort((a, b) => (a.contrib < b.contrib ? -1 : a.contrib > b.contrib ? 1 : 0));

      let heroEv = 0n;
      let prevTier = 0n;
      let remainingPlayers = players.length;
      let firstPot = true;

      const potBreakdown = [];
      for (const p of players) {
        const tierContrib = p.contrib - prevTier;
        if (tierContrib <= 0n) { prevTier = p.contrib; remainingPlayers--; continue; }
        let potSize = tierContrib * BigInt(remainingPlayers);
        if (firstPot && deadInPot > 0n) { potSize += deadInPot; firstPot = false; } else { firstPot = false; }
        const contestants = players.filter(x => x.contrib >= p.contrib);
        const heroIn = contestants.some(x => x.name === 'Hero');
        let eq = 0;
        if (heroIn) {
          const others = contestants.filter(x => x.name !== 'Hero');
          if (others.length === 1) eq = equity(heroCardsEnc, others[0].cards, partialBoard);
          else if (others.length === 0) eq = 1.0;
          else eq = equityMultiway(heroCardsEnc, others.map(o => o.cards), partialBoard);
          const eqMicros = BigInt(Math.round(eq * 1_000_000));
          heroEv += (eqMicros * potSize) / 1_000_000n;
        }
        potBreakdown.push(`pot${potBreakdown.length + 1}=${formatUSD(potSize)} eq=${(eq * 100).toFixed(1)}%`);
        prevTier = p.contrib;
        remainingPlayers--;
      }
      evBeforeRake = heroEv - heroEffective;
      evDetail = potBreakdown.join(' | ');

      // Show contributions for each player
      console.log(`  Contributions: Hero=${formatUSD(heroEffective)}, ${
        players.filter(p => p.name !== 'Hero')
               .map(p => `${p.name}=${formatUSD(p.contrib)}`).join(', ')
      }, dead=${formatUSD(deadInPot)}`);
    }
  } catch (e) {
    evDetail = 'err: ' + e.message;
  }

  console.log(
    `[${tag}] id=${h.id} street=${street} heroEff=${formatUSD(heroEffective)} ` +
    `pot=${formatUSD(h.totalPotUC)} ev=${evBeforeRake != null ? formatUSD(evBeforeRake) : '?'} ` +
    `${evDetail}`
  );
}
