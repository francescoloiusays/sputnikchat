import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSCO, BP, INN, boscoMask, inBosco, nearBoscoBuild, pathDistBosco } from '../public/js/shared/bosco.js';

test('centro e collo sono terra', () => {
    assert.ok(boscoMask(BOSCO.x, BOSCO.z) > 0.5);
    assert.ok(boscoMask(-100, 13) > 0);
});
test('fuori è mare', () => {
    assert.ok(boscoMask(-290, 10) < 0);
    assert.ok(boscoMask(-200, -95) < 0);
});
test('la secca resta fuori', () => {
    assert.ok(boscoMask(-148, 118) < 0);
});
test('la locanda è spianata e senza alberi', () => {
    assert.equal(nearBoscoBuild(...BP.locanda), true);
    assert.equal(nearBoscoBuild(INN.x, INN.z), true);
});
test('inBosco', () => {
    assert.equal(inBosco(...BP.locanda), true);
    assert.equal(inBosco(0, 20), false);
    assert.equal(inBosco(128, 24), false);
});
test('un sentiero porta dal collo alla locanda', () => {
    assert.ok(pathDistBosco(-70, 16) < 3);
    assert.ok(pathDistBosco(...BP.soglia) < 3);
});
test('il collo di terra è dentro il bosco', () => {
    assert.equal(inBosco(-100, 13), true);
    assert.ok(boscoMask(-60, 15) > 0.2);
});
