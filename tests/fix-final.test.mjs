import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cookGate, COOK, missingFish } from '../public/js/shared/cucina.js';
import { rollFish, FISH } from '../public/js/shared/catalog.js';
import { inInn, innPt, INN } from '../public/js/shared/bosco.js';

test('il piatto del libro non conta nei tre al giorno', () => {
    assert.deepEqual(cookGate({ dish: 'tofu', storyDish: 'tofu', learned: [], used: 3 }), { err: null, counts: false });
});
test('rifare un piatto imparato conta nei tre al giorno', () => {
    assert.deepEqual(cookGate({ dish: 'tofu', storyDish: null, learned: ['tofu'], used: 1 }), { err: null, counts: true });
    assert.match(cookGate({ dish: 'tofu', storyDish: null, learned: ['tofu'], used: COOK.daily }).err, /Per oggi basta/);
});
test('una ricetta non insegnata non si cucina', () => {
    assert.match(cookGate({ dish: 'cena', storyDish: 'tofu', learned: ['tofu'], used: 0 }).err, /non te l'ha ancora insegnata/);
    assert.match(cookGate({ dish: 'boh', storyDish: null, learned: [], used: 0 }).err, /non esiste/);
});
test('i pesci che mancano per il piatto del libro', () => {
    assert.deepEqual(missingFish('pane_ponte', { dispensa: {} }), ['lanterna']);
    assert.deepEqual(missingFish('pane_ponte', { dispensa: { lanterna: 1 } }), []);
    assert.deepEqual(missingFish('tofu', { dispensa: {} }), []);
});
test('il pesce che serve abbocca più spesso', () => {
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const rate = (boost) => { let n = 0; for (let i = 0; i < 20000; i++) if (rollFish(true, rnd, 0, boost) === 'lanterna') n++; return n / 20000; };
    const base = rate({}), boosted = rate({ lanterna: 5 });
    assert.ok(boosted > base * 3, `${base} → ${boosted}`);
});
test('si cucina solo dentro la locanda', () => {
    assert.equal(inInn(...innPt(-2.4, -3.5)), true);
    assert.equal(inInn(...innPt(-2.4, -INN.d / 2 - 1)), false);
});
