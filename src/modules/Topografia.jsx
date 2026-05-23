import { useState, useMemo, useEffect, useRef } from "react"
import { T } from "../shared/tokens"
import { SK } from "../shared/tokens"
import { rd, wr, storageKB, exportarBackupCompleto } from "../shared/storage"
import { uid, hoy, parseCoord, fmtCoord } from "../shared/utils"
import { L, B, TL, HR, Btn, TInput, TSelect, TArea, Field, Topbar, Tabs, Nav, ConfirmBarra } from "../shared/ui"

// ================================================================
// TECTRA — MÓDULO TOPOGRAFÍA v2
// Endurecido para uso real de campo
//
// CRÍTICOS resueltos:
//   ✓ Persistencia automática en localStorage
//   ✓ Edición inline de puntos existentes
//   ✓ Teclado numérico correcto (inputMode=decimal)
//
// ALTOS resueltos:
//   ✓ Guard contra pérdida accidental al salir
//   ✓ Exportación JSON de respaldo
//   ✓ Scroll virtual para 300+ puntos
//   ✓ Validación de precisión en coordenadas
//
// MEDIOS resueltos:
//   ✓ Highlight de fila activa
//   ✓ Contador en tiempo real
//   ✓ Flash de confirmación al guardar punto
// ================================================================


// ── Persistencia ──────────────────────────────────────────────
// Lee de localStorage al inicio, escribe en cada cambio.
// Versiona el schema para migraciones futuras.

// Lee proyectos del storage compartido con el módulo PROYECTOS

// Proyectos activos y en pausa son seleccionables para nuevos registros


// Tamaño aproximado del storage en uso

// ── Formateadores ─────────────────────────────────────────────


function validarCoord(str, tipo) {
  var n = parseCoord(str)
  if (n === null) return "Valor inválido"
  if (tipo === "utm") {
    // UTM Norte en Chile: ~6.000.000 - 7.500.000; UTM Sur: ~400.000 - 800.000
    // Validación laxa pero detecta errores gruesos
    if (Math.abs(n) < 100) return "¿Olvidaste los decimales o el valor completo?"
  }
  return null  // válido
}

// ── Style helpers ─────────────────────────────────────────────
function D(c,x) { return Object.assign({fontFamily:T.mono,fontSize:13,fontWeight:600,color:c||T.data,letterSpacing:"0.02em",lineHeight:1},x) }

// ── Átomos ────────────────────────────────────────────────────

function Dot(p) {
  return <span style={{display:"inline-block",width:p.size||7,height:p.size||7,background:p.color,borderRadius:2,flexShrink:0}} />
}

