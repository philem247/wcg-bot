// Single-file auth state for baileys. Replaces useMultiFileAuthState's 45+
// individual files with one JSON file (default: session/creds.json). The
// session directory still exists (the instance lock lives there), but holds
// 2 files (creds.json + .lock) instead of 45+.
//
// Interface contract matches useMultiFileAuthState:
//   { state: { creds, keys: { get, set } }, saveCreds: () => Promise<void> }
//
// Additional: flush() for graceful shutdown — forces any debounced write to
// disk synchronously before the process exits.

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs'
import { dirname } from 'node:path'
import { initAuthCreds, BufferJSON } from 'baileys'

export function useSingleFileAuthState(filePath) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  let store = { creds: null, keys: {} }

  // Load existing state
  if (existsSync(filePath)) {
    try {
      store = JSON.parse(readFileSync(filePath, 'utf-8'), BufferJSON.reviver)
    } catch (e) {
      // Corrupted file (e.g. a crash mid-write before atomic rename existed) —
      // preserve it instead of silently discarding, it may be recoverable.
      const corruptPath = `${filePath}.corrupt-${Date.now()}`
      try {
        renameSync(filePath, corruptPath)
      } catch { /* best effort */ }
      console.error(`Session file could not be read (${e.message}). Preserved as ${corruptPath}. Starting fresh — re-pairing will be needed.`)
      store = { creds: null, keys: {} }
    }
  }

  if (!store.keys) store.keys = {}

  const creds = store.creds || initAuthCreds()

  // Debounced disk write — multiple key updates in quick succession (common
  // during connect) produce one write, not dozens. 500ms is long enough to
  // coalesce a burst of pre-key writes and short enough that a Ctrl+C between
  // debounce and flush still lands via the shutdown handler's flush() call.
  let writeTimer = null
  function persist() {
    try {
      store.creds = creds
      const tmpPath = `${filePath}.tmp`
      writeFileSync(tmpPath, JSON.stringify(store, BufferJSON.replacer))
      renameSync(tmpPath, filePath) // atomic on same filesystem — live file is never partial
    } catch (e) {
      console.error('Failed to save auth state:', e.message)
    }
  }

  function scheduleSave() {
    if (writeTimer) return
    writeTimer = setTimeout(() => {
      writeTimer = null
      persist()
    }, 500)
  }

  // Flush any pending debounced write synchronously. Called from index.js's
  // shutdown handler so in-flight credential writes land before process.exit().
  function flush() {
    if (writeTimer) {
      clearTimeout(writeTimer)
      writeTimer = null
    }
    persist()
  }

  const state = {
    creds,
    keys: {
      get(type, ids) {
        const typeStore = store.keys[type] || {}
        const result = {}
        for (const id of ids) {
          if (id in typeStore) {
            result[id] = typeStore[id]
          }
        }
        return result
      },
      set(data) {
        for (const [type, entries] of Object.entries(data)) {
          if (!store.keys[type]) store.keys[type] = {}
          for (const [id, value] of Object.entries(entries)) {
            if (value === null || value === undefined) {
              delete store.keys[type][id]
            } else {
              store.keys[type][id] = value
            }
          }
        }
        scheduleSave()
      },
    },
  }

  async function saveCreds() {
    scheduleSave()
  }

  return { state, saveCreds, flush }
}
