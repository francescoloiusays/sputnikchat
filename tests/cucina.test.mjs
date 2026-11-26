import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INGR, DISPENSA_MAX, BOSCO_NODES, addIngr, hasIngr, takeIngr, dawn, minutesToDawn } from '../public/js/shared/cucina.js';
import { FISH } from '../public/js/shared/catalog.js';
import { EPOCH, islandHour } from '../public/js/shared/clock.js';

const at = (min) => EPOCH + min * 60000;   // minuti reali dall'inizio di un giorno dell'isola

test('addIngr rispetta il massimo', () => {
    const p = { dispensa: { funghi: DISPENSA_MAX - 1 } };
    assert.equal(addIngr(p, 'funghi', 3), 1);
    assert.equal(p.dispensa.funghi, DISPENSA_MAX);
});
test('addIngr crea la dispensa se manca', () => {
    const p = {};
    assert.equal(addIngr(p, 'erbe', 2), 2);
    assert.equal(p.dispensa.erbe, 2);
});
test('hasIngr dice cosa manca', () => {
    assert.equal(hasIngr({ dispensa: { funghi: 1 } }, { funghi: 2 }), INGR.funghi.name);
    assert.equal(hasIngr({ dispensa: { funghi: 2, luccio: 1 } }, { funghi: 2, luccio: 1 }), null);
});
test('takeIngr toglie quello che serve', () => {
    const p = { dispensa: { funghi: 3, erbe: 1 } };
    takeIngr(p, { funghi: 2, erbe: 1 });
    assert.deepEqual(p.dispensa, { funghi: 1, erbe: 0 });
});
test('i pesci sono ingredienti, i rottami e le bottiglie no', () => {
    assert.equal(INGR.luccio.name, FISH.luccio.name);
    assert.equal(INGR.anguilla.name, FISH.anguilla.name);
    assert.equal(INGR.stivale, undefined);
    assert.equal(INGR.bottiglia, undefined);
});
test('acqua solo all\'alba', () => {
    assert.ok(Math.abs(islandHour(at(22.75)) - 6) < 0.01);
    assert.equal(dawn(at(22.75)), true);
    assert.equal(dawn(at(5.9)), false);
    assert.ok(minutesToDawn(at(5.9)) > 10);
    assert.equal(minutesToDawn(at(22.75)), 0);
});
test('i nodi del bosco: sei per funghi, erbe e bacche, due per l\'acqua', () => {
    const n = (k) => BOSCO_NODES.filter(x => x.kind === k).length;
    assert.deepEqual([n('funghi'), n('erbe'), n('bacche'), n('acqua_nebbia')], [6, 6, 6, 2]);
    assert.equal(new Set(BOSCO_NODES.map(x => x.id)).size, BOSCO_NODES.length);
});
