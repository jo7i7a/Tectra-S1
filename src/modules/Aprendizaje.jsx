import { useState, useMemo, useEffect } from "react"
import { T, SK, CATS, CATS_MAP, NIVELES, NIVELES_MAP } from "../shared/tokens"
import { rd, wr } from "../shared/storage"
import { uid, hoy } from "../shared/utils"
import { L, B, TL, HR, Btn, TInput, TSelect, TArea, Field, Topbar, Tabs, Nav, ConfirmBarra } from "../shared/ui"

// ================================================================
// TECTRA — MÓDULO APRENDIZAJE
// Biblioteca técnica operacional viva.
//
// No es app de notas. No es wiki. No es curso online.
// Es el lugar donde la experiencia de obra se convierte en
// conocimiento técnico estructurado y evidencia profesional.
//
// Schema preparado para Sistema 2:
//   categoria + nivel + tipo → cálculo automático de habilidades
//   vecesAplicado + ultimaAplicacion → diferencia "leí" vs "apliqué"
//   proyectoId → trazabilidad de cuándo y dónde se aprendió
// ================================================================

// ── Tokens (idénticos al sistema TECTRA) ─────────────────────

// ── Persistencia ──────────────────────────────────────────────
const STORAGE_PROY_KEY = "tc_v1_proyectos"


// ── Utilidades ────────────────────────────────────────────────

// ── CATÁLOGOS TÉCNICOS ────────────────────────────────────────

var CAT_MAP = CATS_MAP

var NIV_MAP = NIVELES_MAP

// Tipos: forma del conocimiento
var TIPOS = [
  { v:"procedimiento",    l:"Procedimiento",      icon:"▶", desc:"Pasos para hacer algo" },
  { v:"comando",          l:"Comando",             icon:"$", desc:"Sintaxis de comando exacto" },
  { v:"solucion",         l:"Solución",            icon:"✓", desc:"Resolví un problema específico" },
  { v:"error_resuelto",   l:"Error resuelto",      icon:"!", desc:"Cometí este error y lo corregí" },
  { v:"checklist",        l:"Checklist",           icon:"☑", desc:"Lista de verificación operacional" },
  { v:"workflow",         l:"Workflow",             icon:"⇄", desc:"Flujo de trabajo completo" },
  { v:"formula",          l:"Fórmula",              icon:"f", desc:"Cálculo o fórmula técnica" },
  { v:"configuracion",    l:"Configuración",       icon:"⚙", desc:"Config de instrumento o software" },
  { v:"leccion",          l:"Lección de obra",     icon:"◉", desc:"Aprendizaje de la experiencia real" },
  { v:"referencia",       l:"Referencia",           icon:"§", desc:"Dato técnico para consultar" },
]
var TIPO_MAP = {}
TIPOS.forEach(function(t){ TIPO_MAP[t.v] = t })

// Estado de dominio — diferencia clave: "leí" vs "apliqué" vs "domino"
var DOMINIO = [
  { v:"aprendiendo", l:"Aprendiendo",  desc:"Lo registré, estudiando",           c:T.t2   },
  { v:"aplicando",   l:"Aplicando",    desc:"Lo usé en obra al menos una vez",   c:T.blue },
  { v:"dominado",    l:"Dominado",     desc:"Lo aplico con fluidez y confianza", c:T.green},
]
var DOM_MAP = {}
DOMINIO.forEach(function(d){ DOM_MAP[d.v] = d })