function Tag(p) {
  var c=p.color||T.t3
  // Tag sin decoración — texto técnico plano, sin badge visual
  return <span style={{fontFamily:T.mono,fontSize:10,fontWeight:700,color:c,
    letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>[{p.children}]</span>
}


// Input para coordenadas — teclado numérico correcto en campo
// inputMode="decimal" abre teclado numérico con punto decimal en iOS/Android
// type="text" porque type="number" rechaza formatos locales y tiene comportamientos erráticos
function CoordInput(p) {
  var [f,setF] = useState(false)
  var [warn,setWarn] = useState(null)

  function handleBlur() {
    setF(false)
    if (p.value && p.validate) {
      var err = validarCoord(p.value, "utm")
      setWarn(err)
    }
  }

  return (
    <div>
      <input
        type="text"
        inputMode="decimal"
        value={p.value}
        onChange={function(e){p.onChange(e.target.value);setWarn(null)}}
        onFocus={function(){setF(true)}}
        onBlur={handleBlur}
        placeholder={p.placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        style={{
          width:"100%",background:T.input,
          border:"1px solid "+(warn?T.amber:f?T.coord:T.b2),
          borderRadius:3,color:T.coord,
          fontFamily:T.mono,fontSize:13,
          padding:"9px 10px",outline:"none",
          letterSpacing:"0.04em",textAlign:"right",
          WebkitAppearance:"none",
        }}
      />
      {warn && (
        <div style={L(T.amber,{fontSize:9,marginTop:3})}>{warn}</div>
      )}
    </div>
  )
}


function DRow(p) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      minHeight:36,padding:"0 12px",borderBottom:"1px solid "+T.b1,gap:12}}>
      <span style={L(T.t3,{flexShrink:0})}>{p.label}</span>
      <span style={p.mono!==false ? D(p.color||T.data) : B(p.color||T.t1,{fontSize:13})}>
        {p.value}
        {p.unit&&<span style={L(T.t3,{marginLeft:5,fontWeight:500})}>{p.unit}</span>}
      </span>
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────


// ── Datos y catálogos ─────────────────────────────────────────
var TIPOS_REG = [
  {v:"levantamiento",l:"Levantamiento"},
  {v:"control_geo",  l:"Control Geométrico"},
  {v:"as_built",     l:"As-Built"},
  {v:"perfil",       l:"Perfil / Sección"},
]

var TIPOS_PUNTO = [
  {v:"normal",  l:"NRM", c:T.t2},
  {v:"control", l:"CTR", c:T.amber},
  {v:"detalle", l:"DET", c:T.blue},
  {v:"eje",     l:"EJE", c:T.coord},
  {v:"relleno", l:"REL", c:T.t3},
]

var TPC = {}
TIPOS_PUNTO.forEach(function(t){ TPC[t.v] = t })

var INSTRUMENTOS = [
  {v:"estacion_total",l:"Estación Total"},
  {v:"gps_rtk",       l:"GPS RTK"},
  {v:"nivel",         l:"Nivel Óptico"},
  {v:"disto",         l:"Distómetro"},
  {v:"cinta",         l:"Cinta Métrica"},
  {v:"otro",          l:"Otro"},
]

var SISTEMAS_REF = [
  {v:"utm_19s", l:"UTM Zona 19S"},
  {v:"utm_18s", l:"UTM Zona 18S"},
  {v:"wgs84",   l:"WGS84"},
  {v:"local",   l:"Sistema Local"},
  {v:"plano",   l:"Coordenadas de Plano"},
]

var DEMO_REGISTROS = [
  {
    id:"r1",codigo:"LVT-2025-047",tipo:"levantamiento",estado:"completo",
    titulo:"Sector Norte — Planta baja",
    proyectoId:"p2",proyectoNombre:"Edificio Residencial Norte",
    fecha:"2025-05-16",instrumento:"estacion_total",instrumentoDetalle:"Leica TS16",
    operador:"J. Martínez",asistente:"P. González",
    sistemaRef:"utm_19s",escala:"1:500",
    condiciones:"Cielo despejado. Viento leve. Visibilidad óptima.",
    observaciones:"Puntos BM verificados al inicio y cierre. Cierre de vuelta < 5\".",
    puntos:[
      {id:"pt1",num:"P001",norte:2547891.234,este:498234.876,elev:1847.230,desc:"BM-01",tipo:"control"},
      {id:"pt2",num:"P002",norte:2547903.112,este:498241.543,elev:1849.870,desc:"ESQ NE",tipo:"detalle"},
      {id:"pt3",num:"P003",norte:2547878.654,este:498228.901,elev:1845.100,desc:"ÁRBOL",tipo:"relleno"},
      {id:"pt4",num:"P004",norte:2547915.440,este:498260.122,elev:1852.440,desc:"ESQ NO",tipo:"detalle"},
      {id:"pt5",num:"P005",norte:2547866.230,este:498215.340,elev:1843.780,desc:"BM-02",tipo:"control"},
      {id:"pt6",num:"P006",norte:2547888.900,este:498245.670,elev:1848.120,desc:"EJE A",tipo:"eje"},
    ],
    creadoEn:"2025-05-16"
  },
  {
    id:"r2",codigo:"LVT-2025-038",tipo:"levantamiento",estado:"completo",
    titulo:"Ruta 5 km 12.0 — 12.4",
    proyectoId:null,proyectoNombre:null,
    fecha:"2025-05-10",instrumento:"gps_rtk",instrumentoDetalle:"Trimble R10",
    operador:"J. Martínez",asistente:"",
    sistemaRef:"utm_19s",escala:"1:1000",
    condiciones:"Nublado. Sin lluvia. Buena recepción GPS.",
    observaciones:"180 puntos. Sección km 12.0 al 12.4.",
    puntos:[
      {id:"pt7",num:"P001",norte:6201445.120,este:332187.340,elev:512.340,desc:"BORDE IZQ",tipo:"detalle"},
      {id:"pt8",num:"P002",norte:6201445.100,este:332194.880,elev:512.290,desc:"EJE CALZADA",tipo:"eje"},
      {id:"pt9",num:"P003",norte:6201445.080,este:332202.410,elev:512.250,desc:"BORDE DER",tipo:"detalle"},
    ],
    creadoEn:"2025-05-10"
  },
]

// ── Exportación JSON ──────────────────────────────────────────
function exportarRegistro(reg) {
  var data = JSON.stringify(reg, null, 2)
  var blob = new Blob([data], {type:"application/json"})
  var url  = URL.createObjectURL(blob)
  var a    = document.createElement("a")
  a.href     = url
  a.download = reg.codigo+"-"+reg.fecha+".json"
  a.click()
  URL.revokeObjectURL(url)
}

function exportarTodo(registros) {
  var data = JSON.stringify({version:"tectra_v1",exportadoEn:new Date().toISOString(),registros:registros},null,2)
  var blob = new Blob([data], {type:"application/json"})
  var url  = URL.createObjectURL(blob)
  var a    = document.createElement("a")
  a.href     = url
  a.download = "tectra-topo-backup-"+hoy()+".json"
  a.click()
  URL.revokeObjectURL(url)
}

// ── Resumen técnico de puntos — A4 ──────────────────────────
// Reduce errores: informa extensión, último punto, y puntos sin elevación
// Visible al abrir la tabla — no requiere scroll
function ResumenPuntos(p) {
  var pts = p.puntos
  if (!pts || pts.length === 0) return null

  var ultimo   = pts[pts.length - 1]
  var sinElev  = pts.filter(function(pt){
    return pt.elev === null || pt.elev === undefined
  }).length
  var nControl = pts.filter(function(pt){return pt.tipo==="control"}).length
  var nEje     = pts.filter(function(pt){return pt.tipo==="eje"}).length

  var nortes = pts.map(function(pt){return pt.norte}).filter(Boolean)
  var estes  = pts.map(function(pt){return pt.este }).filter(Boolean)
  // reduce en lugar de apply para evitar stack overflow con miles de puntos
  var dN = nortes.length>1 ? Math.abs(
    nortes.reduce(function(m,n){return n>m?n:m},-Infinity) -
    nortes.reduce(function(m,n){return n<m?n:m}, Infinity)
  ) : 0
  var dE = estes.length>1 ? Math.abs(
    estes.reduce(function(m,n){return n>m?n:m},-Infinity) -
    estes.reduce(function(m,n){return n<m?n:m}, Infinity)
  ) : 0

  // Hora del último punto ingresado
  var horaStr = ""
  if (ultimo.creadoEn) {
    try {
      var d = new Date(ultimo.creadoEn)
      horaStr = String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")
    } catch(e) {}
  }

  return (
    <div style={{
      background:T.base, borderBottom:"2px solid "+T.b2,
      padding:"4px 10px", display:"flex", alignItems:"center",
      gap:0, flexShrink:0, overflowX:"auto",
      WebkitOverflowScrolling:"touch", scrollbarWidth:"none",
    }}>
      {/* Último punto */}
      <div style={{display:"flex",alignItems:"center",gap:5,
        paddingRight:10,borderRight:"1px solid "+T.b1,marginRight:10,flexShrink:0}}>
        <span style={L(T.t4,{fontSize:8})}>ÚLT</span>
        <span style={L(T.blue,{fontSize:10,fontWeight:700})}>{ultimo.num}</span>
        {ultimo.desc &&
          <span style={{fontFamily:"sans-serif",fontSize:11,color:T.t3,
            maxWidth:60,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
            {ultimo.desc}
          </span>
        }
        {horaStr &&
          <span style={L(T.t4,{fontSize:8})}>{horaStr}</span>
        }
      </div>

      {/* Total */}
      <div style={{display:"flex",alignItems:"center",gap:5,
        paddingRight:10,borderRight:"1px solid "+T.b1,marginRight:10,flexShrink:0}}>
        <span style={L(T.data,{fontSize:10,fontWeight:700})}>{pts.length}</span>
        <span style={L(T.t4,{fontSize:8})}>PT</span>
        {nControl>0 && <><span style={L(T.amber,{fontSize:10,fontWeight:700})}>{nControl}</span><span style={L(T.t4,{fontSize:8})}>CTR</span></>}
        {nEje>0     && <><span style={L(T.coord, {fontSize:10,fontWeight:700})}>{nEje}</span>   <span style={L(T.t4,{fontSize:8})}>EJE</span></>}
      </div>

      {/* Extensión */}
      {(dN>0||dE>0) &&
        <div style={{display:"flex",alignItems:"center",gap:5,
          paddingRight:10,borderRight:"1px solid "+T.b1,marginRight:10,flexShrink:0}}>
          <span style={L(T.t4,{fontSize:8})}>EXT</span>
          <span style={L(T.coord,{fontSize:10,fontWeight:700})}>{dN.toFixed(0)}</span>
          <span style={L(T.t4,{fontSize:8})}>×</span>
          <span style={L(T.coord,{fontSize:10,fontWeight:700})}>{dE.toFixed(0)}</span>
          <span style={L(T.t4,{fontSize:8})}>m</span>
        </div>
      }

      {/* Alerta sin elevación */}
      {sinElev>0 &&
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <span style={L(T.amber,{fontSize:9,fontWeight:700})}>⚠ {sinElev} SIN Z</span>
        </div>
      }
    </div>
  )
}

// ── Lista virtual de puntos ───────────────────────────────────
// Renderiza solo las filas visibles. Sin librería. ~ROW_H px por fila.
// Para 300 puntos: DOM tiene ~15 nodos en lugar de 300.
var ROW_H = 34  // altura exacta de cada fila en px

function ListaVirtual(p) {
  var [scroll, setScroll] = useState(0)
  var containerRef = useRef(null)

  var total   = p.puntos.length
  var visible = Math.ceil(p.height / ROW_H) + 4  // buffer arriba y abajo
  var startIdx = Math.max(0, Math.floor(scroll / ROW_H) - 2)
  var endIdx   = Math.min(total, startIdx + visible)

  function handleScroll(e) {
    setScroll(e.target.scrollTop)
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height:p.height,
        overflowY:"scroll",        // C4: forzado, no "auto" — garantiza que el scroll es del container
        overflowX:"auto",
        WebkitOverflowScrolling:"touch",
        position:"relative",
        minWidth:396,
        willChange:"transform",    // optimiza compositing en dispositivos gama media
      }}>

      {/* Spacer para dar altura total al contenedor */}
      <div style={{height:total * ROW_H, position:"relative"}}>

        {/* Cabecera sticky */}
        <div style={{
          display:"grid",gridTemplateColumns:"44px 90px 90px 62px 68px 30px",
          background:T.surface,borderBottom:"2px solid "+T.b2,
          padding:"0 10px",position:"sticky",top:0,zIndex:10,minWidth:396,
        }}>
          {["NUM","NORTE","ESTE","ELEV","DESC","T"].map(function(h){
            return <div key={h} style={L(T.t3,{fontSize:9,textAlign:"right",padding:"5px 4px"})}>{h}</div>
          })}
        </div>

        {/* Filas visibles posicionadas absolutamente */}
        {p.puntos.slice(startIdx, endIdx).map(function(pt, relIdx) {
          var absIdx = startIdx + relIdx
          var topOffset = absIdx * ROW_H + 30  // +30 para cabecera
          var isActive = p.activePt === pt.id
          var isEditing = p.editingPt === pt.id
          var tipo = TPC[pt.tipo] || TPC.normal

          if (isEditing) {
            return (
              <EditInline key={pt.id} pt={pt} tipo={tipo} top={topOffset}
                onSave={function(updated){p.onEditSave(updated)}}
                onCancel={function(){p.onEditCancel()}} />
            )
          }

          return (
            <FilaPunto key={pt.id} pt={pt} tipo={tipo} top={topOffset}
              isActive={isActive}
              onClick={function(){p.onPtClick(pt.id)}}
              onEdit={function(){p.onEdit(pt.id)}}
              onDel={function(){p.onDel(pt.id)}} />
          )
        })}

        {/* Resumen al fondo */}
        <div style={{
          position:"absolute",
          top:total*ROW_H+30,
          left:0,right:0,
          display:"grid",gridTemplateColumns:"44px 90px 90px 62px 68px 30px",
          background:T.surface,borderTop:"1px solid "+T.b2,
          padding:"0 10px",minWidth:396,
        }}>
          <div style={L(T.t3,{fontSize:9,textAlign:"right",padding:"5px 4px",gridColumn:"1/4"})}>
            {total} PUNTOS
          </div>
          <div style={L(T.t3,{fontSize:9,textAlign:"right",padding:"5px 4px",gridColumn:"4/7"})}>
            {p.puntos.filter(function(pt){return pt.tipo==="control"}).length} CTR
          </div>
        </div>
      </div>
    </div>
  )
}

// Fila de punto — altura fija ROW_H
function FilaPunto(p) {
  var pt = p.pt
  var [menu, setMenu] = useState(false)
  var tipo = p.tipo

  return (
    <div
      onClick={function(){setMenu(!menu)}}
      style={{
        position:"absolute",top:p.top,left:0,right:0,
        display:"grid",gridTemplateColumns:"44px 90px 90px 62px 68px 30px",
        background:p.isActive?T.rowSel:menu?T.rowSel:"transparent",
        borderBottom:"1px solid "+T.b1,
        padding:"0 10px",height:ROW_H,alignItems:"center",
        cursor:"pointer",WebkitTapHighlightColor:"transparent",
        minWidth:396,
      }}>
      <span style={D(T.blue,{fontSize:11,textAlign:"right",padding:"0 4px"})}>{pt.num}</span>
      <span style={D(T.coord,{fontSize:11,textAlign:"right",padding:"0 4px"})}>{fmtCoord(pt.norte)}</span>
      <span style={D(T.coord,{fontSize:11,textAlign:"right",padding:"0 4px"})}>{fmtCoord(pt.este)}</span>
      <span style={D(T.data,{fontSize:11,textAlign:"right",padding:"0 4px"})}>{fmtCoord(pt.elev)}</span>
      <span style={B(T.t2,{fontSize:11,textAlign:"right",padding:"0 4px",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"})}>{pt.desc}</span>
      <span style={{padding:"0 4px",display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
        {menu ? (
          <div style={{display:"flex",gap:4}}>
            <button onClick={function(e){e.stopPropagation();p.onEdit();setMenu(false)}}
              style={L(T.blue,{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",fontSize:9})}>
              ED
            </button>
            <button onClick={function(e){e.stopPropagation();p.onDel();setMenu(false)}}
              style={L(T.red,{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",fontSize:9})}>
              ×
            </button>
          </div>
        ) : (
          <span style={L(tipo.c,{fontSize:9,letterSpacing:"0.06em"})}>{tipo.l}</span>
        )}
      </span>
    </div>
  )
}

// Edición inline — reemplaza la fila con inputs
function EditInline(p) {
  var [norte,setN] = useState(String(p.pt.norte||""))
  var [este, setE] = useState(String(p.pt.este||""))
  var [elev, setZ] = useState(p.pt.elev!==null?String(p.pt.elev):"")
  var [desc, setD] = useState(p.pt.desc||"")
  var [tipo, setT] = useState(p.pt.tipo||"normal")

  function save() {
    var n = parseCoord(norte), e = parseCoord(este)
    if (n===null||e===null) return
    p.onSave(Object.assign({},p.pt,{
      norte:n, este:e,
      elev:elev?parseCoord(elev):null,
      desc:desc.trim(), tipo:tipo,
    }))
  }

  return (
    <div style={{position:"absolute",top:p.top,left:0,right:0,
      background:T.panel,border:"1px solid "+T.coord,
      padding:"8px 10px",zIndex:20,minWidth:396}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
        <span style={L(T.coord,{fontSize:9})}>EDITANDO {p.pt.num}</span>
        <TipoSelector value={tipo} onChange={setT} horizontal />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:6}}>
        <div>
          <div style={L(T.coord,{fontSize:9,marginBottom:3})}>NORTE</div>
          <CoordInput value={norte} onChange={setN} placeholder="Norte" validate />
        </div>
        <div>
          <div style={L(T.coord,{fontSize:9,marginBottom:3})}>ESTE</div>
          <CoordInput value={este} onChange={setE} placeholder="Este" validate />
        </div>
        <div>
          <div style={L(T.data,{fontSize:9,marginBottom:3})}>ELEV</div>
          <CoordInput value={elev} onChange={setZ} placeholder="Elevación" />
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <TInput value={desc} onChange={setD} placeholder="Descripción" />
      </div>
      <div style={{display:"flex",gap:6}}>
        <Btn onClick={save} variant="primary" color={T.coord} full size="sm">GUARDAR</Btn>
        <Btn onClick={p.onCancel} variant="ghost" size="sm">CANCELAR</Btn>
      </div>
    </div>
  )
}

// ── Formulario rápido de punto ────────────────────────────────
function FormPunto(p) {
  var [num,  setNum]  = useState(p.nextNum)
  var [norte,setN]    = useState("")
  var [este, setE]    = useState("")
  var [elev, setZ]    = useState("")
  var [desc, setD]    = useState("")
  var [tipo, setT]    = useState("normal")
  var [flash,setFlash]= useState(false)
  var [err,  setErr]  = useState("")
  var [warn,  setWarn] = useState("")   // aviso sin bloquear (ej: duplicado)

  // Refs para navegación Enter entre campos
  var norteRef = useRef(null)
  var esteRef  = useRef(null)
  var elevRef  = useRef(null)
  var descRef  = useRef(null)

  // Auto-foco en Norte cuando se abre
  useEffect(function(){
    if (norteRef.current) norteRef.current.focus()
  },[])

  function guardar() {
    var n = parseCoord(norte), e = parseCoord(este)
    if (n===null||e===null) { setErr("NORTE Y ESTE OBLIGATORIOS"); return }

    var numLimpio = num.trim()||p.nextNum
    var duplicado = p.puntosExistentes && p.puntosExistentes.includes(numLimpio)

    var pt = {
      id:uid(), num:numLimpio,
      norte:n, este:e,
      elev:elev?parseCoord(elev):null,
      desc:desc.trim(), tipo:tipo,
      creadoEn: new Date().toISOString(),  // para hora en ResumenPuntos
    }

    if (duplicado && warn !== "confirmar_reemplazar") {
      // Primera vez: muestra opciones sin bloquear el flujo
      setWarn("confirmar_reemplazar")
      return
    }

    // Si eligió reemplazar: pasa acción al padre
    if (duplicado && warn === "confirmar_reemplazar") {
      p.onReemplazar(numLimpio, pt)
    } else {
      p.onGuardar(pt)
    }
    setWarn("")

    // Flash de confirmación
    setFlash(true)
    setTimeout(function(){setFlash(false)},600)

    // Avanzar número automáticamente
    var n2 = parseInt(num.replace(/\D/g,""))+1
    setNum("P"+String(n2).padStart(3,"0"))
    setN(""); setE(""); setZ(""); setD(""); setErr("")

    // Foco de vuelta a Norte para el siguiente punto
    if (norteRef.current) setTimeout(function(){norteRef.current.focus()},50)
  }

  // Enter avanza al campo siguiente — reduce taps en dictado
  function avanzar(ref) {
    if (ref && ref.current) ref.current.focus()
  }

  return (
    <div style={{
      background:flash?T.coord+"22":T.panel,
      border:"1px solid "+(flash?T.coord:T.b2),
      borderBottom:"2px solid "+T.b2,
      padding:"10px 10px 8px",
      transition:"background 200ms, border-color 200ms",
    }}>
      {/* Número + tipo + cerrar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={L(T.t3,{fontSize:9})}>PUNTO</span>
          <input value={num} onChange={function(e){setNum(e.target.value)}}
            inputMode="text"
            autoComplete="off" autoCorrect="off"
            style={{width:56,background:T.input,border:"1px solid "+T.b3,
              borderRadius:3,color:T.blue,fontFamily:T.mono,fontSize:12,fontWeight:700,
              padding:"3px 6px",outline:"none",textAlign:"center",WebkitAppearance:"none"}} />
          <TipoSelector value={tipo} onChange={setT} horizontal />
        </div>
        <button onClick={function(){
            // UX4: si hay coordenadas sin guardar, confirmar antes de cerrar
            if(norte.trim()||este.trim()){
              if(!window.__ux4_warned){
                window.__ux4_warned=true
                setTimeout(function(){window.__ux4_warned=false},2000)
                setErr("DATOS SIN GUARDAR — TOCA CERRAR NUEVAMENTE PARA SALIR")
                return
              }
            }
            window.__ux4_warned=false
            p.onCerrar()
          }}
          style={L(T.t3,{background:"none",border:"1px solid "+T.b2,borderRadius:2,
            padding:"3px 8px",cursor:"pointer",WebkitTapHighlightColor:"transparent"})}>
          CERRAR
        </button>
      </div>

      {err && <div style={L(T.red,{background:T.redBg,borderRadius:2,padding:"4px 8px",marginBottom:6})}>{err}</div>}

      {/* Norte / Este / Elev */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:6}}>
        <div>
          <div style={L(T.coord,{fontSize:9,marginBottom:3})}>NORTE *</div>
          <input ref={norteRef} type="text" inputMode="decimal"
            value={norte} onChange={function(e){setN(e.target.value);setErr("");setWarn("")}}
            placeholder="2,547,891.234"
            onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();avanzar(esteRef)}}}
            autoComplete="off" autoCorrect="off" spellCheck="false"
            style={{width:"100%",background:T.input,border:"1px solid "+T.b2,
              borderRadius:3,color:T.coord,fontFamily:T.mono,fontSize:13,
              padding:"9px 8px",outline:"none",textAlign:"right",WebkitAppearance:"none"}} />
        </div>
        <div>
          <div style={L(T.coord,{fontSize:9,marginBottom:3})}>ESTE *</div>
          <input ref={esteRef} type="text" inputMode="decimal"
            value={este} onChange={function(e){setE(e.target.value);setErr("");setWarn("")}}
            placeholder="498,234.876"
            onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();avanzar(elevRef)}}}
            autoComplete="off" autoCorrect="off" spellCheck="false"
            style={{width:"100%",background:T.input,border:"1px solid "+T.b2,
              borderRadius:3,color:T.coord,fontFamily:T.mono,fontSize:13,
              padding:"9px 8px",outline:"none",textAlign:"right",WebkitAppearance:"none"}} />
        </div>
        <div>
          <div style={L(T.data,{fontSize:9,marginBottom:3})}>ELEV</div>
          <input ref={elevRef} type="text" inputMode="decimal"
            value={elev} onChange={setZ}
            placeholder="1,847.230"
            onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();avanzar(descRef)}}}
            autoComplete="off" autoCorrect="off" spellCheck="false"
            style={{width:"100%",background:T.input,border:"1px solid "+T.b2,
              borderRadius:3,color:T.data,fontFamily:T.mono,fontSize:13,
              padding:"9px 8px",outline:"none",textAlign:"right",WebkitAppearance:"none"}} />
        </div>
      </div>

      {/* Descripción */}
      <div style={{marginBottom:8}}>
        <input ref={descRef} type="text"
          value={desc} onChange={function(e){setD(e.target.value)}}
          placeholder="Descripción: BM-01, ESQ NE, ÁRBOL..."
          onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();guardar()}}}
          autoComplete="off"
          style={{width:"100%",background:T.input,border:"1px solid "+T.b2,
            borderRadius:3,color:T.t1,fontFamily:T.sans,fontSize:14,
            padding:"9px 10px",outline:"none",WebkitAppearance:"none"}} />
      </div>

      {/* Aviso duplicado — opciones claras sin abandonar el flujo */}
      {warn==="confirmar_reemplazar" && (
        <div style={{background:T.amberBg,border:"1px solid "+T.amber+"50",
          borderRadius:2,padding:"7px 8px",marginBottom:6}}>
          <div style={{fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.amber,
            letterSpacing:"0.10em",marginBottom:7}}>
            ⚠ {num.trim()||p.nextNum} YA EXISTE EN ESTE REGISTRO
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={guardar}
              style={{flex:1,height:32,fontFamily:T.mono,fontSize:9,fontWeight:700,
                color:T.amber,background:"none",border:"1px solid "+T.amber+"60",
                borderRadius:2,cursor:"pointer",letterSpacing:"0.09em",
                WebkitTapHighlightColor:"transparent"}}>
              REEMPLAZAR
            </button>
            <button onClick={function(){
                setWarn("")
                var pt2={id:uid(),num:num.trim()||p.nextNum,
                  norte:parseCoord(norte),este:parseCoord(este),
                  elev:elev?parseCoord(elev):null,desc:desc.trim(),tipo:tipo}
                p.onGuardar(pt2)
                var n2=parseInt(num.replace(/\D/g,""))+1
                setNum("P"+String(n2).padStart(3,"0"))
                setN("");setE("");setZ("");setD("")
                if(norteRef.current) setTimeout(function(){norteRef.current.focus()},50)
              }}
              style={{flex:1,height:32,fontFamily:T.mono,fontSize:9,fontWeight:700,
                color:T.blue,background:"none",border:"1px solid "+T.blue+"40",
                borderRadius:2,cursor:"pointer",letterSpacing:"0.09em",
                WebkitTapHighlightColor:"transparent"}}>
              AGREGAR IGUAL
            </button>
            <button onClick={function(){setWarn("")}}
              style={{height:32,padding:"0 10px",fontFamily:T.mono,fontSize:9,fontWeight:700,
                color:T.t3,background:"none",border:"1px solid "+T.b2,
                borderRadius:2,cursor:"pointer",letterSpacing:"0.09em",
                WebkitTapHighlightColor:"transparent"}}>
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {/* Guardar — altura 50px para fácil toque */}
      <Btn onClick={guardar} variant="primary" color={flash?T.coord:T.blue} full size="lg"
        disabled={!norte.trim()||!este.trim()}>
        {flash?"✓ GUARDADO":"REGISTRAR PUNTO"}
      </Btn>
    </div>
  )
}

