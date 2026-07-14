import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFloorModel, tableMinBet, SECTION_ORDER } from '../floor-model.js';
import { GAME_STAKES, getTable } from '../../js/wallet/table-config.js';

const model = buildFloorModel();
const section = (id) => model.sections.find((s) => s.id === id);

test('four sections in canonical order', () => {
  assert.deepEqual(model.sections.map((s) => s.id), ['roulette', 'blackjack', 'baccarat', 'uth']);
  assert.deepEqual(SECTION_ORDER, ['roulette', 'blackjack', 'baccarat', 'uth']);
});

for (const game of ['roulette', 'blackjack', 'baccarat']) {
  test(`${game} tables mirror GAME_STAKES (count, order, copy)`, () => {
    const stakes = GAME_STAKES[game];
    const tables = section(game).tables;
    assert.equal(tables.length, stakes.length);
    stakes.forEach((s, i) => {
      assert.equal(tables[i].key, s.key);
      assert.equal(tables[i].gameId, s.gameId);
      assert.equal(tables[i].tierName, s.name);
      assert.equal(tables[i].limitsText, s.limitsText);
      assert.equal(tables[i].id, `${game}:${s.key}`);
    });
  });
}

test('hrefs deep-link the 2D pages with ?stake=', () => {
  assert.equal(section('roulette').tables[0].href, '../roulette/index.html?stake=micro');
  assert.equal(section('blackjack').tables[2].href, '../blackjack/game-mode/index.html?stake=std');
  assert.equal(section('baccarat').tables[3].href, '../baccarat/game-mode/index.html?stake=high');
});

test('minBet is the smallest min across the wallet table betTypes', () => {
  assert.equal(tableMinBet(getTable('blackjack-micro')), 50);
  assert.equal(tableMinBet(getTable('roulette-micro')), 10);
  assert.equal(section('blackjack').tables[3].minBet, 200); // blackjack-high sides min
});

test('UTH: one table, no ?stake=, buy-in min, 4 reserved spots', () => {
  const uth = section('uth');
  assert.equal(uth.tables.length, 1);
  assert.equal(uth.tables[0].href, '../ultimate-texas-holdem/index.html');
  assert.ok(!uth.tables[0].href.includes('stake'));
  assert.equal(uth.tables[0].minBet, 10000);
  assert.equal(uth.tables[0].id, 'uth:main');
  assert.equal(uth.reservedSpots, 4);
});
