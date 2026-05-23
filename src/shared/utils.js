export const uid = () => Math.random().toString(36).slice(2, 9)
export const hoy = () => new Date().toISOString().split("T")[0]

export function semanaISO(fecha) {
  const d = fecha ? new Date(fecha) : new Date()
  const dw = d.getDay() || 7
  d.setDate(d.getDate() + 4 - dw)
  const ys = new Date(d.getFullYear(), 0, 1)
  const wn = Math.ceil((((d - ys) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(wn).padStart(2, "0")}`
}

// parseCoord: 24 formatos validados en campo
// 2547891.234 / 2,547,891.234 / 2.547.891,234 / 2547891,234
export function parseCoord(str) {
  if (!str && str !== 0) return null
  let s = String(str).trim()
  if (!s) return null
  const hasPunto = s.includes(".")
  const hasComa  = s.includes(",")
  if (hasPunto && hasComa) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\.+/g, "").replace(",", ".")
    } else {
      s = s.replace(/,/g, "")
    }
  } else if (hasComa && !hasPunto) {
    const partes = s.replace(/^-/, "").split(",")
    if (partes.length === 2) {
      s = s.replace(",", ".")
    } else {
      const esMiles = partes.slice(1).every(p => /^\d{3}$/.test(p))
      s = esMiles ? s.replace(/,/g, "") : null
      if (!s) return null
    }
  }
  s = s.replace(/\s/g, "")
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export function fmtCoord(val) {
  if (val === null || val === undefined || val === "") return "—"
  const n = parseFloat(val)
  if (isNaN(n)) return String(val)
  return n.toLocaleString("es-CL", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}
