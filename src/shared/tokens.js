// Tokens de diseño TECTRA — fuente única de verdad
export const T = {
  base:"#141A21", surface:"#1A2230", panel:"#1E2838",
  row:"#192028", rowAlt:"#1C2430", rowSel:"#1A3050", input:"#111820",
  b1:"#1E2D40", b2:"#253650", b3:"#304060",
  t1:"#C4D4E4", t2:"#607080", t3:"#384858", t4:"#203040",
  blue:"#1E72D8", violet:"#5C2ED4", cyan:"#0096A8",
  green:"#009068", amber:"#C08000", red:"#B82828",
  redBg:"rgba(184,40,40,0.10)", amberBg:"rgba(192,128,0,0.10)",
  data:"#7AAADA", coord:"#3EC490",
  mono:"'JetBrains Mono', monospace",
  sans:"'IBM Plex Sans', Arial, sans-serif",
}

// Storage keys — centralizadas para evitar typos entre módulos
export const SK = {
  proyectos:   "tc_v1_proyectos",
  registros:   "tc_v1_registros",
  aprendizaje: "tc_v1_aprendizaje",
  diario:      "tc_v1_evolucion",
  perfil:      "tc_v1_perfil",
  cursos:      "tc_v1_cursos",
  objetivos:   "tc_v1_objetivos",
  config:      "tc_v1_config",
}

// Catálogos compartidos
export const CATS = [
  {v:"topografia",  l:"Topografía",        c:"#3EC490"},
  {v:"civil3d",     l:"Civil 3D",           c:"#1E72D8"},
  {v:"autocad",     l:"AutoCAD",            c:"#7AAADA"},
  {v:"control_geo", l:"Control Geométrico", c:"#C08000"},
  {v:"calculo",     l:"Cálculo Técnico",    c:"#3EC490"},
  {v:"normativa",   l:"Normativa",          c:"#607080"},
  {v:"instrumento", l:"Instrumentación",    c:"#009068"},
  {v:"gestion",     l:"Gestión de Obra",    c:"#5C2ED4"},
]

export const CATS_MAP = Object.fromEntries(CATS.map(c => [c.v, c]))

// Niveles de habilidad — usado por APRENDIZAJE, EVOLUCIÓN, motor S2
// desc define la evidencia requerida para cada nivel
export const NIVELES = [
  { v:"fundamentos", l:"Fundamentos", desc:"Conceptos base, sin obra previa",    c:"#607080" },
  { v:"aplicado",    l:"Aplicado",    desc:"Lo usé en obra real",                c:"#1E72D8" },
  { v:"avanzado",    l:"Avanzado",    desc:"Lo domino, podría enseñarlo",        c:"#009068" },
]
export const NIVELES_MAP = Object.fromEntries(NIVELES.map(n => [n.v, n]))
