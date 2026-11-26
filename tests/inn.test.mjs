import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INN, innPt, INN_SEATS } from '../public/js/shared/bosco.js';
import { NPCS } from '../public/js/shared/lore.js';

test('la porta della locanda guarda verso il collo di terra (est)', () => {
    const [cx, cz] = innPt(0, 0), [dx] = innPt(0, INN.d / 2);
    assert.ok(Math.abs(cx - INN.x) < 1e-9 && Math.abs(cz - INN.z) < 1e-9);
    assert.ok(dx > cx + 4);
});
test('Lux e i cinque stanno dentro la sala', () => {
    for (const id of ['lux', 'ettore', 'rina', 'nando', 'greta', 'pippo']) {
        const S = INN_SEATS[id];
        assert.ok(Math.abs(S.lx) < INN.w / 2 - 0.5 && Math.abs(S.lz) < INN.d / 2 - 0.5, id);
        assert.ok(NPCS[id], id);
        assert.ok(Math.hypot(NPCS[id].x - INN.x, NPCS[id].z - INN.z) < 7, id);
    }
});
test('i cinque sono seduti, Lux no', () => {
    assert.equal(NPCS.lux.sit, false);
    for (const id of ['ettore', 'rina', 'nando', 'greta', 'pippo']) assert.equal(NPCS[id].sit, true, id);
});
