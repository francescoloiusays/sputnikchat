import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INN, innPt, INN_SEATS, INN_ROOM } from '../public/js/shared/bosco.js';
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
test('tutti e cinque allo stesso tavolo', () => {
    const T = INN_ROOM.tables[0];
    for (const id of ['ettore', 'rina', 'nando', 'greta', 'pippo']) {
        const S = INN_SEATS[id];
        assert.ok(Math.abs(S.lx - T.lx) <= T.w / 2 + 0.8 && Math.abs(S.lz - T.lz) <= T.d / 2 + 0.6, id);
        // guarda verso il tavolo
        const fx = Math.sin(S.lry), fz = Math.cos(S.lry), tx = T.lx - S.lx, tz = T.lz - S.lz;
        assert.ok(fx * tx + fz * tz > 0, id + ' guarda il tavolo');
    }
    // le coppie una accanto all'altra, sullo stesso lato
    assert.equal(INN_SEATS.ettore.lz, INN_SEATS.rina.lz);
    assert.equal(INN_SEATS.nando.lz, INN_SEATS.greta.lz);
});