// ── Datos demo con estructura real ────────────────────────────
var DEMO_NOTAS = [
  {
    id:"n1", titulo:"Orientación de estación total — procedimiento completo",
    categoria:"topografia", nivel:"aplicado", tipo:"procedimiento",
    dominio:"dominado", vecesAplicado:23, ultimaAplicacion:"2025-05-14",
    proyectoId:null, proyectoNombre:null,
    contenido:"1. Estacionar sobre punto conocido y centrar.\n2. Medir altura de instrumento (HI).\n3. Orientar al norte o al punto de referencia.\n4. Ingresar coordenadas del punto estación.\n5. Apuntar al BM con coordenadas conocidas.\n6. Verificar residuo de orientación (< 10\").\n7. Registrar HI y fecha en libreta.",
    sintaxis:null, ejemplo:"Estación en BM-01 (2547891.234 / 498234.876 / 1847.230), orientación a BM-02.",
    etiquetas:["BM","orientacion","estacion_total"],
    creadoEn:"2025-01-15", actualizadoEn:"2025-05-14",
  },
  {
    id:"n2", titulo:"PERFILES — Crear superficie desde puntos",
    categoria:"civil3d", nivel:"aplicado", tipo:"comando",
    dominio:"aplicando", vecesAplicado:8, ultimaAplicacion:"2025-04-30",
    proyectoId:"p4", proyectoNombre:"Modelo Civil 3D — Carretera Sur",
    contenido:"Crear superficie TIN desde datos de puntos importados.",
    sintaxis:"Home → Palettes → Create Surface → TIN Surface\nImportar: Add Data → Point File\nFormato: PNEZD (Point Number, Easting, Northing, Elevation, Description)",
    ejemplo:"Para el corredor de la carretera sur usé puntos en formato CSV PNEZD.",
    etiquetas:["superficies","TIN","puntos","civil3d"],
    creadoEn:"2025-03-10", actualizadoEn:"2025-04-30",
  },
  {
    id:"n3", titulo:"Error: cierre de vuelta fuera de tolerancia",
    categoria:"topografia", nivel:"aplicado", tipo:"error_resuelto",
    dominio:"dominado", vecesAplicado:5, ultimaAplicacion:"2025-05-08",
    proyectoId:null, proyectoNombre:null,
    contenido:"PROBLEMA: Cierre de vuelta > 30\" al orientar.\n\nCAUSAS POSIBLES:\n1. Prisma mal centrado en BM\n2. Burbuja del instrumento desnivelada\n3. HI mal medida\n4. Error en coordenadas del BM\n\nSOLUCIÓN:\n1. Verificar centrado del prisma con plomada óptica\n2. Recentrar instrumento con tornillos calantes\n3. Remedir HI con cinta desde centro del eje vertical\n4. Verificar coordenadas contra libreta original",
    sintaxis:null, ejemplo:"Obra Edificio Norte: cierre 45\" → revisé prisma → centrado incorrecto → corregí a 8\".",
    etiquetas:["cierre","orientacion","error","tolerancia"],
    creadoEn:"2025-02-20", actualizadoEn:"2025-05-08",
  },
  {
    id:"n4", titulo:"Checklist previo a levantamiento topográfico",
    categoria:"topografia", nivel:"aplicado", tipo:"checklist",
    dominio:"dominado", vecesAplicado:18, ultimaAplicacion:"2025-05-16",
    proyectoId:null, proyectoNombre:null,
    contenido:"ANTES DE SALIR A TERRENO:\n□ Batería cargada al 100%\n□ Memoria interna/SD con espacio\n□ Coordenadas de BM cargadas en el instrumento\n□ Libreta y lápiz\n□ Cinta métrica y plomada de hilo\n□ Trípode con todos los tornillos\n□ Prisma y porta-prisma\n□ Código de proyecto confirmado\n\nEN EL PUNTO ESTACIÓN:\n□ Centrado con plomada láser\n□ Nivelado con burbuja esférica y toroidea\n□ HI medida y registrada\n□ Orientación verificada con residuo < 10\"",
    sintaxis:null, ejemplo:null,
    etiquetas:["checklist","terreno","previo","equipo"],
    creadoEn:"2025-01-20", actualizadoEn:"2025-05-16",
  },
]

// ── Style helpers ─────────────────────────────────────────────

// ── Átomos ────────────────────────────────────────────────────


// ── ConfirmBarra — reutilizable del sistema ───────────────────

// ================================================================
// PANEL PRINCIPAL — biblioteca con vista de mapa + lista
// ================================================================

// ── Panel de habilidades — resumen rápido por categoría ───────
// Muestra el estado de dominio actual agrupado por área técnica
// En Sistema 2 esto se calcula automáticamente desde los datos
function PanelHabilidades(p) {
  var notas = p.notas
  // Agrupar por categoría + nivel de dominio
  var mapa = {}
  CATS.forEach(function(c) { mapa[c.v] = {total:0,aplicando:0,dominado:0} })
  notas.forEach(function(n) {
    if (!mapa[n.categoria]) return
    mapa[n.categoria].total++
    if (n.dominio === "aplicando") mapa[n.categoria].aplicando++
    if (n.dominio === "dominado")  mapa[n.categoria].dominado++
  })

  // Solo mostrar categorías con al menos 1 nota
  var activas = CATS.filter(function(c){ return mapa[c.v].total > 0 })
  if (activas.length === 0) return null

  return (
    <div style={{padding:"8px 10px",background:T.surface,borderBottom:"1px solid "+T.b2}}>
      <div style={L(T.t3,{marginBottom:8,fontSize:9})}>MAPA DE DOMINIO TÉCNICO</div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {activas.map(function(cat) {
          var m = mapa[cat.v]
          var pctDom = m.total > 0 ? Math.round((m.dominado/m.total)*100) : 0
          var pctApl = m.total > 0 ? Math.round((m.aplicando/m.total)*100) : 0
          return (
            <div key={cat.v} onClick={function(){p.onFiltroCategoria(cat.v)}}
              style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
                background:p.filtroActivo===cat.v?T.rowSel:"transparent",
                borderRadius:2,padding:"2px 4px",margin:"0 -4px"}}>
              <span style={L(cat.c,{fontSize:9,minWidth:90,flexShrink:0})}>{cat.l}</span>
              {/* Barra de dominio */}
              <div style={{flex:1,height:4,background:T.b2,borderRadius:0,overflow:"hidden"}}>
                {/* Verde = dominado */}
                <div style={{height:"100%",width:pctDom+"%",background:T.green,display:"inline-block"}}/>
                {/* Azul = aplicando */}
                <div style={{height:"100%",width:pctApl+"%",background:T.blue,display:"inline-block"}}/>
              </div>
              <span style={L(T.t3,{fontSize:8,minWidth:28,textAlign:"right"})}>{m.total}</span>
            </div>
          )
        })}
      </div>
      <div style={{display:"flex",gap:12,marginTop:6}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:8,height:3,background:T.green}}/>
          <span style={L(T.t4,{fontSize:8})}>DOMINADO</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:8,height:3,background:T.blue}}/>
          <span style={L(T.t4,{fontSize:8})}>APLICANDO</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:8,height:3,background:T.b2}}/>
          <span style={L(T.t4,{fontSize:8})}>APRENDIENDO</span>
        </div>
      </div>
    </div>
  )
}

