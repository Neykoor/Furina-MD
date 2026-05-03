// ══════════════════════════════════════════════════════════════════
// NOTA: El Anti-Call real se maneja en anti-master.js →
// antiCallDetectorMaster(), que es llamado desde loader.js
// con el evento 'call' de Baileys.
//
// Las llamadas de WhatsApp NO llegan como mensajes en grupos;
// llegan como un evento separado 'call'. Por eso este archivo
// ya no se usa directamente, la lógica está centralizada.
// ══════════════════════════════════════════════════════════════════

export async function antiCallDetector(sock, callData) {
    // Stub: La implementación real está en anti-master.js → antiCallDetectorMaster()
    return false
}
