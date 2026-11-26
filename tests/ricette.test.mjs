import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RICETTE, COOK, INGR, foodMods, cookStars } from '../public/js/shared/cucina.js';

test('foodMods scade', () => {
    const food = { dish: 'tofu', stars: 3, until: 1000 };
    assert.equal(foodMods(food, 999).hp, 0.04);
    assert.equal(foodMods(food, 1000), null);
    assert.equal(foodMods(null, 0), null);
});
test('le stelle pesano', () => {
    assert.ok(Math.abs(foodMods({ dish: 'zuppa', stars: 1, until: 9e15 }, 0).atk - 0.024) < 1e-9);
    assert.ok(Math.abs(foodMods({ dish: 'zuppa', stars: 2, until: 9e15 }, 0).atk - 0.027) < 1e-9);
});
test('ogni ricetta usa solo ingredienti esistenti', () => {
    for (const [id, R] of Object.entries(RICETTE)) for (const k of Object.keys(R.need)) assert.ok(INGR[k], id + ': ' + k);
});
test('le quattro ricette del libro', () => {
    assert.deepEqual(Object.keys(RICETTE), ['tofu', 'zuppa', 'pane_ponte', 'cena']);
    assert.deepEqual(RICETTE.cena.need, { acqua_nebbia: 1, funghi: 2, erbe: 2, bacche: 2, anguilla: 1, pane_tobia: 1 });
});
test('dal punteggio alle stelle', () => {
    assert.equal(cookStars(0.9), 3); assert.equal(cookStars(0.85), 3);
    assert.equal(cookStars(0.6), 2); assert.equal(cookStars(0.5), 2);
    assert.equal(cookStars(0.2), 1); assert.equal(cookStars(-3), 1);
});
test('le costanti della cucina', () => {
    assert.equal(COOK.daily, 3); assert.equal(COOK.durMs, 30 * 60 * 1000); assert.deepEqual(COOK.star, [0.8, 0.9, 1]);
});
