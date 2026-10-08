// =====================================================================
//  PERSISTENZA: profili giocatori + annunci del Bazar.
//  - Se esiste MONGODB_URI usa MongoDB (consigliato su Render: il disco
//    del piano gratuito si azzera a ogni riavvio).
//  - Altrimenti salva su file JSON (data/db.json o DATA_DIR).
//  Tutto resta in memoria; le scritture sono raggruppate ogni ~1.5s.
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';

export async function createStore(baseDir) {
    if (process.env.MONGODB_URI) {
        try { return await mongoStore(process.env.MONGODB_URI); }
        catch (e) { console.error('[store] MongoDB non disponibile, uso il file JSON:', e.message); }
    }
    const dir = process.env.DATA_DIR || path.join(baseDir, 'data');
    return fileStore(path.join(dir, 'db.json'));
}

function fileStore(file) {
    let db = { profiles: {}, listings: [] };
    try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* primo avvio */ }
    db.profiles ||= {}; db.listings ||= [];
    let timer = null;
    const flush = () => {
        timer = null;
        try {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file + '.tmp', JSON.stringify(db));
            fs.renameSync(file + '.tmp', file);
        } catch (e) { console.error('[store] salvataggio fallito:', e.message); }
    };
    const schedule = () => { if (!timer) timer = setTimeout(flush, 1500); };
    console.log(`[store] file JSON: ${file} (${Object.keys(db.profiles).length} profili)`);
    return {
        kind: 'file',
        all: () => Object.values(db.profiles),
        get: token => db.profiles[token] || null,
        put: p => { db.profiles[p.token] = p; schedule(); },
        listings: () => db.listings,
        saveListings: schedule,
        flush,
    };
}

async function mongoStore(uri) {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri);
    await client.connect();
    const mdb = client.db(process.env.MONGODB_DB || 'sputnikchat');
    const col = mdb.collection('profiles');
    const meta = mdb.collection('meta');
    const cache = {};
    for await (const doc of col.find({})) { delete doc._id; cache[doc.token] = doc; }
    const listings = (await meta.findOne({ _id: 'market' }))?.listings || [];
    const dirty = new Set();
    let listingsDirty = false, timer = null;
    const flush = async () => {
        timer = null;
        const toks = [...dirty]; dirty.clear();
        try {
            if (toks.length) {
                await col.bulkWrite(toks.map(t => ({ replaceOne: { filter: { token: t }, replacement: { ...cache[t] }, upsert: true } })));
            }
            if (listingsDirty) { listingsDirty = false; await meta.updateOne({ _id: 'market' }, { $set: { listings } }, { upsert: true }); }
        } catch (e) { console.error('[store] MongoDB scrittura fallita:', e.message); }
    };
    const schedule = () => { if (!timer) timer = setTimeout(flush, 1500); };
    console.log(`[store] MongoDB connesso (${Object.keys(cache).length} profili)`);
    return {
        kind: 'mongo',
        all: () => Object.values(cache),
        get: token => cache[token] || null,
        put: p => { cache[p.token] = p; dirty.add(p.token); schedule(); },
        listings: () => listings,
        saveListings: () => { listingsDirty = true; schedule(); },
        flush,
    };
}
