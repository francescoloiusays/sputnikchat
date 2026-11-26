import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDuel, duelSetup } from '../public/js/shared/fight.js';

const base = (extra = {}) => ({ id: 'x', name: 'X', element: 'fuoco', weapon: null, level: 10, talents: { forza: 0, tempra: 0, maestria: 0 }, gear: [], ...extra });

test('il piatto dà vita', () => {
    const plain = createDuel(base(), base({ id: 'y' }), 1).f.a;
    const fed = createDuel(base({ food: { hp: 0.04 } }), base({ id: 'y' }), 1).f.a;
    assert.ok(Math.abs(fed.maxHp / plain.maxHp - 1.04) < 0.01);
});
test('il piatto dà attacco, carica e recupero', () => {
    const plain = createDuel(base(), base({ id: 'y' }), 1).f.a;
    const fed = createDuel(base({ food: { atk: 0.03, meter: 0.08, regen: 0.25 } }), base({ id: 'y' }), 1).f.a;
    assert.ok(Math.abs(fed.atk / plain.atk - 1.03) < 1e-9);
    assert.ok(Math.abs(fed.meterGain / plain.meterGain - 1.08) < 1e-9);
    assert.ok(Math.abs(fed.regen - (plain.regen || 0) - 0.25) < 1e-9);
});
test('la palestra e il piatto arrivano anche ai duelli locali', () => {
    const s = duelSetup({ id: 'x', name: 'X', element: 'fuoco', look: { weapon: null }, level: 5, gym: 7, food: { hp: 0.04 } });
    assert.equal(s.gym, 7);
    assert.deepEqual(s.food, { hp: 0.04 });
    assert.equal(s.weapon, null);
});