// ── Lista de notas técnicas ────────────────────────────────────
function ListaNotas(p) {
  var [filtroTab,    setFiltroTab]    = useState("biblioteca")
  var [filtroNivel,  setFiltroNivel]  = useState("todos")
  var [busqueda,     setBusqueda]     = useState("")
  var [filtroCategoria, setFiltroCategoria] = useState(null)

  var notas = p.notas

  // Estadísticas rápidas para el header
  var stats = useMemo(function() {
    return {
      total:      notas.length,
      dominado:   notas.filter(function(n){return n.dominio==="dominado"}).length,
      aplicando:  notas.filter(function(n){return n.dominio==="aplicando"}).length,
      totalAplic: notas.reduce(function(s,n){return s+(n.vecesAplicado||0)},0),
    }
  }, [notas])

  // Filtrado combinado
  var filtradas = useMemo(function() {
    return notas.filter(function(n) {
      // Tab: recientes / más usadas / pendientes
      if (filtroTab === "recientes") {
        var hace30 = new Date(); hace30.setDate(hace30.getDate()-30)
        return new Date(n.creadoEn) >= hace30
      }
      if (filtroTab === "usadas") return (n.vecesAplicado||0) >= 3
      if (filtroTab === "pendientes") return n.dominio === "aprendiendo"

      // Biblioteca general: todos con filtros adicionales
      var mNivel = filtroNivel === "todos" || n.nivel === filtroNivel
      var mCat   = !filtroCategoria || n.categoria === filtroCategoria
      var mBusq  = !busqueda || [n.titulo, n.contenido||"", (n.etiquetas||[]).join(" ")]
        .some(function(s){ return s.toLowerCase().includes(busqueda.toLowerCase()) })
      return mNivel && mCat && mBusq
    })
  }, [notas, filtroTab, filtroNivel, filtroCategoria, busqueda])

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="APRENDIZAJE" accent={T.blue}
        sub={stats.total+" ENTRADAS · "+stats.totalAplic+" APLICACIONES"}
        right={
          <span style={L(T.green,{fontSize:9})}>{stats.dominado} DOM</span>
        }
      />

      {/* Tabs operativos */}
      <Tabs
        tabs={[
          {k:"biblioteca", l:"BIBLIOTECA"},
          {k:"recientes",  l:"RECIENTES"},
          {k:"usadas",     l:"MÁS USADAS"},
          {k:"pendientes", l:"POR DOMINAR"},
        ]}
        active={filtroTab}
        onChange={function(k){setFiltroTab(k);setFiltroCategoria(null)}}
        accent={T.blue}
      />

      {/* Mapa de dominio — solo en biblioteca */}
      {filtroTab === "biblioteca" && (
        <PanelHabilidades
          notas={notas}
          filtroActivo={filtroCategoria}
          onFiltroCategoria={function(c){
            setFiltroCategoria(filtroCategoria===c?null:c)
          }}
        />
      )}

      {/* Búsqueda */}
      {filtroTab === "biblioteca" && (
        <div style={{padding:"6px 8px",background:T.surface,borderBottom:"1px solid "+T.b1}}>
          <div style={{position:"relative"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth="2"
              style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)"}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input autoComplete="off" autoCorrect="off" value={busqueda} onChange={function(e){setBusqueda(e.target.value)}}
              placeholder="Buscar por título, contenido, etiqueta..."
              style={{width:"100%",background:T.input,border:"1px solid "+(busqueda?T.b3:T.b2),
                borderRadius:3,color:T.t1,fontFamily:T.sans,fontSize:13,
                padding:"6px 8px 6px 24px",outline:"none"}} />
          </div>
        </div>
      )}

      {/* Filtro nivel */}
      {filtroTab === "biblioteca" && (
        <div style={{display:"flex",background:T.panel,borderBottom:"1px solid "+T.b2,flexShrink:0}}>
          {[{v:"todos",l:"TODOS",c:T.t2}].concat(NIVELES).map(function(niv,i) {
            var on = filtroNivel === niv.v
            var cnt = niv.v==="todos" ? notas.length : notas.filter(function(n){return n.nivel===niv.v}).length
            return (
              <button key={niv.v} onClick={function(){setFiltroNivel(niv.v)}}
                style={{flex:1,height:28,background:on?T.rowSel:"transparent",
                  borderRight:i<3?"1px solid "+T.b1:"none",
                  borderTop:"none",borderBottom:on?"2px solid "+(niv.c||T.blue):"2px solid transparent",
                  borderLeft:"none",fontFamily:T.mono,fontSize:9,fontWeight:700,
                  color:on?(niv.c||T.blue):T.t4,letterSpacing:"0.08em",textTransform:"uppercase",
                  cursor:"pointer",WebkitTapHighlightColor:"transparent",marginBottom:-1}}>
                {niv.l} {cnt}
              </button>
            )
          })}
        </div>
      )}

      {/* Lista */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtradas.length === 0 ? (
          <div style={{padding:"36px 16px",textAlign:"center"}}>
            <p style={L(T.t3,{marginBottom:10})}>
              {filtroTab==="pendientes"?"TODO DOMINADO — BUEN TRABAJO":"SIN ENTRADAS"}
            </p>
            {filtroTab==="biblioteca"&&notas.length===0&&(
              <button onClick={p.onCargarDemo}
                style={{fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.t3,
                  background:"none",border:"1px solid "+T.b2,borderRadius:2,
                  padding:"5px 10px",cursor:"pointer",letterSpacing:"0.10em",
                  textTransform:"uppercase",WebkitTapHighlightColor:"transparent"}}>
                CARGAR EJEMPLOS
              </button>
            )}
          </div>
        ) : (
          filtradas.map(function(nota, i) {
            return (
              <FilaNota key={nota.id} nota={nota} alt={i%2===1}
                onClick={function(){p.onSelect(nota)}} />
            )
          })
        )}
      </div>

      {/* Acción principal */}
      <div style={{padding:"8px 10px",background:T.surface,borderTop:"1px solid "+T.b2,flexShrink:0}}>
        <Btn onClick={p.onNueva} variant="primary" color={T.blue} full>
          NUEVA ENTRADA
        </Btn>
      </div>
    </div>
  )
}

