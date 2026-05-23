// Storage helpers — todos los módulos usan estas funciones
// Centralizado para poder migrar a IndexedDB en Sistema 2 sin tocar los módulos

export function rd(key, def = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : def
  } catch { return def }
}

export function wr(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
    return true
  } catch { return false }
}

export function storageKB(key) {
  try {
    const raw = localStorage.getItem(key) || ""
    return Math.round(raw.length / 1024)
  } catch { return 0 }
}

export function totalStorageKB() {
  const keys = Object.values(SK_LIST)
  return keys.reduce((sum, k) => sum + storageKB(k), 0)
}

// Lista de claves para totalStorageKB — importar SK desde tokens en los módulos
const SK_LIST = {
  proyectos:"tc_v1_proyectos", registros:"tc_v1_registros",
  aprendizaje:"tc_v1_aprendizaje", diario:"tc_v1_evolucion",
  perfil:"tc_v1_perfil", cursos:"tc_v1_cursos", objetivos:"tc_v1_objetivos",
}

// Exportar todo como backup
export function exportarBackupCompleto() {
  const data = {}
  Object.entries(SK_LIST).forEach(([k, sk]) => {
    const val = rd(sk)
    if (val) data[k] = val
  })
  const json = JSON.stringify({
    version: "tectra_v1",
    exportadoEn: new Date().toISOString(),
    datos: data
  }, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `tectra-backup-${new Date().toISOString().split("T")[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Importar backup
export function importarBackup(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)
    if (!data.version || !data.datos) return { ok: false, err: "Formato inválido" }
    const SK_MAP = Object.fromEntries(
      Object.entries(SK_LIST).map(([k, sk]) => [k, sk])
    )
    let imported = 0
    Object.entries(data.datos).forEach(([k, val]) => {
      if (SK_MAP[k]) { wr(SK_MAP[k], val); imported++ }
    })
    return { ok: true, imported }
  } catch(e) {
    return { ok: false, err: e.message }
  }
}
