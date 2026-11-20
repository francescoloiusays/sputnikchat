// =====================================================================
//  IL ROMANZO DELLA NEBBIA, LIBRO II (client + server)
//  Capitolo I · La Porta Chiusa: la chiave del Faro Spento.
//  Si gioca anche senza aver finito il Libro I: la Guardiana non chiede
//  a nessuno da dove viene.
// =====================================================================

// Le tappe: 0 da cominciare · 1 chiedi a Brace · 2 cerca i cocci · 3 torna da Brace
//           4 apri la porta · 5 finito
export const L2 = {
    title: 'La Porta Chiusa', sub: 'Libro II · Capitolo I', lv: 2,
    xp: 300, coins: 120, coccioXp: 25, title_id: 'portinaio',
    // i vetri della lanterna, sparsi dalla notte in cui il faro si spense
    cocci: {
        faro: { x: 150, z: -163.4, name: 'Il coccio dello scoglio', hint: 'sulla riva del Faro, dalla parte opposta al molo' },
        spiaggia: { x: 82, z: 26, name: 'Il coccio della spiaggia', hint: 'sulla spiaggia a est dell\'isola grande' },
        fossato: { x: 28, z: -76, swim: true, name: 'Il coccio del castello', hint: 'nell\'acqua sotto le mura del castello: ci si arriva solo a nuoto' },
    },
    // davanti alla porta del faro (in coordinate del mondo)
    door: { x: 135.1, z: -145, r: 4.5 },
};
export const COCCI = Object.keys(L2.cocci);

export function newL2() { return { s: 0, cocci: [] }; }

// la prossima cosa da fare, in una riga (null se il capitolo non è aperto o è finito)
export function l2Next(st) {
    if (!st) return null;
    switch (st.s) {
        case 1: return 'Chiedi a Mastro Brace della chiave del faro (Forgia di Vulcano)';
        case 2: {
            const left = COCCI.filter(k => !st.cocci.includes(k));
            return `Ritrova i Cocci di Lanterna (${COCCI.length - left.length}/${COCCI.length}): ${L2.cocci[left[0]]?.hint || ''}`;
        }
        case 3: return 'Porta i tre cocci a Mastro Brace: forgerà la chiave';
        case 4: return 'Torna al Faro Spento e apri la porta';
        default: return null;
    }
}
