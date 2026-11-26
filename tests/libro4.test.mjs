import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L2_CHAPTERS, L2_SPOTS, L3_END, L4_END, bookOf, chapterNo } from '../public/js/shared/libro2.js';
import { RICETTE } from '../public/js/shared/cucina.js';
import { NPCS } from '../public/js/shared/lore.js';

const book4 = () => L2_CHAPTERS.slice(L3_END, L4_END);

test('il libro IV parte dopo L3_END', () => {
    assert.equal(bookOf(L3_END), 4);
    assert.equal(chapterNo(L3_END), 0);
    assert.equal(bookOf(L3_END - 1), 3);
    assert.equal(L4_END, L2_CHAPTERS.length);
    assert.equal(book4().length, 5);
});
test('ogni spot esiste', () => {
    for (const C of book4()) for (const S of C.steps) if (S.k === 'find') for (const k of S.spots) assert.ok(L2_SPOTS[k], C.id + ': ' + k);
});
test('ogni cook ha la sua ricetta', () => {
    const dishes = [];
    for (const C of book4()) for (const S of C.steps) if (S.k === 'cook') { assert.ok(RICETTE[S.dish], C.id); dishes.push(S.dish); }
    assert.deepEqual(dishes, ['tofu', 'zuppa', 'pane_ponte', 'cena']);
});
test('ogni who esiste', () => {
    for (const C of book4()) for (const S of C.steps) if (S.who) assert.ok(NPCS[S.who], C.id + ': ' + S.who);
});
test('livelli e capitoli', () => {
    assert.deepEqual(book4().map(C => C.lv), [11, 12, 13, 14, 15]);
    assert.deepEqual(book4().map(C => C.id), ['bosco', 'borsa', 'ponte', 'pippo', 'cena']);
    assert.ok(book4().every(C => C.book === 4));
});
test('la fine resta in sospeso: la scena del quaderno', () => {
    const C = book4()[4];
    assert.equal(C.end, 'Fine del Libro IV.');
    const last = C.steps[C.steps.length - 1];
    assert.equal(last.k, 'answer');
    assert.equal(last.who, 'lux');
    assert.ok(last.after[1].includes('«Quella la cuciniamo un\'altra volta.»'));
});