// Fila de nota — diseño técnico denso
function FilaNota(p) {
  var n = p.nota
  var [pr,setPr] = useState(false)
  var cat  = CAT_MAP[n.categoria]  || {l:n.categoria, c:T.t3}
  var tipo = TIPO_MAP[n.tipo]      || {icon:"·", l:n.tipo}
  var dom  = DOM_MAP[n.dominio]    || {c:T.t3}
  var niv  = NIV_MAP[n.nivel]      || {c:T.t3}

  return (
    <div onClick={p.onClick}
      onPointerDown={function(){setPr(true)}} onPointerUp={function(){setPr(false)}} onPointerLeave={function(){setPr(false)}}
      style={{background:pr?T.rowSel:p.alt?T.rowAlt:T.row,
        borderBottom:"1px solid "+T.b1,padding:"8px 10px",
        cursor:"pointer",WebkitTapHighlightColor:"transparent",
        transition:"background 80ms"}}>

      {/* Fila 1: categoría + nivel + tipo */}
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
        <span style={L(cat.c,{fontSize:9})}>{cat.l.toUpperCase()}</span>
        <span style={{color:T.t4,fontSize:9}}>·</span>
        <span style={L(niv.c,{fontSize:9})}>{n.nivel.toUpperCase()}</span>
        <span style={{color:T.t4,fontSize:9}}>·</span>
        <span style={{fontFamily:T.mono,fontSize:10,color:T.t3}}>{tipo.icon}</span>
        <span style={L(T.t3,{fontSize:9})}>{tipo.l}</span>
        <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
          {n.vecesAplicado>0&&(
            <span style={L(dom.c,{fontSize:8})}>{n.vecesAplicado}×</span>
          )}
          <div style={{width:5,height:5,borderRadius:1,background:dom.c,flexShrink:0}}/>
        </span>
      </div>

      {/* Fila 2: título */}
      <p style={Object.assign({},
        {fontFamily:T.sans,fontSize:14,fontWeight:500,color:T.t1,
          lineHeight:1.25,marginBottom:4,
          overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"})}>
        {n.titulo}
      </p>

      {/* Fila 3: proyecto + fecha */}
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {n.proyectoNombre&&(
          <>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth="2">
              <path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/>
            </svg>
            <span style={B(T.t3,{fontSize:11,flex:1,
              overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"})}>
              {n.proyectoNombre}
            </span>
          </>
        )}
        <span style={L(T.t4,{fontSize:8,marginLeft:n.proyectoNombre?"0":"auto"})}>
          {n.ultimaAplicacion||n.creadoEn}
        </span>
      </div>
    </div>
  )
}

// ================================================================
// DETALLE DE NOTA TÉCNICA
// ================================================================
function DetallaNota(p) {
  var [nota,   setNota]   = useState(p.nota)
  var [tab,    setTab]    = useState("contenido")
  var [confirmDel, setConfirmDel] = useState(false)

  function marcarAplicada() {
    var u = Object.assign({}, nota, {
      vecesAplicado:    (nota.vecesAplicado||0) + 1,
      ultimaAplicacion: hoy(),
      dominio: nota.dominio === "aprendiendo" ? "aplicando" : nota.dominio,
      actualizadoEn:    hoy(),
    })
    setNota(u)
    p.onActualizar(u)
  }

  function avanzarDominio() {
    var orden = ["aprendiendo","aplicando","dominado"]
    var idx = orden.indexOf(nota.dominio)
    var siguiente = idx < 2 ? orden[idx+1] : "dominado"
    var u = Object.assign({}, nota, {dominio:siguiente, actualizadoEn:hoy()})
    setNota(u)
    p.onActualizar(u)
  }

  var cat  = CAT_MAP[nota.categoria]  || {l:nota.categoria, c:T.t3}
  var tipo = TIPO_MAP[nota.tipo]      || {icon:"·", l:nota.tipo}
  var dom  = DOM_MAP[nota.dominio]    || {l:nota.dominio, c:T.t3}
  var niv  = NIV_MAP[nota.nivel]      || {l:nota.nivel, c:T.t3}

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      {confirmDel && (
        <ConfirmBarra
          msg={"ELIMINAR ESTA ENTRADA"}
          onOk={function(){p.onEliminar(nota.id)}}
          onCancel={function(){setConfirmDel(false)}}
          danger
        />
      )}

      <Topbar title={nota.titulo} accent={cat.c} onBack={p.onBack}
        sub={cat.l.toUpperCase()+" · "+niv.l.toUpperCase()}
        right={
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:1,background:dom.c}}/>
            <span style={L(dom.c,{fontSize:9})}>{dom.l}</span>
          </div>
        }
      />

      {/* Acción de campo — el botón más importante del módulo */}
      <div style={{
        padding:"8px 10px",
        background:T.panel,
        borderBottom:"1px solid "+T.b2,
        display:"flex",alignItems:"center",gap:8,
      }}>
        <button onClick={marcarAplicada}
          style={{
            flex:1,height:40,
            background:T.blue+"18",
            border:"1px solid "+T.blue+"40",
            borderRadius:3,
            fontFamily:T.mono,fontSize:10,fontWeight:700,
            color:T.blue,letterSpacing:"0.10em",textTransform:"uppercase",
            cursor:"pointer",WebkitTapHighlightColor:"transparent",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          APLIQUÉ ESTO HOY
        </button>
        {nota.vecesAplicado > 0 && (
          <span style={L(dom.c,{fontSize:10})}>
            {nota.vecesAplicado}× aplicado
          </span>
        )}
      </div>

      <Tabs
        tabs={[
          {k:"contenido", l:"CONTENIDO"},
          {k:"datos",     l:"DATOS"},
        ]}
        active={tab} onChange={setTab} accent={cat.c}
      />

      <div style={{flex:1,overflowY:"auto"}}>

        {tab==="contenido"&&(
          <div>
            {/* Sintaxis — solo para comandos */}
            {nota.sintaxis&&(
              <div style={{padding:"8px 12px",borderBottom:"1px solid "+T.b1,
                background:T.base}}>
                <div style={L(T.t3,{marginBottom:5,fontSize:9})}>SINTAXIS</div>
                <pre style={{fontFamily:T.mono,fontSize:12,color:T.coord,
                  lineHeight:1.7,whiteSpace:"pre-wrap",margin:0,
                  background:"transparent"}}>
                  {nota.sintaxis}
                </pre>
              </div>
            )}

            {/* Contenido principal */}
            <div style={{padding:"8px 12px",borderBottom:"1px solid "+T.b1}}>
              {nota.tipo === "procedimiento" || nota.tipo === "checklist" || nota.tipo === "workflow" ? (
                // Para procedimientos: formato estructurado de pasos
                <div>
                  <div style={L(T.t3,{marginBottom:8,fontSize:9})}>
                    {nota.tipo==="checklist"?"CHECKLIST":"PROCEDIMIENTO"}
                  </div>
                  <div style={{fontFamily:T.sans,fontSize:14,color:T.t1,
                    lineHeight:1.8,whiteSpace:"pre-wrap"}}>
                    {nota.contenido}
                  </div>
                </div>
              ) : (
                <div style={{fontFamily:T.sans,fontSize:14,color:T.t1,
                  lineHeight:1.8,whiteSpace:"pre-wrap"}}>
                  {nota.contenido}
                </div>
              )}
            </div>

            {/* Ejemplo de uso real */}
            {nota.ejemplo&&(
              <div style={{padding:"8px 12px",borderBottom:"1px solid "+T.b1,
                background:T.blue+"08"}}>
                <div style={L(T.blue,{marginBottom:5,fontSize:9,opacity:.7})}>EJEMPLO DE USO REAL</div>
                <p style={B(T.t2,{fontSize:13,lineHeight:1.7})}>{nota.ejemplo}</p>
              </div>
            )}

            {/* Etiquetas */}
            {nota.etiquetas&&nota.etiquetas.length>0&&(
              <div style={{padding:"8px 12px",display:"flex",gap:5,flexWrap:"wrap"}}>
                {nota.etiquetas.map(function(et){
                  return (
                    <span key={et} style={{fontFamily:T.mono,fontSize:9,fontWeight:700,
                      color:T.t3,background:T.s3||T.panel,
                      border:"1px solid "+T.b2,borderRadius:2,
                      padding:"2px 6px",letterSpacing:"0.08em"}}>
                      {et}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab==="datos"&&(
          <div>
            {/* Metadata técnica */}
            {[
              {l:"CATEGORÍA",  v:cat.l,          c:cat.c,      mono:false},
              {l:"NIVEL",      v:niv.l,          c:niv.c      },
              {l:"TIPO",       v:tipo.icon+" "+tipo.l, c:T.t1, mono:false},
              {l:"DOMINIO",    v:dom.l,          c:dom.c      },
              {l:"APLICACIONES",v:String(nota.vecesAplicado||0)+"×", c:nota.vecesAplicado>0?dom.c:T.t3},
              {l:"ÚLT. APLICACIÓN", v:nota.ultimaAplicacion||"—", c:T.t2},
              {l:"CREADO",     v:nota.creadoEn,  c:T.t2       },
            ].map(function(row){
              return (
                <div key={row.l} style={{display:"flex",alignItems:"center",
                  justifyContent:"space-between",minHeight:36,
                  padding:"0 12px",borderBottom:"1px solid "+T.b1,gap:12}}>
                  <span style={L(T.t3,{flexShrink:0})}>{row.l}</span>
                  <span style={{fontFamily:row.mono===false?T.sans:T.mono,
                    fontSize:13,fontWeight:600,color:row.c||T.data}}>
                    {row.v}
                  </span>
                </div>
              )
            })}

            {nota.proyectoNombre&&(
              <div style={{display:"flex",alignItems:"center",
                justifyContent:"space-between",minHeight:36,
                padding:"0 12px",borderBottom:"1px solid "+T.b1,gap:12}}>
                <span style={L(T.t3,{flexShrink:0})}>PROYECTO</span>
                <span style={{fontFamily:T.sans,fontSize:13,fontWeight:600,color:T.blue}}>
                  {nota.proyectoNombre}
                </span>
              </div>
            )}

            {/* Avanzar dominio */}
            {nota.dominio !== "dominado" && (
              <div style={{padding:"10px 12px",borderTop:"1px solid "+T.b1,marginTop:4}}>
                <Btn onClick={avanzarDominio} variant="ghost" size="sm" full>
                  MARCAR COMO {nota.dominio==="aprendiendo"?"APLICANDO":"DOMINADO"}
                </Btn>
              </div>
            )}

            <div style={{padding:"8px 12px",display:"flex",gap:8}}>
              <Btn onClick={function(){setConfirmDel(true)}} variant="danger" size="sm">
                ELIMINAR
              </Btn>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ================================================================
// FORMULARIO NUEVA ENTRADA TÉCNICA
// ================================================================
function NuevaNota(p) {
  var [form, setForm] = useState({
    titulo:"", categoria:"topografia", nivel:"aplicado",
    tipo:"procedimiento", dominio:"aprendiendo",
    contenido:"", sintaxis:"", ejemplo:"",
    proyectoId:null, proyectoNombre:null,
    etiquetas:[],
  })
  var [etiqInput, setEtiqInput] = useState("")
  var [err, setErr] = useState("")
  var [confirmSalir, setConfirmSalir] = useState(false)

  function sf(k){ return function(v){ setForm(function(s){ var n=Object.assign({},s); n[k]=v; return n }) } }

  function handleBack() {
    if (form.titulo.trim()) { setConfirmSalir(true); return }
    p.onCancelar()
  }

  function addEtiq() {
    var et = etiqInput.trim().toLowerCase().replace(/\s+/g,"_")
    if (!et) return
    if ((form.etiquetas||[]).includes(et)) { setEtiqInput(""); return }
    setForm(function(s){ return Object.assign({},s,{etiquetas:(s.etiquetas||[]).concat([et])}) })
    setEtiqInput("")
  }

  function removeEtiq(et) {
    setForm(function(s){ return Object.assign({},s,{etiquetas:(s.etiquetas||[]).filter(function(e){return e!==et})}) })
  }

  function selProyecto(id) {
    if (!id) { sf("proyectoId")(null); sf("proyectoNombre")(null); return }
    var proy = (p.proyectos||[]).find(function(pr){return pr.id===id})
    if (proy) {
      setForm(function(s){ return Object.assign({},s,{proyectoId:proy.id,proyectoNombre:proy.nombre}) })
    }
  }

  function guardar() {
    if (!form.titulo.trim()) { setErr("TÍTULO OBLIGATORIO"); return }
    if (!form.contenido.trim()) { setErr("CONTENIDO OBLIGATORIO"); return }
    p.onGuardar(Object.assign({},form,{
      id:uid(),
      titulo:form.titulo.trim(),
      contenido:form.contenido.trim(),
      sintaxis:form.sintaxis.trim()||null,
      ejemplo:form.ejemplo.trim()||null,
      vecesAplicado:0,
      ultimaAplicacion:null,
      creadoEn:hoy(),
      actualizadoEn:hoy(),
    }))
  }

  var cat = CAT_MAP[form.categoria] || {c:T.blue}

  // Si el tipo es "comando", forzar nivel a "aplicado" mínimo
  // porque los comandos se documentan cuando ya se usaron
  var mostrarSintaxis = form.tipo === "comando" || form.tipo === "configuracion"

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      {confirmSalir && (
        <ConfirmBarra
          msg="DESCARTAR ESTA ENTRADA"
          onOk={p.onCancelar}
          onCancel={function(){setConfirmSalir(false)}}
        />
      )}
      <Topbar title="NUEVA ENTRADA" accent={cat.c} onBack={handleBack} />

      <div style={{flex:1,overflowY:"auto",padding:"12px 10px"}}>
        {err&&(
          <div style={L(T.red,{background:T.redBg,border:"1px solid "+T.red+"50",
            borderRadius:2,padding:"8px 12px",marginBottom:12})}>
            ⚠ {err}
          </div>
        )}

        {/* Clasificación — primero porque determina el formulario */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          <Field label="CATEGORÍA">
            <TSelect value={form.categoria} onChange={sf("categoria")}
              options={CATS.map(function(c){return {v:c.v,l:c.l}})} />
          </Field>
          <Field label="NIVEL">
            <TSelect value={form.nivel} onChange={sf("nivel")}
              options={NIVELES.map(function(n){return {v:n.v,l:n.l}})} />
          </Field>
          <Field label="TIPO">
            <TSelect value={form.tipo} onChange={sf("tipo")}
              options={TIPOS.map(function(t){return {v:t.v,l:t.icon+" "+t.l}})} />
          </Field>
        </div>

        <Field label="TÍTULO" required>
          <TInput value={form.titulo}
            onChange={function(v){sf("titulo")(v);setErr("")}}
            placeholder="Ej: Orientación estación total desde BM conocido" />
        </Field>

        {/* Sintaxis — solo para comandos y configuraciones */}
        {mostrarSintaxis&&(
          <Field label="SINTAXIS / RUTA DE MENÚ">
            <TArea value={form.sintaxis} onChange={sf("sintaxis")}
              placeholder={"Comando exacto o ruta de menú paso a paso...\nEj: Home → Palettes → Create Surface → TIN Surface"}
              rows={3} mono />
          </Field>
        )}

        <Field label={form.tipo==="checklist"?"CHECKLIST":"CONTENIDO"} required>
          <TArea value={form.contenido} onChange={function(v){sf("contenido")(v);setErr("")}}
            placeholder={
              form.tipo==="procedimiento"?"1. Primer paso\n2. Segundo paso\n3. Verificar...":
              form.tipo==="error_resuelto"?"PROBLEMA:\n\nCAUSAS:\n\nSOLUCIÓN:":
              form.tipo==="checklist"?"□ Primer ítem\n□ Segundo ítem\n□ Tercero...":
              form.tipo==="formula"?"Fórmula: ...\nVariables: ...\nEjemplo:":
              "Documenta aquí el conocimiento técnico..."
            }
            rows={form.tipo==="procedimiento"||form.tipo==="error_resuelto"?8:5}
          />
        </Field>

        <Field label="EJEMPLO DE USO REAL (opcional)">
          <TArea value={form.ejemplo} onChange={sf("ejemplo")}
            placeholder="En qué obra o situación real lo apliqué..."
            rows={2} />
        </Field>

        {/* Proyecto asociado */}
        {(p.proyectos||[]).length>0&&(
          <Field label="PROYECTO ASOCIADO (opcional)">
            <TSelect
              value={form.proyectoId||""}
              onChange={selProyecto}
              options={[{v:"",l:"— Sin proyecto"}].concat(
                (p.proyectos||[]).map(function(pr){return {v:pr.id,l:pr.nombre}})
              )}
            />
          </Field>
        )}

        {/* Estado de dominio */}
        <Field label="ESTADO DE DOMINIO">
          <div style={{display:"flex",gap:6}}>
            {DOMINIO.map(function(d){
              var on = form.dominio === d.v
              return (
                <button key={d.v} onClick={function(){sf("dominio")(d.v)}}
                  style={{flex:1,height:36,padding:"0 6px",
                    background:on?d.c+"20":"transparent",
                    border:"1px solid "+(on?d.c+"60":T.b2),
                    borderRadius:3,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",
                    display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",gap:2}}>
                  <span style={L(on?d.c:T.t4,{fontSize:9})}>{d.l}</span>
                  <span style={{fontFamily:T.sans,fontSize:9,color:on?d.c:T.t4,
                    lineHeight:1.2,textAlign:"center"}}>
                    {d.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </Field>

        {/* Etiquetas */}
        <Field label="ETIQUETAS (opcional)">
          <div style={{display:"flex",gap:6,marginBottom:form.etiquetas&&form.etiquetas.length?8:0}}>
            <input autoComplete="off" autoCorrect="off" value={etiqInput} onChange={function(e){setEtiqInput(e.target.value)}}
              onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();addEtiq()}}}
              placeholder="civil3d, superficies, error... Enter para agregar"
              style={{flex:1,background:T.input,border:"1px solid "+T.b2,
                borderRadius:3,color:T.t1,fontFamily:T.sans,fontSize:13,
                padding:"7px 10px",outline:"none",WebkitAppearance:"none"}} />
            <Btn onClick={addEtiq} variant="ghost" size="sm">+</Btn>
          </div>
          {(form.etiquetas||[]).length>0&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {form.etiquetas.map(function(et){
                return (
                  <button key={et} onClick={function(){removeEtiq(et)}}
                    style={{fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.t2,
                      background:T.panel,border:"1px solid "+T.b2,borderRadius:2,
                      padding:"3px 8px",cursor:"pointer",letterSpacing:"0.08em",
                      WebkitTapHighlightColor:"transparent"}}>
                    {et} ×
                  </button>
                )
              })}
            </div>
          )}
        </Field>

        <HR my={4} />
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={guardar} variant="primary" color={cat.c||T.blue} full>
            GUARDAR ENTRADA
          </Btn>
          <Btn onClick={handleBack} variant="ghost">CANCELAR</Btn>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// MÓDULO CONTROLADOR
// ================================================================
function ModuloAprendizaje() {
  var [notas,     setNotas]     = useState(function(){ return rd(SK.aprendizaje, []) })
  var [proyectos, setProyectos] = useState(function(){ return rd(SK.proyectos, []) })
  var [vista,     setVista]     = useState("lista")
  var [sel,       setSel]       = useState(null)
  var [saveStatus,setSaveStatus]= useState("ok")

  useEffect(function(){
    setSaveStatus("saving")
    var ok = wr(SK.aprendizaje, notas)
    var t = setTimeout(function(){ setSaveStatus(ok?"ok":"error") },300)
    return function(){ clearTimeout(t) }
  },[notas])

  useEffect(function(){
    setProyectos(rd(SK.proyectos, []))
  },[vista])

  function agregar(nota) {
    setNotas(function(ns){ return [nota].concat(ns) })
    setSel(nota)
    setVista("detalle")
  }

  function actualizar(nota) {
    setNotas(function(ns){ return ns.map(function(n){ return n.id===nota.id?nota:n }) })
    setSel(nota)
  }

  function eliminar(id) {
    setNotas(function(ns){ return ns.filter(function(n){ return n.id!==id }) })
    setVista("lista")
  }

  if (vista==="nueva") return (
    <NuevaNota
      proyectos={proyectos.filter(function(p){return p.estado==="activo"||p.estado==="en_pausa"})}
      onGuardar={agregar}
      onCancelar={function(){ setVista("lista") }}
    />
  )

  if (vista==="detalle"&&sel) return (
    <DetallaNota
      nota={sel}
      onBack={function(){ setVista("lista") }}
      onActualizar={actualizar}
      onEliminar={eliminar}
    />
  )

  return (
    <ListaNotas
      notas={notas}
      onSelect={function(n){ setSel(n); setVista("detalle") }}
      onNueva={function(){ setVista("nueva") }}
      onCargarDemo={function(){ setNotas(DEMO_NOTAS) }}
    />
  )
}

// ── Placeholder para módulos no activos ──────────────────────

// ── App ───────────────────────────────────────────────────────

export default ModuloAprendizaje