// Selector de tipo de punto — botones compactos
function TipoSelector(p) {
  var tipos = [{v:"normal",l:"NRM",c:T.t2},{v:"control",l:"CTR",c:T.amber},{v:"detalle",l:"DET",c:T.blue},{v:"eje",l:"EJE",c:T.coord},{v:"relleno",l:"REL",c:T.t3}]
  return (
    <div style={{display:"flex",flexDirection:p.horizontal?"row":"column",gap:3}}>
      {tipos.map(function(t){
        var on=p.value===t.v
        return (
          <button key={t.v} onClick={function(){p.onChange(t.v)}}
            style={{height:p.horizontal?24:22,padding:"0 6px",
              background:on?t.c+"25":"transparent",
              border:"1px solid "+(on?t.c+"60":T.b2),borderRadius:2,
              fontFamily:T.mono,fontSize:9,fontWeight:700,
              color:on?t.c:T.t4,letterSpacing:"0.08em",
              cursor:"pointer",WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
            {t.l}
          </button>
        )
      })}
    </div>
  )
}


// ── Detalle del registro ──────────────────────────────────────
// ── EditField — label + campo para edición inline en DATOS ───
function EditField(p) {
  return (
    <div style={{marginBottom:0}}>
      <div style={L(T.t3,{fontSize:9,marginBottom:4})}>
        {p.label}
        {p.required&&<span style={{color:T.amber,marginLeft:3}}>*</span>}
      </div>
      {p.children}
    </div>
  )
}

// ── EditSelectorProyecto — selector inline para edición ───────
// Versión compacta: muestra el proyecto actual + botón para cambiar
function EditSelectorProyecto(p) {
  var [abierto, setAbierto] = useState(false)
  var [proyectos] = useState(function(){
    try { var r=localStorage.getItem("tc_v1_proyectos"); return r?JSON.parse(r):[] } catch(e){return[]}
  }).filter(function(pr){return pr.estado==="activo"||pr.estado==="en_pausa"})

  if (!abierto) {
    return (
      <div style={{display:"flex",alignItems:"center",gap:8,
        padding:"7px 10px",background:T.input,border:"1px solid "+T.b2,borderRadius:3}}>
        <div style={{flex:1,minWidth:0}}>
          {p.nombre ? (
            <span style={{fontFamily:T.sans,fontSize:13,color:T.t1,
              overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",display:"block"}}>
              {p.nombre}
            </span>
          ) : (
            <span style={L(T.t4,{fontSize:9})}>SIN PROYECTO</span>
          )}
        </div>
        <button onClick={function(){setAbierto(true)}}
          style={{fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.blue,
            background:"none",border:"1px solid "+T.blue+"40",borderRadius:2,
            padding:"3px 8px",cursor:"pointer",letterSpacing:"0.09em",
            textTransform:"uppercase",flexShrink:0,
            WebkitTapHighlightColor:"transparent"}}>
          CAMBIAR
        </button>
      </div>
    )
  }

  // Selector abierto
  return (
    <div style={{background:T.input,border:"1px solid "+T.b3,borderRadius:3,
      maxHeight:200,overflowY:"auto"}}>
      <button onClick={function(){p.onSelect(null, null);setAbierto(false)}}
        style={{display:"flex",alignItems:"center",width:"100%",padding:"7px 10px",
          minHeight:34,background:!p.value?T.rowSel:"transparent",
          border:"none",borderBottom:"1px solid "+T.b1,
          cursor:"pointer",WebkitTapHighlightColor:"transparent",textAlign:"left"}}>
        <span style={L(!p.value?T.t2:T.t4,{fontSize:9})}>— SIN PROYECTO</span>
      </button>
      {proyectos.map(function(proy,i){
        var sel = p.value===proy.id
        var ec = {activo:T.green,en_pausa:T.amber}[proy.estado]||T.t3
        return (
          <button key={proy.id}
            onClick={function(){p.onSelect(proy.id,proy.nombre);setAbierto(false)}}
            style={{display:"flex",alignItems:"center",gap:8,width:"100%",
              padding:"7px 10px",minHeight:34,
              background:sel?T.rowSel:"transparent",
              border:"none",
              borderBottom:i<proyectos.length-1?"1px solid "+T.b1:"none",
              cursor:"pointer",WebkitTapHighlightColor:"transparent",textAlign:"left"}}>
            <div style={{width:5,height:5,background:ec,borderRadius:1,flexShrink:0}}/>
            <span style={{fontFamily:T.sans,fontSize:13,color:sel?T.t1:T.t2,
              flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
              {proy.nombre}
            </span>
            {sel&&<span style={L(T.blue,{fontSize:8})}>▶</span>}
          </button>
        )
      })}
    </div>
  )
}


function DetalleRegistro(p) {
  var [reg, setReg]       = useState(p.registro)
  var [tab, setTab]       = useState("puntos")
  var [addingPt, setAdd]  = useState(false)
  var [editingPt, setEdit]= useState(null)
  var [activePt, setAct]  = useState(null)
  var [confirmDel,   setConfirmDel]   = useState(null)   // id del punto pendiente de eliminar
  var [confirmSalir, setConfirmSalir] = useState(false)  // guard de salida con form abierto
  var [confirmDelReg, setConfirmDelReg] = useState(false) // confirmar eliminación del registro
  // C1: altura dinámica según viewport real — evita scroll de página vs tabla
  // Calcula el espacio disponible restando elementos fijos del layout
  // addingPt=true reduce el espacio disponible para la tabla
  var tableH = Math.max(
    160,
    (typeof window !== "undefined" ? window.innerHeight : 600)
      - 46   // topbar módulo
      - 44   // contexto del registro (título+meta)
      - 34   // tabs
      - (addingPt ? 215 : 52)  // formulario abierto vs botón
      - 56   // navbar
      - 10   // margen
  )

  // Guarda cada cambio inmediatamente
  function updReg(changes) {
    var u = Object.assign({}, reg, changes, {actualizadoEn: hoy()})
    setReg(u)
    p.onActualizar(u)
  }

  function addPunto(pt) {
    updReg({puntos: reg.puntos.concat([pt])})
    setAct(pt.id)
  }

  function delPunto(id) {
    // Activa confirmación inline — NO window.confirm
    setConfirmDel(id)
  }

  function delPuntoConfirmado(id) {
    updReg({puntos: reg.puntos.filter(function(pt){return pt.id!==id})})
    if (activePt===id) setAct(null)
    setConfirmDel(null)
  }

  function savePunto(updated) {
    updReg({puntos: reg.puntos.map(function(pt){return pt.id===updated.id?updated:pt})})
    setEdit(null)
    setAct(updated.id)
  }

  function handlePtClick(id) {
    if (activePt===id) setAct(null)
    else setAct(id)
  }

  var nPuntos  = reg.puntos.length
  var nControl = reg.puntos.filter(function(pt){return pt.tipo==="control"}).length
  // nextNum basado en el número máximo existente, no en el largo del array
  // Correcto aunque se hayan borrado puntos, haya saltos, o duplicados
  var maxExistente = reg.puntos.reduce(function(mx, pt) {
    var n = parseInt((pt.num||"").replace(/\D/g,"")) || 0
    return n > mx ? n : mx
  }, 0)
  var nextNum = "P"+String(maxExistente+1).padStart(3,"0")
  // nextNumOverride: permite forzar el siguiente número tras reemplazar
  var [nextNumOverride, setNextNumOverride] = useState(null)
  var nextNumFinal = nextNumOverride || nextNum

  var instrLabel = {estacion_total:"EST. TOTAL",gps_rtk:"GPS RTK",nivel:"NIVEL",disto:"DISTÓMETRO",cinta:"CINTA",otro:"OTRO"}[reg.instrumento]||reg.instrumento

  function handleBack() {
    if (addingPt || editingPt) {
      // UX5: advertir también si hay una edición inline activa
      setConfirmSalir(true)
      return
    }
    p.onBack()
  }

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      {confirmSalir && (
        <ConfirmBarra
          msg="CERRAR FORMULARIO Y SALIR"
          onOk={function(){setAdd(false);setConfirmSalir(false);p.onBack()}}
          onCancel={function(){setConfirmSalir(false)}}
        />
      )}
      <Topbar title={reg.codigo} accent={T.blue} onBack={handleBack}
        sub={reg.tipo.replace("_"," ").toUpperCase()}
        right={
          <div style={{display:"flex",gap:4}}>
            <Tag color={T.data}>{nPuntos} PT</Tag>
            {nControl>0&&<Tag color={T.amber}>{nControl} CTR</Tag>}
            <button onClick={function(){exportarRegistro(reg)}}
              style={L(T.coord,{background:"none",border:"1px solid "+T.coord+"40",
                borderRadius:2,padding:"3px 7px",cursor:"pointer",
                fontSize:9,WebkitTapHighlightColor:"transparent"})}>
              EXP
            </button>
          </div>
        }
      />

      {/* Contexto */}
      <div style={{padding:"7px 12px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
        <p style={B(T.t1,{fontWeight:500,lineHeight:1.3})}>{reg.titulo}</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
          <span style={L(T.t3,{fontSize:9})}>{reg.fecha}</span>
          <span style={{color:T.t4}}>·</span>
          <span style={L(T.t3,{fontSize:9})}>{instrLabel}</span>
          {reg.instrumentoDetalle&&<><span style={{color:T.t4}}>·</span><span style={L(T.data,{fontSize:9})}>{reg.instrumentoDetalle}</span></>}
        </div>
      </div>

      <Tabs tabs={[{k:"puntos",l:"PUNTOS"},{k:"datos",l:"DATOS"},{k:"obs",l:"OBS."}]}
        active={tab} onChange={setTab} accent={T.blue} />

      <div style={{flex:1,overflowY:"auto"}}>

        {tab==="puntos"&&(
          <div>
            {/* Formulario rápido — siempre visible */}
            {addingPt ? (
              <FormPunto nextNum={nextNumFinal}
                puntosExistentes={reg.puntos.map(function(pt){return pt.num})}
                onGuardar={addPunto}
                onReemplazar={function(numExistente, ptNuevo){
                  // Reemplaza el punto existente — mantiene el id original
                  updReg({puntos: reg.puntos.map(function(pt){
                    return pt.num===numExistente
                      ? Object.assign({},ptNuevo,{id:pt.id})
                      : pt
                  })})
                  setAct(null)
                  // Avanzar el número en el formulario
                  var n2 = parseInt(numExistente.replace(/\D/g,""))+1
                  setNextNumOverride("P"+String(n2).padStart(3,"0"))
                  // Limpiar override después de que el form lo consuma
                  setTimeout(function(){setNextNumOverride(null)},100)
                }}
                onCerrar={function(){setAdd(false)}} />
            ) : (
              <div style={{padding:"8px 10px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
                <Btn onClick={function(){setAdd(true)}} variant="primary" color={T.blue} full>
                  + AGREGAR PUNTO
                </Btn>
              </div>
            )}

            {/* Confirmación inline de eliminar punto */}
            {confirmDel && (
              <ConfirmBarra
                msg={"ELIMINAR " + (reg.puntos.find(function(pt){return pt.id===confirmDel})||{}).num + " — NO SE PUEDE DESHACER"}
                onOk={function(){delPuntoConfirmado(confirmDel)}}
                onCancel={function(){setConfirmDel(null)}}
                danger
              />
            )}

            {nPuntos===0 ? (
              <div style={{padding:"32px 16px",textAlign:"center"}}>
                <p style={L(T.t3)}>SIN PUNTOS</p>
                <p style={B(T.t4,{fontSize:13,marginTop:8})}>Agrega el primer punto del registro</p>
              </div>
            ) : (
              <ResumenPuntos puntos={reg.puntos} />
            )}
            {nPuntos > 0 && (
              <ListaVirtual
                puntos={reg.puntos}
                height={tableH}
                activePt={activePt}
                editingPt={editingPt}
                onPtClick={handlePtClick}
                onEdit={function(id){setEdit(id);setAdd(false)}}
                onEditSave={savePunto}
                onEditCancel={function(){setEdit(null)}}
                onDel={delPunto}
              />
            )}
          
          </div>
        )}

        {tab==="datos"&&(
          <div style={{padding:"8px 10px 80px"}}>
            {/* CÓDIGO — solo lectura, es el identificador del registro */}
            <div style={{marginBottom:10}}>
              <div style={L(T.t3,{fontSize:9,marginBottom:4})}>CÓDIGO</div>
              <div style={{fontFamily:T.mono,fontSize:13,color:T.t2,padding:"2px 0"}}>
                {reg.codigo}
              </div>
            </div>

            {/* PROYECTO — selector completo igual que en NuevoRegistro */}
            <div style={{marginBottom:10}}>
              <div style={L(T.t3,{fontSize:9,marginBottom:4})}>PROYECTO</div>
              <EditSelectorProyecto
                value={reg.proyectoId}
                nombre={reg.proyectoNombre}
                onSelect={function(id, nombre){
                  updReg({proyectoId:id, proyectoNombre:nombre})
                }}
              />
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <EditField label="TÍTULO" required>
                <TInput value={reg.titulo}
                  onChange={function(v){updReg({titulo:v})}}
                  placeholder="Título del registro"/>
              </EditField>
              <EditField label="FECHA">
                <TInput value={reg.fecha} type="date"
                  onChange={function(v){updReg({fecha:v})}}/>
              </EditField>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <EditField label="INSTRUMENTO">
                <TSelect value={reg.instrumento}
                  onChange={function(v){updReg({instrumento:v})}}
                  options={INSTRUMENTOS}/>
              </EditField>
              <EditField label="MODELO">
                <TInput value={reg.instrumentoDetalle||""}
                  onChange={function(v){updReg({instrumentoDetalle:v})}}
                  placeholder="Leica TS16"/>
              </EditField>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <EditField label="OPERADOR">
                <TInput value={reg.operador||""}
                  onChange={function(v){updReg({operador:v})}}
                  placeholder="Nombre"/>
              </EditField>
              <EditField label="ASISTENTE">
                <TInput value={reg.asistente||""}
                  onChange={function(v){updReg({asistente:v})}}
                  placeholder="Opcional"/>
              </EditField>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <EditField label="SISTEMA REF.">
                <TSelect value={reg.sistemaRef||"utm_19s"}
                  onChange={function(v){updReg({sistemaRef:v})}}
                  options={SISTEMAS_REF}/>
              </EditField>
              <EditField label="ESCALA">
                <TInput value={reg.escala||""}
                  onChange={function(v){updReg({escala:v})}}
                  placeholder="1:500"/>
              </EditField>
            </div>

            {/* Tipo — select */}
            <div style={{marginBottom:10}}>
              <EditField label="TIPO">
                <TSelect value={reg.tipo}
                  onChange={function(v){updReg({tipo:v})}}
                  options={TIPOS_REG}/>
              </EditField>
            </div>

            {/* Stats — solo lectura */}
            <div style={{background:T.base,border:"1px solid "+T.b1,borderRadius:3,
              padding:"8px 12px",marginBottom:12}}>
              <div style={{display:"flex",gap:16}}>
                <div>
                  <div style={L(T.t4,{fontSize:8,marginBottom:2})}>PUNTOS</div>
                  <div style={{fontFamily:T.mono,fontSize:16,fontWeight:700,color:T.data}}>
                    {nPuntos}
                  </div>
                </div>
                {nControl>0&&(
                  <div>
                    <div style={L(T.t4,{fontSize:8,marginBottom:2})}>CONTROL</div>
                    <div style={{fontFamily:T.mono,fontSize:16,fontWeight:700,color:T.amber}}>
                      {nControl}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{display:"flex",gap:8}}>
              <Btn onClick={function(){exportarRegistro(reg)}} variant="ghost" size="sm">
                EXPORTAR JSON
              </Btn>
              {confirmDelReg ? (
                <ConfirmBarra
                  msg={"ELIMINAR "+reg.codigo+" Y SUS "+reg.puntos.length+" PUNTOS"}
                  onOk={function(){p.onEliminar(reg.id)}}
                  onCancel={function(){setConfirmDelReg(false)}}
                  danger inline
                />
              ) : (
                <Btn onClick={function(){setConfirmDelReg(true)}} variant="danger" size="sm">
                  ELIMINAR REGISTRO
                </Btn>
              )}
            </div>
          </div>
        )}

        {tab==="obs"&&(
          <div style={{padding:"8px 10px 80px"}}>
            <EditField label="CONDICIONES DE CAMPO">
              <TArea value={reg.condiciones||""}
                onChange={function(v){updReg({condiciones:v})}}
                placeholder="Clima, visibilidad, temperatura, viento..."
                rows={3}/>
            </EditField>
            <EditField label="OBSERVACIONES TÉCNICAS">
              <TArea value={reg.observaciones||""}
                onChange={function(v){updReg({observaciones:v})}}
                placeholder="BM utilizados, cierre de vuelta, incidencias, notas para el procesamiento..."
                rows={5}/>
            </EditField>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Lista de registros ────────────────────────────────────────
// ── Panel de restauración de backup ──────────────────────────
// Flujo: seleccionar archivo → comparar → confirmar → backup automático → restaurar
function RestaurarPanel({onCerrar}) {
  var [paso,    setPaso]    = useState("seleccionar")  // seleccionar|comparar|confirmando|resultado
  var [err,     setErr]     = useState("")
  var [backup,  setBackup]  = useState(null)
  var [actual,  setActual]  = useState(null)
  var [resultado, setRes]   = useState(null)

  function calcularMetricas(datos) {
    var regs = datos.registros   || []
    var pts  = regs.reduce(function(s,r){return s+(r.puntos?r.puntos.length:0)}, 0)
    return {
      proyectos: (datos.proyectos   ||[]).length,
      registros: regs.length,
      puntos:    pts,
      notas:     (datos.aprendizaje ||[]).length,
      cursos:    (datos.cursos      ||[]).length,
    }
  }

  function leerArchivo(e) {
    var file = e.target.files && e.target.files[0]
    if (!file) return
    setErr("")
    var reader = new FileReader()
    reader.onload = function(ev) {
      try {
        var parsed = JSON.parse(ev.target.result)
        // V1: JSON válido ✓ (si llega aquí, parseó bien)
        // V2: versión
        if (!parsed.version) { setErr("No es un backup de TECTRA — falta versión"); return }
        if (parsed.version !== "tectra_v1") { setErr("Versión no reconocida: "+parsed.version); return }
        // V3: datos
        if (!parsed.datos || typeof parsed.datos !== "object") { setErr("Archivo vacío o dañado"); return }
        var claves = Object.keys(parsed.datos)
        var conocidas = ["registros","proyectos","aprendizaje","perfil","cursos","objetivos","diario"]
        if (!claves.some(function(k){return conocidas.includes(k)})) {
          setErr("Ningún dato reconocido en el backup"); return
        }
        // Calcular métricas
        var metricsBackup = calcularMetricas(parsed.datos)
        var currentData = {
          registros:   rd(SK.registros,   []),
          proyectos:   rd(SK.proyectos,   []),
          aprendizaje: rd(SK.aprendizaje, []),
          cursos:      rd(SK.cursos,      []),
        }
        var metricsActual = calcularMetricas(currentData)
        setBackup(parsed)
        setActual(metricsActual)
        setPaso("comparar")
      } catch(e2) {
        setErr("Archivo no válido o dañado")
      }
    }
    reader.onerror = function(){ setErr("Error al leer el archivo") }
    reader.readAsText(file)
  }

  function ejecutarRestauracion() {
    if (!backup) return
    setPaso("resultado")

    // Paso 1: backup automático del estado actual
    exportarBackupCompleto()  // descarga "tectra-backup-YYYY-MM-DD.json"

    // Paso 2: restaurar todos los storages (atómico en memoria, luego escribir)
    var SK_MAP = {
      registros:   SK.registros,
      proyectos:   SK.proyectos,
      aprendizaje: SK.aprendizaje,
      perfil:      SK.perfil,
      cursos:      SK.cursos,
      objetivos:   SK.objetivos,
      diario:      SK.diario,
    }
    var ops = []
    Object.entries(SK_MAP).forEach(function(entry){
      var k = entry[0], sk = entry[1]
      if (backup.datos[k] !== undefined) ops.push({sk:sk, val:backup.datos[k]})
    })

    var fallidas = []
    ops.forEach(function(op){
      var ok = wr(op.sk, op.val)
      if (!ok) fallidas.push(op.sk)
    })

    if (fallidas.length > 0) {
      setRes({ok:false, err:"Error al escribir: "+fallidas.join(", ")+". Usa el backup descargado para recuperar."})
    } else {
      setRes({ok:true, importados:ops.length, backup:backup})
    }
  }

  var filas = [
    {l:"PROYECTOS", k:"proyectos"},
    {l:"REGISTROS", k:"registros"},
    {l:"PUNTOS",    k:"puntos"},
    {l:"NOTAS",     k:"notas"},
    {l:"CURSOS",    k:"cursos"},
  ]

  return (
    <div style={{background:T.panel,border:"1px solid "+T.b2,
      borderRadius:3,margin:"8px 10px",overflow:"hidden"}}>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px 10px",borderBottom:"1px solid "+T.b2}}>
        <span style={L(T.coord,{fontSize:9})}>RESTAURAR BACKUP</span>
        <button onClick={onCerrar}
          style={L(T.t3,{background:"none",border:"none",cursor:"pointer",
            padding:"2px 6px",WebkitTapHighlightColor:"transparent"})}>
          ✕ CERRAR
        </button>
      </div>

      {/* PASO 1 — Seleccionar archivo */}
      {paso==="seleccionar"&&(
        <div style={{padding:"10px 10px"}}>
          <p style={B(T.t2,{fontSize:13,lineHeight:1.6,marginBottom:10})}>
            Selecciona el archivo de backup (.json) para restaurarlo.
          </p>
          {err&&(
            <div style={{background:T.redBg,border:"1px solid "+T.red+"50",
              borderRadius:2,padding:"7px 10px",marginBottom:10}}>
              <span style={L(T.red,{fontSize:9})}>{err}</span>
            </div>
          )}
          <label style={{display:"block",width:"100%"}}>
            <div style={{height:44,display:"flex",alignItems:"center",
              justifyContent:"center",
              background:T.coord+"14",border:"1px solid "+T.coord+"40",
              borderRadius:3,cursor:"pointer",
              fontFamily:T.mono,fontSize:11,fontWeight:700,
              color:T.coord,letterSpacing:"0.10em",textTransform:"uppercase"}}>
              SELECCIONAR ARCHIVO
            </div>
            <input type="file" accept=".json" onChange={leerArchivo}
              style={{display:"none"}}/>
          </label>
        </div>
      )}

      {/* PASO 2 — Comparar */}
      {paso==="comparar"&&actual&&backup&&(
        <div style={{padding:"10px 10px"}}>
          <p style={B(T.t3,{fontSize:12,marginBottom:8})}>
            Backup del {backup.exportadoEn
              ? new Date(backup.exportadoEn).toLocaleDateString("es-CL",
                  {day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})
              : "fecha desconocida"}
          </p>

          {/* Tabla comparativa */}
          <div style={{border:"1px solid "+T.b2,borderRadius:3,overflow:"hidden",marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 72px 72px",
              background:T.surface,borderBottom:"1px solid "+T.b2}}>
              <div style={L(T.t4,{padding:"5px 10px",fontSize:8})}> </div>
              <div style={L(T.t3,{padding:"5px 8px",fontSize:8,textAlign:"right"})}>ACTUAL</div>
              <div style={L(T.coord,{padding:"5px 8px",fontSize:8,textAlign:"right"})}>BACKUP</div>
            </div>
            {filas.map(function(f){
              var va = actual[f.k]  || 0
              var vb = backup.datos ? calcularMetricas(backup.datos)[f.k] : 0
              var delta = vb - va
              // Ámbar si el backup tiene MENOS (se perderían datos actuales)
              var colorVal = delta < 0 ? T.amber : delta > 0 ? T.green : T.t2
              return (
                <div key={f.k} style={{display:"grid",gridTemplateColumns:"1fr 72px 72px",
                  borderBottom:"1px solid "+T.b1}}>
                  <div style={L(T.t3,{padding:"7px 10px",fontSize:9})}>{f.l}</div>
                  <div style={{fontFamily:T.mono,fontSize:13,fontWeight:600,color:T.t2,
                    padding:"7px 8px",textAlign:"right"}}>{va.toLocaleString("es-CL")}</div>
                  <div style={{fontFamily:T.mono,fontSize:13,fontWeight:600,
                    color:colorVal,padding:"7px 8px",textAlign:"right"}}>
                    {vb.toLocaleString("es-CL")}
                    {delta!==0&&(
                      <span style={{fontFamily:T.mono,fontSize:9,marginLeft:4,
                        color:colorVal,opacity:.7}}>
                        {delta>0?"+":""}{delta}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{background:T.amberBg,border:"1px solid "+T.amber+"40",
            borderRadius:2,padding:"7px 10px",marginBottom:10}}>
            <p style={B(T.amber,{fontSize:13,lineHeight:1.5})}>
              El estado actual será reemplazado. Se descargará un backup automático del estado actual antes de restaurar.
            </p>
          </div>

          <div style={{display:"flex",gap:8}}>
            <Btn onClick={function(){setPaso("confirmando")}}
              variant="primary" color={T.coord} full>
              CONTINUAR CON RESTAURACIÓN
            </Btn>
            <Btn onClick={function(){setPaso("seleccionar");setBackup(null);setActual(null)}}
              variant="ghost" size="sm">
              CANCELAR
            </Btn>
          </div>
        </div>
      )}

      {/* PASO 3 — Confirmar */}
      {paso==="confirmando"&&(
        <div>
          <ConfirmBarra
            msg="RESTAURAR Y REEMPLAZAR — SE DESCARGARÁ BACKUP DEL ESTADO ACTUAL"
            onOk={ejecutarRestauracion}
            onCancel={function(){setPaso("comparar")}}
            danger
          />
          <div style={{padding:"10px 10px"}}>
            <p style={B(T.t3,{fontSize:13,lineHeight:1.6})}>
              Antes de restaurar se descargará automáticamente un backup del estado actual.
              Si la descarga no ocurre, cancela y usa el botón BACKUP primero.
            </p>
          </div>
        </div>
      )}

      {/* RESULTADO */}
      {paso==="resultado"&&resultado&&(
        <div style={{padding:"10px 10px"}}>
          {resultado.ok ? (
            <>
              <div style={{background:T.green+"12",border:"1px solid "+T.green+"40",
                borderRadius:2,padding:"8px 10px",marginBottom:10}}>
                <p style={L(T.green,{fontSize:9,marginBottom:4})}>RESTAURACIÓN COMPLETADA</p>
                <p style={B(T.t2,{fontSize:13})}>
                  {resultado.importados} colección{resultado.importados!==1?"es":""} restauradas.
                </p>
              </div>
              <Btn onClick={function(){window.location.reload()}}
                variant="primary" color={T.green} full>
                RECARGAR APLICACIÓN
              </Btn>
            </>
          ) : (
            <>
              <div style={{background:T.redBg,border:"1px solid "+T.red+"50",
                borderRadius:2,padding:"8px 10px",marginBottom:10}}>
                <p style={L(T.red,{fontSize:9,marginBottom:4})}>ERROR EN RESTAURACIÓN</p>
                <p style={B(T.t2,{fontSize:13,lineHeight:1.5})}>{resultado.err}</p>
              </div>
              <Btn onClick={function(){setPaso("seleccionar");setRes(null)}}
                variant="ghost" size="sm">
                VOLVER A INTENTAR
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  )
}


function ListaRegistros(p) {
  var [filtro,      setFiltro]      = useState("todos")
  var [filtroProy,  setFiltroProy]  = useState(null)   // null = todos los proyectos
  var [restaurando, setRest]        = useState(false)
  var filtrados = useMemo(function(){
    var base = p.registros
    // Filtro por tipo
    if (filtro !== "todos") base = base.filter(function(r){return r.tipo===filtro})
    // Filtro por proyecto
    if (filtroProy) base = base.filter(function(r){return r.proyectoId===filtroProy})
    // Orden: último trabajado primero
    return base.slice().sort(function(a,b){
      var da = a.actualizadoEn||a.creadoEn||""
      var db = b.actualizadoEn||b.creadoEn||""
      return db > da ? 1 : -1
    })
  },[p.registros,filtro,filtroProy])

  // Proyectos que tienen al menos 1 registro — para el filtro
  var proyectosConRegistros = useMemo(function(){
    var ids = {}
    p.registros.forEach(function(r){
      if(r.proyectoId) ids[r.proyectoId] = r.proyectoNombre||r.proyectoId
    })
    return Object.keys(ids).map(function(id){return {id:id,nombre:ids[id]}})
  },[p.registros])

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="TOPOGRAFÍA" accent={T.blue}
        sub={p.registros.length+" REGISTROS"}
        right={
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={function(){exportarBackupCompleto()}}
              style={L(T.coord,{background:"none",border:"1px solid "+T.coord+"40",borderRadius:2,
                padding:"3px 7px",cursor:"pointer",fontSize:9,WebkitTapHighlightColor:"transparent"})}>
              BACKUP
            </button>
            <button onClick={function(){setRest(function(v){return !v})}}
              style={L(restaurando?T.coord:T.t3,{
                background:restaurando?T.coord+"14":"none",
                border:"1px solid "+(restaurando?T.coord+"40":T.b2),borderRadius:2,
                padding:"3px 7px",cursor:"pointer",fontSize:9,
                WebkitTapHighlightColor:"transparent"})}>
              RESTAURAR
            </button>
            <button onClick={p.onCalc}
              style={L(T.coord,{background:"none",border:"1px solid "+T.coord+"40",borderRadius:2,
                padding:"3px 7px",cursor:"pointer",fontSize:9,WebkitTapHighlightColor:"transparent"})}>
              CALC
            </button>
          </div>
        }
      />

      {restaurando&&<RestaurarPanel onCerrar={function(){setRest(false)}}/>}

      {/* Filtros */}
      <div style={{display:"flex",background:T.panel,borderBottom:"1px solid "+T.b2,flexShrink:0}}>
        {[{v:"todos",l:"TODOS"},{v:"levantamiento",l:"LEVANT."},{v:"control_geo",l:"CTL-G"},{v:"as_built",l:"AS-BUILT"}].map(function(f,i){
          var on=filtro===f.v
          return (
            <button key={f.v} onClick={function(){setFiltro(f.v)}}
              style={{flex:1,height:28,background:on?T.rowSel:"transparent",
                borderRight:i<3?"1px solid "+T.b1:"none",borderTop:"none",
                borderBottom:on?"2px solid "+T.blue:"2px solid transparent",borderLeft:"none",
                fontFamily:T.mono,fontSize:9,fontWeight:700,color:on?T.blue:T.t4,
                letterSpacing:"0.09em",textTransform:"uppercase",cursor:"pointer",
                WebkitTapHighlightColor:"transparent",marginBottom:-1}}>
              {f.l}
            </button>
          )
        })}
      </div>

      {/* Filtro por proyecto — solo si hay proyectos con registros */}
      {proyectosConRegistros.length > 0 && (
        <div style={{
          display:"flex", background:T.base,
          borderBottom:"1px solid "+T.b1,
          overflowX:"auto", WebkitOverflowScrolling:"touch",
          flexShrink:0, scrollbarWidth:"none",
        }}>
          <button onClick={function(){setFiltroProy(null)}}
            style={{
              height:26, padding:"0 10px", flexShrink:0,
              background:!filtroProy?T.rowSel:"transparent",
              borderRight:"1px solid "+T.b1,
              borderTop:"none",
              borderBottom:!filtroProy?"2px solid "+T.blue:"2px solid transparent",
              borderLeft:"none",
              fontFamily:T.mono,fontSize:9,fontWeight:700,
              color:!filtroProy?T.blue:T.t4,
              letterSpacing:"0.09em",textTransform:"uppercase",
              cursor:"pointer",WebkitTapHighlightColor:"transparent",
              marginBottom:-1,
            }}>
            TODOS LOS PROYECTOS
          </button>
          {proyectosConRegistros.map(function(proy){
            var on = filtroProy===proy.id
            return (
              <button key={proy.id} onClick={function(){setFiltroProy(proy.id)}}
                style={{
                  height:26, padding:"0 10px", flexShrink:0, maxWidth:140,
                  background:on?T.rowSel:"transparent",
                  borderRight:"1px solid "+T.b1,
                  borderTop:"none",
                  borderBottom:on?"2px solid "+T.blue:"2px solid transparent",
                  borderLeft:"none",
                  fontFamily:T.sans,fontSize:11,fontWeight:on?500:400,
                  color:on?T.t1:T.t3,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent",
                  overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",
                  marginBottom:-1,
                }}>
                {proy.nombre}
              </button>
            )
          })}
        </div>
      )}

      {/* Indicador de persistencia — cambia visualmente con cada write */}
      <div style={{padding:"4px 10px",background:T.base,borderBottom:"1px solid "+T.b1,
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <Dot color={p.saveStatus==="error"?T.red:p.saveStatus==="saving"?T.amber:T.green} size={5} />
          <span style={L(p.saveStatus==="error"?T.red:p.saveStatus==="saving"?T.amber:T.t4,{fontSize:8})}>
            {p.saveStatus==="error"?"ERROR AL GUARDAR":p.saveStatus==="saving"?"GUARDANDO...":"GUARDADO · LOCAL"}
          </span>
        </div>
        <span style={L(T.t4,{fontSize:8})}>{storageKB(SK.registros)}KB</span>
      </div>

      {/* Lista */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtrados.length===0 ? (
          <div style={{padding:"32px 16px",textAlign:"center"}}>
            <p style={L(T.t3,{marginBottom:10})}>SIN REGISTROS</p>
            {filtro==="todos" && p.registros.length===0 && (
              <button onClick={p.onCargarDemo}
                style={{fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.t3,
                  background:"none",border:"1px solid "+T.b2,borderRadius:2,
                  padding:"5px 10px",cursor:"pointer",letterSpacing:"0.10em",
                  textTransform:"uppercase",WebkitTapHighlightColor:"transparent"}}>
                CARGAR DATOS DE EJEMPLO
              </button>
            )}
          </div>
        ) : (
          filtrados.map(function(r,i){
            return <FilaRegistro key={r.id} reg={r} alt={i%2===1} onClick={function(){p.onSelect(r)}} />
          })
        )}
      </div>

      <div style={{padding:"8px 10px",background:T.surface,borderTop:"1px solid "+T.b2,flexShrink:0}}>
        <Btn onClick={p.onNuevo} variant="primary" color={T.blue} full>NUEVO REGISTRO</Btn>
      </div>
    </div>
  )
}

function FilaRegistro(p) {
  var r=p.reg
  var [pr,setPr]=useState(false)
  var instrLabel={estacion_total:"EST.T",gps_rtk:"GPS RTK",nivel:"NIVEL",disto:"DISTO",cinta:"CINTA",otro:"OTRO"}[r.instrumento]||"—"
  var tipoColor={levantamiento:T.blue,control_geo:T.amber,as_built:T.coord,perfil:T.data}[r.tipo]||T.blue
  return (
    <div onClick={p.onClick}
      onPointerDown={function(){setPr(true)}} onPointerUp={function(){setPr(false)}} onPointerLeave={function(){setPr(false)}}
      style={{background:pr?T.rowSel:p.alt?T.rowAlt:T.row,borderBottom:"1px solid "+T.b1,
        padding:"8px 10px",cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"background 80ms"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        <span style={L(T.t3,{fontSize:9})}>{r.codigo}</span>
        <span style={{color:T.t4,fontSize:9}}>·</span>
        <span style={L(tipoColor,{fontSize:9})}>{r.tipo.replace("_"," ").toUpperCase()}</span>
        <span style={{marginLeft:"auto"}}><Tag color={T.data}>{r.puntos.length} PT</Tag></span>
      </div>
      <p style={B(T.t1,{fontWeight:500,lineHeight:1.25,marginBottom:4,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"})}>{r.titulo}</p>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={L(T.t3,{fontSize:9})}>{r.fecha}</span>
        <span style={{color:T.t4,fontSize:9}}>·</span>
        <span style={L(T.t3,{fontSize:9})}>{instrLabel}</span>
        {r.proyectoNombre&&<><span style={{color:T.t4,fontSize:9}}>·</span><span style={B(T.t3,{fontSize:12,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",flex:1})}>{r.proyectoNombre}</span></>}
      </div>
    </div>
  )
}

// ── Nuevo registro ────────────────────────────────────────────
// ── SelectorProyecto ─────────────────────────────────────────
// Lista compacta de proyectos activos para asociar a un registro.
// No es un <select> — es un listado técnico con el proyecto activo resaltado.
// Sin proyecto = válido. El campo es opcional.
function SelectorProyecto(p) {
  var proyectos = p.proyectos || []

  if (proyectos.length === 0) {
    return (
      <div style={{
        padding:"7px 10px", background:T.input,
        border:"1px solid "+T.b2, borderRadius:3,
      }}>
        <span style={L(T.t4,{fontSize:9})}>SIN PROYECTOS ACTIVOS — CREA UNO EN PROY</span>
      </div>
    )
  }

  return (
    <div style={{
      background:T.input, border:"1px solid "+T.b2,
      borderRadius:3, overflow:"hidden",
      maxHeight:200, overflowY:"auto",
    }}>
      {/* Opción ninguno */}
      <button onClick={function(){p.onChange(null)}}
        style={{
          display:"flex", alignItems:"center", gap:8,
          width:"100%", padding:"7px 10px", minHeight:34,
          background: !p.value ? T.rowSel : "transparent",
          border:"none",
          borderBottom:"1px solid "+T.b1,
          cursor:"pointer", WebkitTapHighlightColor:"transparent",
          textAlign:"left",
        }}>
        <span style={L(!p.value?T.t2:T.t4,{fontSize:9})}>
          {!p.value ? "▶ SIN PROYECTO" : "— SIN PROYECTO"}
        </span>
      </button>

      {/* Proyectos activos */}
      {proyectos.map(function(proy, i) {
        var isSelected = p.value === proy.id
        var estadoColor = {activo:T.green,en_pausa:T.amber}[proy.estado]||T.t3
        return (
          <button key={proy.id}
            onClick={function(){p.onChange(proy.id)}}
            style={{
              display:"flex", alignItems:"center", gap:8,
              width:"100%", padding:"7px 10px", minHeight:34,
              background: isSelected ? T.rowSel : "transparent",
              border:"none",
              borderBottom: i < proyectos.length-1 ? "1px solid "+T.b1 : "none",
              cursor:"pointer", WebkitTapHighlightColor:"transparent",
              textAlign:"left",
            }}>
            <div style={{
              width:5, height:5, borderRadius:1,
              background:estadoColor, flexShrink:0,
            }}/>
            <span style={{
              fontFamily:T.sans, fontSize:13,
              color:isSelected?T.t1:T.t2,
              flex:1, overflow:"hidden",
              whiteSpace:"nowrap", textOverflow:"ellipsis",
              lineHeight:1.3,
            }}>
              {proy.nombre}
            </span>
            <span style={L(T.t3,{fontSize:8})}>{proy.codigo}</span>
            {isSelected && <span style={L(T.blue,{fontSize:8})}>▶</span>}
          </button>
        )
      })}
    </div>
  )
}

function NuevoRegistro(p) {
  var [form,setForm]=useState({
    titulo:"",tipo:"levantamiento",fecha:hoy(),
    instrumento:"estacion_total",instrumentoDetalle:"",
    operador:"",asistente:"",
    sistemaRef:"utm_19s",escala:"",
    condiciones:"",observaciones:"",
    proyectoId:null,proyectoNombre:null,   // conexión al ecosistema
  })
  var [err,setErr]=useState("")
  function sf(k){return function(v){setForm(function(s){var n=Object.assign({},s);n[k]=v;return n})}}

  // Seleccionar proyecto — actualiza id y nombre en el form
  function selProyecto(id) {
    if (!id) {
      setForm(function(s){return Object.assign({},s,{proyectoId:null,proyectoNombre:null})})
      return
    }
    var proy = (p.proyectos||[]).find(function(pr){return pr.id===id})
    if (proy) {
      setForm(function(s){return Object.assign({},s,{
        proyectoId:proy.id,
        proyectoNombre:proy.nombre,
      })})
    }
  }

  var [confirmSalirForm, setConfirmSalirForm] = useState(false)

  function handleBack() {
    if (form.titulo.trim()) {
      setConfirmSalirForm(true)
      return
    }
    p.onCancelar()
  }

  function guardar(){
    if(!form.titulo.trim()){setErr("TÍTULO OBLIGATORIO");return}
    // Usar máximo existente para evitar códigos duplicados tras borrar registros
    var n=String(p.maxCodigo+1).padStart(3,"0")
    p.onGuardar(Object.assign({},form,{
      id:uid(),codigo:"LVT-"+new Date().getFullYear()+"-"+n,
      titulo:form.titulo.trim(),estado:"activo",puntos:[],
      // proyectoId y proyectoNombre vienen del form (seleccionados por el usuario)
      creadoEn:hoy(),
    }))
  }

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      {confirmSalirForm && (
        <ConfirmBarra
          msg="DESCARTAR ESTE FORMULARIO"
          onOk={p.onCancelar}
          onCancel={function(){setConfirmSalirForm(false)}}
        />
      )}
      <Topbar title="NUEVO REGISTRO" accent={T.blue} onBack={handleBack} />
      <div style={{flex:1,overflowY:"auto",padding:"12px 10px 80px"}}>
        {err&&<div style={L(T.red,{background:T.redBg,border:"1px solid "+T.red+"50",borderRadius:2,padding:"8px 12px",marginBottom:12})}>⚠ {err}</div>}
        {/* Selector de proyecto — primero porque da contexto a todo el registro */}
        <Field label="PROYECTO">
          <SelectorProyecto
            proyectos={p.proyectos||[]}
            value={form.proyectoId}
            onChange={selProyecto}
          />
        </Field>

        <Field label="TÍTULO DEL REGISTRO" required>
          <TInput value={form.titulo} onChange={function(v){sf("titulo")(v);setErr("")}} placeholder="Ej: Sector Norte — Planta baja" />
        </Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Field label="TIPO"><TSelect value={form.tipo} onChange={sf("tipo")} options={TIPOS_REG} /></Field>
          <Field label="FECHA"><TInput value={form.fecha} onChange={sf("fecha")} type="date" /></Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Field label="INSTRUMENTO"><TSelect value={form.instrumento} onChange={sf("instrumento")} options={INSTRUMENTOS} /></Field>
          <Field label="MODELO"><TInput value={form.instrumentoDetalle} onChange={sf("instrumentoDetalle")} placeholder="Leica TS16" /></Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Field label="OPERADOR"><TInput value={form.operador} onChange={sf("operador")} placeholder="Nombre" /></Field>
          <Field label="ASISTENTE"><TInput value={form.asistente} onChange={sf("asistente")} placeholder="Opcional" /></Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Field label="SISTEMA REF."><TSelect value={form.sistemaRef} onChange={sf("sistemaRef")} options={SISTEMAS_REF} /></Field>
          <Field label="ESCALA"><TInput value={form.escala} onChange={sf("escala")} placeholder="1:500" /></Field>
        </div>
        <Field label="CONDICIONES"><TArea value={form.condiciones} onChange={sf("condiciones")} placeholder="Clima, visibilidad..." rows={2} /></Field>
        <Field label="OBSERVACIONES"><TArea value={form.observaciones} onChange={sf("observaciones")} placeholder="BM utilizados, cierre de vuelta, incidencias..." rows={3} /></Field>
        <HR my={4} />
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={guardar} variant="primary" color={T.blue} full>CREAR REGISTRO</Btn>
          <Btn onClick={handleBack} variant="ghost">CANCELAR</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Calculadora ───────────────────────────────────────────────
function Calculadora(p) {
  var [modo,setModo]=useState("dist")
  var [n1,setN1]=useState(""), [e1,setE1]=useState(""), [z1,setZ1]=useState("")
  var [n2,setN2]=useState(""), [e2,setE2]=useState(""), [z2,setZ2]=useState("")
  var [res,setRes]=useState(null)

  function calcular() {
    var N1=parseCoord(n1), E1=parseCoord(e1)
    var N2=parseCoord(n2), E2=parseCoord(e2)
    if(N1===null||E1===null||N2===null||E2===null){setRes({err:"COORDENADAS INVÁLIDAS"});return}
    var dN=N2-N1, dE=E2-E1
    var dist=Math.sqrt(dN*dN+dE*dE)
    var azRad=Math.atan2(dE,dN)
    var azGrad=(azRad*180/Math.PI+360)%360
    var g=Math.floor(azGrad), mRest=(azGrad-g)*60, m=Math.floor(mRest), s=(mRest-m)*60
    var azStr=g+"°"+String(m).padStart(2,"0")+"'"+s.toFixed(1)+"\""
    var result={dist:dist.toFixed(3),az:azStr,azDec:azGrad.toFixed(4)}
    if(modo==="desnivel"){
      var Z1=parseCoord(z1), Z2=parseCoord(z2)
      if(Z1!==null&&Z2!==null){
        var dn=Z2-Z1, pct=dist>0?dn/dist*100:0
        result.desnivel=(dn>=0?"+":"")+dn.toFixed(3)
        result.pendiente=pct.toFixed(2)
        result.distSlope=Math.sqrt(dist*dist+dn*dn).toFixed(3)
      }
    }
    setRes(result)
  }

  function limpiar(){setN1("");setE1("");setZ1("");setN2("");setE2("");setZ2("");setRes(null)}

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="CALCULADORA" accent={T.coord} onBack={p.onBack} sub="CÁLCULOS DE CAMPO" />
      <div style={{flex:1,overflowY:"auto",padding:"10px"}}>
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {[{v:"dist",l:"DISTANCIA"},{v:"azimut",l:"AZIMUT"},{v:"desnivel",l:"DESNIVEL"}].map(function(m){
            var on=modo===m.v
            return (
              <button key={m.v} onClick={function(){setModo(m.v);setRes(null)}}
                style={{flex:1,height:34,
                  background:on?T.s3||T.surface:"transparent",
                  borderRight:"1px solid "+T.b1,
                  borderTop:"none",
                  borderBottom:on?"2px solid "+T.coord:"2px solid transparent",
                  borderLeft:"none",
                  fontFamily:T.mono,fontSize:9,fontWeight:700,
                  color:on?T.coord:T.t3,
                  letterSpacing:"0.09em",textTransform:"uppercase",
                  cursor:"pointer",WebkitTapHighlightColor:"transparent",
                  marginBottom:-1}}>
                {m.l}
              </button>
            )
          })}
        </div>
        {["A","B"].map(function(ltr,idx){
          var nv=idx===0?n1:n2, ev=idx===0?e1:e2, zv=idx===0?z1:z2
          var sn=idx===0?setN1:setN2, se=idx===0?setE1:setE2, sz=idx===0?setZ1:setZ2
          return (
            <div key={ltr} style={{background:T.panel,border:"1px solid "+T.b1,borderRadius:3,padding:"8px 10px",marginBottom:8}}>
              <div style={L(T.t3,{marginBottom:8,fontSize:9})}>PUNTO {ltr}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"+(modo==="desnivel"?" 1fr":""),gap:6}}>
                <div><div style={L(T.coord,{marginBottom:3,fontSize:9})}>NORTE</div><CoordInput value={nv} onChange={sn} placeholder="Norte" /></div>
                <div><div style={L(T.coord,{marginBottom:3,fontSize:9})}>ESTE</div><CoordInput value={ev} onChange={se} placeholder="Este" /></div>
                {modo==="desnivel"&&<div><div style={L(T.data,{marginBottom:3,fontSize:9})}>ELEV</div><CoordInput value={zv} onChange={sz} placeholder="Elevación" /></div>}
              </div>
            </div>
          )
        })}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <Btn onClick={calcular} variant="primary" color={T.coord} full>CALCULAR</Btn>
          <Btn onClick={limpiar} variant="ghost">LIMPIAR</Btn>
        </div>
        {res&&(
          <div style={{background:T.base,border:"1px solid "+(res.err?T.red:T.b2),borderRadius:3}}>
            {res.err ? (
              <div style={{padding:"10px 12px"}}><span style={L(T.red)}>{res.err}</span></div>
            ) : (
              <>
                <div style={{padding:"5px 12px",borderBottom:"1px solid "+T.b2,background:T.panel}}>
                  <span style={L(T.coord,{fontSize:9})}>RESULTADO</span>
                </div>
                <DRow label="DISTANCIA HORIZ." value={res.dist} unit="m" color={T.data} />
                <DRow label="AZIMUT" value={res.az} color={T.coord} />
                <DRow label="AZIMUT DECIMAL" value={res.azDec+"°"} color={T.t2} />
                {res.desnivel&&<>
                  <DRow label="DESNIVEL" value={res.desnivel} unit="m" color={parseFloat(res.desnivel)>=0?T.green:T.amber} />
                  <DRow label="PENDIENTE" value={res.pendiente} unit="%" color={T.data} />
                  <DRow label="DIST. INCLINADA" value={res.distSlope} unit="m" color={T.t2} />
                </>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Controlador principal ─────────────────────────────────────
function ModuloTopografia() {
  // Carga desde localStorage al montar, inicializa con demo si está vacío
  var [registros, setRegistros] = useState(function(){return rd(SK.registros, [])})
  var [proyectos, setProyectos] = useState(function(){return rd(SK.proyectos, [])})
  var [vista,     setVista]     = useState("lista")
  var [sel,       setSel]       = useState(null)

  // Recargar proyectos cuando el módulo se monta o vuelve a foco
  // (puede haber cambiado en el módulo PROYECTOS)
  useEffect(function(){
    setProyectos(rd(SK.proyectos, []))
  }, [vista])  // recarga al cambiar de vista (ej: volver de nuevo registro)

  // C3: Persiste en cada cambio + actualiza indicador visible
  var [saveStatus, setSaveStatus] = useState("ok")  // "ok" | "saving" | "error"
  useEffect(function(){
    setSaveStatus("saving")
    var ok = wr(SK.registros, registros)
    // Timeout mínimo para que el cambio sea perceptible visualmente
    var t = setTimeout(function(){ setSaveStatus(ok?"ok":"error") }, 300)
    return function(){ clearTimeout(t) }
  },[registros])

  function actualizar(r) {
    setRegistros(function(rs){return rs.map(function(x){return x.id===r.id?r:x})})
    setSel(r)
  }

  function eliminar(id) {
    setRegistros(function(rs){return rs.filter(function(r){return r.id!==id})})
    setSel(null)   // RD3: limpiar sel para evitar estado inconsistente
    setVista("lista")
  }

  function agregar(r) {
    setRegistros(function(rs){return [r].concat(rs)})
    setSel(r)
    setVista("detalle")
  }

  // Calcular máximo código existente para evitar duplicados
  var maxCodigo = registros.reduce(function(mx, r){
    var n = parseInt((r.codigo||"").split("-").pop()) || 0
    return n > mx ? n : mx
  }, 0)
  if(vista==="nuevo") return <NuevoRegistro maxCodigo={maxCodigo} proyectos={proyectos.filter(p => p.estado==="activo"||p.estado==="en_pausa")} onGuardar={agregar} onCancelar={function(){setVista("lista")}} />
  if(vista==="calc")  return <Calculadora onBack={function(){setVista("lista")}} />
  if(vista==="detalle"&&sel) return <DetalleRegistro registro={sel} onBack={function(){setVista("lista")}} onActualizar={actualizar} onEliminar={eliminar} />

  function cargarDemo() {
    setRegistros(DEMO_REGISTROS)
  }

  return <ListaRegistros registros={registros} saveStatus={saveStatus}
    onSelect={function(r){setSel(r);setVista("detalle")}}
    onNuevo={function(){setVista("nuevo")}}
    onCalc={function(){setVista("calc")}}
    onCargarDemo={cargarDemo} />
}

export default ModuloTopografia
