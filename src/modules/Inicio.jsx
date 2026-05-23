import { useState, useMemo, useEffect } from "react"
import { T, SK, CATS, CATS_MAP } from "../shared/tokens"
import { rd } from "../shared/storage"
import { semanaISO } from "../shared/utils"
import { L, B, TL, Nav, HR } from "../shared/ui"

// ================================================================
// TECTRA — MÓDULO INICIO
// Centro operacional. Lee todos los módulos. No pide datos nuevos.
// Sistema 1: datos reales + placeholders honestos para Sistema 2.
// ================================================================





var hoyStr = function() { return new Date().toISOString().split("T")[0] }
var INSTR_MAP = {
  estacion_total:"EST. TOTAL", gps_rtk:"GPS RTK", nivel:"NIVEL",
  disto:"DISTÓMETRO", cinta:"CINTA", otro:"OTRO",
}

var SEMANA  = semanaISO()

// ── Catálogos compartidos ─────────────────────────────────────


// ── Leer y calcular todo desde storage ───────────────────────
function cargarDatos() {
  var proyectos   = rd(SK.proyectos)   || []
  var registros   = rd(SK.registros)   || []
  var notas       = rd(SK.aprendizaje) || []
  var diario      = rd(SK.diario)      || []
  var perfil      = rd(SK.perfil)      || {vision:{texto:"",frase:""},objetivoSemana:null,metasTecnicas:[],metasFinancieras:[]}
  var cursos      = rd(SK.cursos)      || []
  var histObj     = rd(SK.objetivos)   || []

  var ahora = new Date()
  var hace7 = new Date(ahora); hace7.setDate(ahora.getDate()-7)
  var hace30= new Date(ahora); hace30.setDate(ahora.getDate()-30)
  var iSem  = new Date(ahora); iSem.setDate(ahora.getDate()-ahora.getDay()); iSem.setHours(0,0,0,0)

  function enSemana(d) { return d && new Date(d) >= iSem }
  function en30(d)     { return d && new Date(d) >= hace30 }

  // ── Proyecto activo ─────────────────────────────────────────
  var proyActivos = proyectos.filter(function(p){return p.estado==="activo"})
  // El más recientemente actualizado
  var proyPrincipal = proyActivos.slice().sort(function(a,b){
    return (b.actualizadoEn||b.creadoEn||"")>(a.actualizadoEn||a.creadoEn||"")? 1:-1
  })[0] || null

  // ── Último registro topográfico ─────────────────────────────
  var ultimoReg = registros.slice().sort(function(a,b){
    return (b.actualizadoEn||b.creadoEn||"")>(a.actualizadoEn||a.creadoEn||"")? 1:-1
  })[0] || null

  // ── Actividad semana actual ─────────────────────────────────
  var regSemana   = registros.filter(function(r){return enSemana(r.creadoEn||r.actualizadoEn)})
  var puntSemana  = regSemana.reduce(function(s,r){return s+(r.puntos?r.puntos.length:0)},0)
  var notasSemana = notas.filter(function(n){return enSemana(n.creadoEn)})
  var aplicSemana = notas.filter(function(n){return enSemana(n.ultimaAplicacion)})

  // ── Habilidades por categoría (desde notas reales) ──────────
  var habilidades = {}
  Object.keys(CATS_MAP).forEach(function(k){
    habilidades[k] = {total:0, dominado:0, aplicando:0, aprendiendo:0, aplicaciones:0, ultimaActiv:null}
  })
  notas.forEach(function(n){
    var c = n.categoria
    if (!habilidades[c]) return
    habilidades[c].total++
    habilidades[c][n.dominio] = (habilidades[c][n.dominio]||0) + 1
    habilidades[c].aplicaciones += (n.vecesAplicado||0)
    var ua = n.ultimaAplicacion || n.actualizadoEn || n.creadoEn
    if (!habilidades[c].ultimaActiv || ua > habilidades[c].ultimaActiv)
      habilidades[c].ultimaActiv = ua
  })

  // Detectar categorías activas (con al menos 1 nota)
  var catActivas = Object.keys(habilidades).filter(function(k){
    return habilidades[k].total > 0
  })

  // Detectar categorías sin actividad en 30 días (señal de estancamiento)
  var catEstancadas = catActivas.filter(function(k){
    var ua = habilidades[k].ultimaActiv
    return !ua || !en30(ua)
  })

  // Categoría más activa en aplicaciones
  var catMasActiva = catActivas.slice().sort(function(a,b){
    return habilidades[b].aplicaciones - habilidades[a].aplicaciones
  })[0] || null

  // Notas pendientes de dominar (aprendiendo con > 0 aplicaciones)
  var notasPorDominar = notas.filter(function(n){
    return n.dominio==="aprendiendo" && (n.vecesAplicado||0) > 0
  })

  // ── Totales acumulados ──────────────────────────────────────
  var totales = {
    proyectos:   proyectos.length,
    registros:   registros.length,
    puntos:      registros.reduce(function(s,r){return s+(r.puntos?r.puntos.length:0)},0),
    notas:       notas.length,
    notasDom:    notas.filter(function(n){return n.dominio==="dominado"}).length,
    aplicaciones:notas.reduce(function(s,n){return s+(n.vecesAplicado||0)},0),
  }

  // ── Objetivo semanal ────────────────────────────────────────
  var objetivo = perfil.objetivoSemana &&
    perfil.objetivoSemana.semana === SEMANA
    ? perfil.objetivoSemana : null

  // ── Cursos activos ──────────────────────────────────────────
  var cursosActivos = cursos.filter(function(c){return c.estado==="en_curso"})
  var cursoMasAplicado = cursosActivos.slice().sort(function(a,b){
    return (b.aplicacionesEnObra||[]).length - (a.aplicacionesEnObra||[]).length
  })[0] || null

  // ── Consistencia semanal (historial objetivos) ──────────────
  var totalObj    = histObj.length + (perfil.objetivoSemana ? 1 : 0)
  var completados = histObj.filter(function(o){return o.completado}).length
    + (objetivo && objetivo.completado ? 1 : 0)
  var consistencia = totalObj > 0 ? Math.round(completados/totalObj*100) : null

  return {
    proyPrincipal, ultimoReg, proyActivos,
    regSemana, puntSemana, notasSemana, aplicSemana,
    habilidades, catActivas, catEstancadas, catMasActiva,
    notasPorDominar, totales, objetivo,
    cursosActivos, cursoMasAplicado,
    consistencia, totalObj, completados,
    perfil,
    vacio: registros.length===0 && notas.length===0 && proyectos.length===0,
  }
}

