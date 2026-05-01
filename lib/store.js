import { makeInMemoryStore } from '@whiskeysockets/baileys'
import Pino from 'pino'
import fs from 'fs'
import path from 'path'

const STORE_FILE = path.join(process.cwd(), 'data', 'store.json')
const SAVE_INTERVAL = 10_000

let store = null
let saveIntervalId = null

export function createStore() {
    if (store) return store

    store = makeInMemoryStore({ 
        logger: Pino({ level: 'silent' }) 
    })

    try {
        fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true })
    } catch {}

    try {
        if (fs.existsSync(STORE_FILE)) {
            store.readFromFile(STORE_FILE)
        }
    } catch (e) {
        console.error('Error leyendo store previo:', e.message)
    }

    saveIntervalId = setInterval(() => {
        try {
            store.writeToFile(STORE_FILE)
        } catch (e) {
            console.error('Error guardando store:', e.message)
        }
    }, SAVE_INTERVAL)

    return store
}

export function getStore() {
    if (!store) {
        throw new Error('Store no inicializado. Llama createStore() primero.')
    }
    return store
}

export function bindStoreToSocket(sock) {
    const s = getStore()
    s.bind(sock.ev)
}

export async function getMessageFromStore(key) {
    const s = getStore()
    try {
        const msg = await s.loadMessage(key.remoteJid, key.id)
        return msg?.message || undefined
    } catch {
        return { conversation: 'Mensaje no disponible' }
    }
}

export function destroyStore() {
    if (saveIntervalId) {
        clearInterval(saveIntervalId)
        saveIntervalId = null
    }
    if (store) {
        try {
            store.writeToFile(STORE_FILE)
        } catch {}
        store = null
    }
}
