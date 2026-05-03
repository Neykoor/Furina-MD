// ══════════════════════════════════════════════════════════════════
// NOTA: El Anti-Delete real se maneja en anti-master.js →
// antiDeleteDetectorMaster(), que es llamado desde loader.js
// cuando llega un protocolMessage de tipo 0 (revoke/eliminación).
//
// Este archivo ya no se usa directamente.
// ══════════════════════════════════════════════════════════════════

export async function antiDeleteDetector(sock, m) {
    // Stub: La implementación real está en anti-master.js → antiDeleteDetectorMaster()
    return false
}