// ── Style helpers ─────────────────────────────────────────────

// ── Bloque sección ────────────────────────────────────────────
function Sec(p) {
  return (
    <div style={{borderBottom:"1px solid "+T.b2,marginBottom:0}}>
      {p.label && (
        <div style={{padding:"5px 10px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={L(T.t3,{fontSize:9})}>{p.label}</span>
          {p.right}
        </div>
      )}
      <div style={{padding:p.noPad?"0":"4px 10px 8px"}}>
        {p.children}
      </div>
    </div>
  )
}

// ── Dato técnico inline ───────────────────────────────────────
function DInline(p) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      minHeight:28,gap:8,padding:"1px 0"}}>
      <span style={L(T.t4,{fontSize:9,flexShrink:0})}>{p.label}</span>
      <span style={{fontFamily:T.mono,fontSize:12,fontWeight:600,color:p.color||T.data,
        textAlign:"right",flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
        {p.value}
      </span>
    </div>
  )
}

// ── Fila de acción táctil ─────────────────────────────────────
function Accion(p) {
  var [pr,setPr]=useState(false)
  return (
    <div onClick={p.onClick}
      onPointerDown={function(){setPr(true)}}
      onPointerUp={function(){setPr(false)}}
      onPointerLeave={function(){setPr(false)}}
      style={{display:"flex",alignItems:"center",gap:10,
        padding:"8px 10px",background:pr?T.rowSel:T.panel,
        border:"1px solid "+(p.urgent?p.color+"40":T.b1),
        borderLeft:"3px solid "+(p.color||T.t3),
        borderRadius:3,cursor:"pointer",WebkitTapHighlightColor:"transparent",
        marginBottom:4,transition:"background 80ms"}}>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontFamily:T.mono,fontSize:11,fontWeight:700,
          color:p.color||T.t2,letterSpacing:"0.07em",marginBottom:p.sub?2:0}}>
          {p.label}
        </p>
        {p.sub && <p style={B(T.t3,{fontSize:12,lineHeight:1.3})}>{p.sub}</p>}
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth="2.5">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

// ── Barra de actividad compacta ───────────────────────────────
function BarraActividad(p) {
  var items = p.items
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat("+items.length+",1fr)",gap:4}}>
      {items.map(function(item) {
        return (
          <div key={item.l} style={{textAlign:"center",padding:"6px 4px",
            background:T.base,border:"1px solid "+T.b1,borderRadius:3}}>
            <div style={{fontFamily:T.mono,fontSize:18,fontWeight:700,
              color:item.v>0?item.c:T.t4,lineHeight:1,marginBottom:2}}>
              {item.v}
            </div>
            <div style={L(T.t4,{fontSize:8})}>{item.l}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Barra de habilidad técnica ────────────────────────────────
function FilaHabilidad(p) {
  var h = p.hab, cat = CATS_MAP[p.cat]||{l:p.cat,c:T.t3}
  if (h.total === 0) return null
  var pctDom = Math.round((h.dominado/h.total)*100)
  var pctApl = Math.round((h.aplicando/h.total)*100)
  var ua = h.ultimaActiv
  var diasSinActividad = ua
    ? Math.floor((new Date()-new Date(ua))/(1000*60*60*24))
    : 999
  var estancada = diasSinActividad > 30

  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,
      opacity:estancada?0.5:1}}>
      <span style={L(cat.c,{fontSize:9,minWidth:84,flexShrink:0})}>{cat.l}</span>
      <div style={{flex:1,height:4,background:T.b2,overflow:"hidden"}}>
        <div style={{height:"100%",display:"flex"}}>
          <div style={{width:pctDom+"%",background:T.green}}/>
          <div style={{width:pctApl+"%",background:T.blue}}/>
        </div>
      </div>
      <span style={L(T.t3,{fontSize:8,minWidth:20,textAlign:"right"})}>{h.total}</span>
      {estancada && <span style={L(T.amber,{fontSize:8,flexShrink:0})}>!</span>}
    </div>
  )
}

// ── Placeholder S2 ────────────────────────────────────────────
function S2Block(p) {
  return (
    <div style={{background:T.violet+"08",border:"1px solid "+T.violet+"20",
      borderRadius:3,padding:"7px 10px",marginBottom:4}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={L(T.violet,{fontSize:9,opacity:.6})}>{p.label}</span>
        <span style={L(T.violet,{fontSize:8,opacity:.4})}>SISTEMA 2</span>
      </div>
      {p.desc && <p style={B(T.t4,{fontSize:12,marginTop:3,lineHeight:1.4})}>{p.desc}</p>}
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────

function ModuloInicio(p) {
  var [datos, setDatos] = useState(function(){ return cargarDatos() })

  // Recarga al montar y al volver de otro módulo
  useEffect(function(){
    setDatos(cargarDatos())
  }, [])

  var d = datos
  var onNav = p.onNav

  // ── Pantalla vacía: primer uso ────────────────────────────────
  if (d.vacio) {
    return (
      <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
        <div style={{background:T.surface,borderTop:"2px solid "+T.cyan,
          borderBottom:"2px solid "+T.b2,display:"flex",alignItems:"center",
          height:46,padding:"0 4px 0 0",flexShrink:0}}>
          <div style={{width:3,background:T.cyan,alignSelf:"stretch",flexShrink:0}}/>
          <div style={TL(T.t1,{padding:"0 12px"})}>TECTRA</div>
          <div style={{padding:"0 12px",marginLeft:"auto"}}>
            <span style={L(T.cyan,{fontSize:9,opacity:.6})}>SISTEMA 1</span>
          </div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",padding:"36px 20px",gap:12}}>
          <div style={{fontFamily:T.mono,fontSize:12,color:T.t3,letterSpacing:"0.10em",
            textAlign:"center",lineHeight:2}}>
            SISTEMA OPERATIVO{"\n"}TÉCNICO-PROFESIONAL
          </div>
          <HR/>
          <p style={B(T.t4,{fontSize:13,textAlign:"center",lineHeight:1.8})}>
            Empieza creando un proyecto o registrando el primer levantamiento del día.
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:6,width:"100%",maxWidth:280,marginTop:8}}>
            <Accion onClick={function(){onNav("proyectos")}} color={T.blue}
              label="NUEVO PROYECTO" sub="Define el contexto del trabajo"/>
            <Accion onClick={function(){onNav("topografia")}} color={T.coord}
              label="NUEVO REGISTRO TOPO" sub="Levantamiento, control o as-built"/>
            <Accion onClick={function(){onNav("aprendizaje")}} color={T.data}
              label="NUEVA NOTA TÉCNICA" sub="Documenta lo que aprendiste hoy"/>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>

      {/* ── TOPBAR ── */}
      <div style={{background:T.surface,borderTop:"2px solid "+T.cyan,
        borderBottom:"2px solid "+T.b2,display:"flex",alignItems:"center",
        height:46,padding:"0 4px 0 0",flexShrink:0,position:"sticky",top:0,zIndex:50}}>
        <div style={{width:3,background:T.cyan,alignSelf:"stretch",flexShrink:0}}/>
        <div style={{flex:1,padding:"0 12px",minWidth:0}}>
          <div style={TL(T.t1)}>TECTRA</div>
        </div>
        <div style={{padding:"0 10px",display:"flex",alignItems:"center",gap:8}}>
          <span style={L(T.t4,{fontSize:8})}>{SEMANA}</span>
          <span style={L(T.cyan,{fontSize:9,opacity:.6})}>S1</span>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto"}}>

        {/* ══════════════════════════════════════════════════
            BLOQUE 1 — CONTEXTO OPERACIONAL
            Lo que importa ahora, al abrir la app
        ══════════════════════════════════════════════════ */}
        <div style={{background:T.panel,borderBottom:"2px solid "+T.b2,padding:"8px 10px"}}>

          {/* Proyecto activo */}
          {d.proyPrincipal ? (
            <div onClick={function(){onNav("proyectos")}}
              style={{marginBottom:8,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <div style={{width:5,height:5,background:T.green,borderRadius:1,flexShrink:0}}/>
                <span style={L(T.green,{fontSize:9})}>PROYECTO ACTIVO</span>
              </div>
              <p style={{fontFamily:T.sans,fontSize:15,fontWeight:600,color:T.t1,
                lineHeight:1.25,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                {d.proyPrincipal.nombre}
              </p>
              {d.proyActivos.length > 1 && (
                <p style={B(T.t3,{fontSize:12,marginTop:2})}>
                  +{d.proyActivos.length-1} proyecto{d.proyActivos.length>2?"s":""} activo{d.proyActivos.length>2?"s":""}
                </p>
              )}
            </div>
          ) : (
            <div onClick={function(){onNav("proyectos")}}
              style={{marginBottom:8,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              <span style={L(T.amber,{fontSize:9})}>SIN PROYECTO ACTIVO</span>
            </div>
          )}

          {/* Último registro */}
          {d.ultimoReg && (
            <div onClick={function(){onNav("topografia")}}
              style={{padding:"6px 8px",background:T.base,border:"1px solid "+T.b1,
                borderRadius:3,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                <span style={L(T.t3,{fontSize:8})}>ÚLTIMO REGISTRO</span>
                <span style={L(T.blue,{fontSize:8})}>{INSTR_MAP[d.ultimoReg.instrumento]||"—"}</span>
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontFamily:T.mono,fontSize:12,fontWeight:600,color:T.t1}}>
                  {d.ultimoReg.codigo||d.ultimoReg.titulo||"Registro"}
                </span>
                <span style={L(T.data,{fontSize:9})}>
                  {(d.ultimoReg.puntos||[]).length} PT
                </span>
                <span style={L(T.t4,{fontSize:8,marginLeft:"auto"})}>
                  {d.ultimoReg.actualizadoEn||d.ultimoReg.creadoEn||""}
                </span>
              </div>
              {d.ultimoReg.titulo && (
                <p style={B(T.t3,{fontSize:12,lineHeight:1.3,marginTop:2,
                  overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"})}>
                  {d.ultimoReg.titulo}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            BLOQUE 2 — OBJETIVO SEMANAL
        ══════════════════════════════════════════════════ */}
        <Sec label={"OBJETIVO SEMANA "+SEMANA}
          right={d.objetivo&&(
            <span style={L(d.objetivo.completado?T.green:T.amber,{fontSize:8})}>
              {d.objetivo.completado?"✓ COMPLETADO":"EN CURSO"}
            </span>
          )}>
          {d.objetivo ? (
            <div onClick={function(){onNav("evolucion")}}
              style={{cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              <p style={B(d.objetivo.completado?T.t3:T.t1,{fontSize:13,lineHeight:1.65})}>
                {d.objetivo.texto}
              </p>
            </div>
          ) : (
            <div onClick={function(){onNav("evolucion")}}
              style={{cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              <p style={B(T.t4,{fontSize:13})}>Sin objetivo definido esta semana.</p>
            </div>
          )}
        </Sec>

        {/* ══════════════════════════════════════════════════
            BLOQUE 3 — ACTIVIDAD REAL ESTA SEMANA
        ══════════════════════════════════════════════════ */}
        <Sec label="ACTIVIDAD REAL ESTA SEMANA">
          <BarraActividad items={[
            {l:"LEVANT.", v:d.regSemana.length,       c:T.blue},
            {l:"PUNTOS",  v:d.puntSemana,             c:T.coord},
            {l:"NOTAS",   v:d.notasSemana.length,     c:T.data},
            {l:"APLICADAS",v:d.aplicSemana.length,    c:T.green},
          ]}/>
        </Sec>

        {/* ══════════════════════════════════════════════════
            BLOQUE 4 — HABILIDADES TÉCNICAS
            Sistema 1: conteo real desde notas
            Sistema 2: nivel calculado automáticamente
        ══════════════════════════════════════════════════ */}
        {d.catActivas.length > 0 && (
          <Sec label="DOMINIO TÉCNICO — DESDE NOTAS REALES"
            right={<span style={L(T.t4,{fontSize:8})}>{d.totales.notas} NOTAS</span>}>
            <div style={{marginTop:4}}>
              {d.catActivas.map(function(k){
                return <FilaHabilidad key={k} cat={k} hab={d.habilidades[k]}/>
              })}
              <div style={{display:"flex",gap:8,marginTop:4,paddingTop:4,borderTop:"1px solid "+T.b1}}>
                {[
                  {c:T.green, l:"DOMINADO"},
                  {c:T.blue,  l:"APLICANDO"},
                ].map(function(i){
                  return (
                    <div key={i.l} style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:7,height:3,background:i.c}}/>
                      <span style={L(T.t4,{fontSize:8})}>{i.l}</span>
                    </div>
                  )
                })}
                {d.catEstancadas.length > 0 && (
                  <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
                    <span style={L(T.amber,{fontSize:8})}>{d.catEstancadas.length} ÁREA{d.catEstancadas.length>1?"S":""} SIN ACTIVIDAD 30D</span>
                  </div>
                )}
              </div>
            </div>
            <S2Block label="NIVEL CALCULADO POR EVIDENCIA"
              desc="Disponible en Sistema 2: nivel 1-3 basado en registros TOPO + notas aplicadas + proyectos completados."/>
          </Sec>
        )}

        {/* ══════════════════════════════════════════════════
            BLOQUE 5 — PENDIENTE POR DOMINAR
            Notas con aplicaciones pero dominio "aprendiendo"
        ══════════════════════════════════════════════════ */}
        {d.notasPorDominar.length > 0 && (
          <Sec label={"POR DOMINAR — "+d.notasPorDominar.length+" NOTAS CON APLICACIONES"}>
            {d.notasPorDominar.slice(0,3).map(function(n){
              var cat = CATS_MAP[n.categoria]||{l:n.categoria,c:T.t3}
              return (
                <div key={n.id} onClick={function(){onNav("aprendizaje")}}
                  style={{display:"flex",alignItems:"center",gap:8,
                    padding:"5px 0",borderBottom:"1px solid "+T.b1,
                    cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  <div style={{width:4,height:4,background:cat.c,flexShrink:0}}/>
                  <span style={B(T.t1,{fontSize:13,flex:1,overflow:"hidden",
                    whiteSpace:"nowrap",textOverflow:"ellipsis"})}>{n.titulo}</span>
                  <span style={L(T.blue,{fontSize:8,flexShrink:0})}>{n.vecesAplicado}×</span>
                </div>
              )
            })}
            {d.notasPorDominar.length > 3 && (
              <p style={B(T.t4,{fontSize:12,marginTop:4})}>
                +{d.notasPorDominar.length-3} más en APRENDIZAJE
              </p>
            )}
          </Sec>
        )}

        {/* ══════════════════════════════════════════════════
            BLOQUE 6 — CURSOS ACTIVOS
        ══════════════════════════════════════════════════ */}
        {d.cursosActivos.length > 0 && (
          <Sec label={"CURSOS EN CURSO — "+d.cursosActivos.length}>
            {d.cursosActivos.slice(0,2).map(function(c){
              var cat = CATS_MAP[c.categoria]||{l:c.categoria,c:T.t3}
              var nAplic = (c.aplicacionesEnObra||[]).length
              return (
                <div key={c.id} onClick={function(){onNav("evolucion")}}
                  style={{display:"flex",alignItems:"center",gap:8,
                    padding:"5px 0",borderBottom:"1px solid "+T.b1,
                    cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  <span style={L(cat.c,{fontSize:8,flexShrink:0,minWidth:56})}>{cat.l}</span>
                  <span style={B(T.t1,{fontSize:13,flex:1,overflow:"hidden",
                    whiteSpace:"nowrap",textOverflow:"ellipsis"})}>{c.nombre}</span>
                  <span style={L(nAplic>0?T.green:T.t4,{fontSize:8,flexShrink:0})}>
                    {nAplic} APLIC.
                  </span>
                </div>
              )
            })}
          </Sec>
        )}

        {/* ══════════════════════════════════════════════════
            BLOQUE 7 — ACCESOS RÁPIDOS
            Lo que más se toca al inicio del día
        ══════════════════════════════════════════════════ */}
        <Sec label="ACCESO RÁPIDO">
          <Accion onClick={function(){onNav("topografia")}} color={T.coord}
            label="NUEVO REGISTRO TOPO"
            sub={d.totales.registros+" registros · "+d.totales.puntos+" puntos acumulados"}/>
          <Accion onClick={function(){onNav("aprendizaje")}} color={T.data}
            label="NUEVA NOTA TÉCNICA"
            sub={d.totales.notasDom+" dominadas de "+d.totales.notas+" notas"}/>
          <Accion onClick={function(){onNav("proyectos")}} color={T.blue}
            label="PROYECTOS"
            sub={d.proyActivos.length+" activos · "+d.totales.proyectos+" total"}/>
          <Accion onClick={function(){onNav("evolucion")}} color={T.violet}
            label="EVOLUCIÓN"
            sub={d.consistencia!==null
              ? d.completados+"/"+d.totalObj+" objetivos completados ("+d.consistencia+"%)"
              : "Diario técnico · metas · visión"}/>
        </Sec>

        {/* ══════════════════════════════════════════════════
            BLOQUE 8 — INDEPENDENCIA / MONETIZACIÓN
            Sistema 2 placeholder honesto
        ══════════════════════════════════════════════════ */}
        <Sec label="INDEPENDENCIA PROFESIONAL">
          <S2Block label="SERVICIOS CON EVIDENCIA SUFICIENTE"
            desc={"Disponible en Sistema 2: detecta qué servicios puedes cobrar basado en "
              +d.totales.registros+" levantamientos y "+d.totales.aplicaciones+" aplicaciones técnicas documentadas."}/>
          <S2Block label="BRECHAS HACIA OBJETIVOS"
            desc="Disponible en Sistema 2: qué te falta para el siguiente nivel técnico y para independizarte parcialmente."/>

          {/* Pista honesta desde datos actuales */}
          {d.totales.registros >= 10 && (
            <div style={{background:T.green+"08",border:"1px solid "+T.green+"20",
              borderRadius:3,padding:"7px 10px",marginTop:4}}>
              <span style={L(T.green,{fontSize:9,opacity:.7})}>SEÑAL POSITIVA</span>
              <p style={B(T.t2,{fontSize:13,lineHeight:1.6,marginTop:3})}>
                {d.totales.registros} levantamientos documentados. Base de evidencia suficiente para activar análisis de servicios en Sistema 2.
              </p>
            </div>
          )}
        </Sec>

        {/* ══════════════════════════════════════════════════
            BLOQUE 9 — EVIDENCIA ACUMULADA TOTAL
        ══════════════════════════════════════════════════ */}
        <Sec label="EVIDENCIA TOTAL ACUMULADA">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
            {[
              {l:"LEVANT.",  v:d.totales.registros,    c:T.blue},
              {l:"PUNTOS",   v:d.totales.puntos,        c:T.coord},
              {l:"PROYECTOS",v:d.totales.proyectos,     c:T.blue},
              {l:"NOTAS",    v:d.totales.notas,         c:T.data},
              {l:"DOMINADAS",v:d.totales.notasDom,      c:T.green},
              {l:"APLICAC.", v:d.totales.aplicaciones,  c:T.green},
            ].map(function(item){
              return (
                <div key={item.l} style={{padding:"6px 8px",background:T.base,
                  border:"1px solid "+T.b1,borderRadius:3,textAlign:"center"}}>
                  <div style={{fontFamily:T.mono,fontSize:18,fontWeight:700,
                    color:item.v>0?item.c:T.t4,lineHeight:1,marginBottom:2}}>
                    {item.v}
                  </div>
                  <div style={L(T.t4,{fontSize:8})}>{item.l}</div>
                </div>
              )
            })}
          </div>
        </Sec>

        <div style={{height:8}}/>
      </div>
    </div>
  )
}

export default ModuloInicio
