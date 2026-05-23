import { useState, useMemo, useEffect } from "react"
import { T, SK, CATS, CATS_MAP, NIVELES, NIVELES_MAP } from "../shared/tokens"
import { rd, wr } from "../shared/storage"
import { uid, hoy, semanaISO } from "../shared/utils"
import { L, B, TL, HR, Btn, TInput, TSelect, TArea, Field, Topbar, Nav, ConfirmBarra, DRow, ProgBar } from "../shared/ui"

var semanaActual = semanaISO()



var PERFIL_DEFAULT = {
  vision:{ texto:"", frase:"", actualizadoEn:"" },
  objetivoSemana:null,
  metasTecnicas:[], metasFinancieras:[], habilidades:[],
}


var TIPOS_DIARIO = [
  {v:"aprendizaje",       l:"Aprendizaje",       icon:"◈"},
  {v:"logro",             l:"Logro",             icon:"✓"},
  {v:"problema_resuelto", l:"Prob. Resuelto",    icon:"!"},
  {v:"reflexion",         l:"Reflexión",         icon:"○"},
]
var TD_MAP = {}
TIPOS_DIARIO.forEach(function(t){ TD_MAP[t.v]=t })

function calcularResumen() {
  var registros   = rd(SK.registros,   [])
  var notas       = rd(SK.aprendizaje, [])
  var proyectos   = rd(SK.proyectos,   [])
  var diario      = rd(SK.diario,      [])
  var ahora = new Date()
  var iSemana = new Date(ahora); iSemana.setDate(ahora.getDate()-ahora.getDay()); iSemana.setHours(0,0,0,0)
  var iMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  function enS(d){ return d && new Date(d) >= iSemana }
  function enM(d){ return d && new Date(d) >= iMes }
  var rS = registros.filter(function(r){return enS(r.creadoEn)})
  return {
    semana:{
      levantamientos: rS.length,
      puntos:         rS.reduce(function(s,r){return s+(r.puntos?r.puntos.length:0)},0),
      notasCreadas:   notas.filter(function(n){return enS(n.creadoEn)}).length,
      notasAplicadas: notas.filter(function(n){return enS(n.ultimaAplicacion)}).length,
      entradas:       diario.filter(function(e){return enS(e.creadoEn)}).length,
    },
    mes:{
      levantamientos:  registros.filter(function(r){return enM(r.creadoEn)}).length,
      proyectosActivos:proyectos.filter(function(p){return p.estado==="activo"}).length,
      notasDominadas:  notas.filter(function(n){return n.dominio==="dominado"}).length,
    },
    total:{
      levantamientos: registros.length,
      puntos:         registros.reduce(function(s,r){return s+(r.puntos?r.puntos.length:0)},0),
      proyectos:      proyectos.length,
      notas:          notas.length,
      notasAplicadas: notas.filter(function(n){return (n.vecesAplicado||0)>0}).length,
    },
  }
}


function PanelEvolucion(p){
  var perfil=p.perfil, resumen=p.resumen, diario=p.diario
  var obj=perfil.objetivoSemana, vision=perfil.vision
  var ultimaEntrada=diario.length>0?diario.slice().sort(function(a,b){return b.creadoEn>a.creadoEn?1:-1})[0]:null
  var metasActivas=perfil.metasTecnicas  // estado calculado desde evidencia, no filtrar por campo guardado

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="EVOLUCIÓN" accent={T.violet} sub="EJE EVOLUTIVO"
        right={
          <button onClick={function(){p.onSub("diario")}}
            style={{fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.violet,
              background:T.violet+"14",border:"1px solid "+T.violet+"40",
              borderRadius:2,padding:"3px 9px",cursor:"pointer",letterSpacing:"0.10em",
              textTransform:"uppercase",WebkitTapHighlightColor:"transparent"}}>
            + ENTRADA
          </button>
        }/>

      <div style={{flex:1,overflowY:"auto"}}>

        <div style={{padding:"8px 10px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
          <div style={L(T.t3,{marginBottom:8,fontSize:9})}>ACTIVIDAD REAL · {semanaActual}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {[
              {l:"LEVANT.",   v:resumen.semana.levantamientos, c:T.blue},
              {l:"PUNTOS",    v:resumen.semana.puntos,         c:T.coord},
              {l:"NOTAS",     v:resumen.semana.notasCreadas,   c:T.data},
              {l:"APLICADAS", v:resumen.semana.notasAplicadas, c:T.green},
              {l:"PROY ACTIV",v:resumen.mes.proyectosActivos,  c:T.blue},
              {l:"DOMINADAS", v:resumen.mes.notasDominadas,    c:T.green},
            ].map(function(item){
              return(
                <div key={item.l} style={{background:T.base,border:"1px solid "+T.b1,
                  borderRadius:3,padding:"7px 8px",textAlign:"center"}}>
                  <div style={{fontFamily:T.mono,fontSize:20,fontWeight:700,
                    color:item.v>0?item.c:T.t4,lineHeight:1,marginBottom:3}}>{item.v}</div>
                  <div style={L(T.t4,{fontSize:8})}>{item.l}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{padding:"8px 10px",borderBottom:"1px solid "+T.b2,
          background:obj&&!obj.completado?T.violet+"08":"transparent"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={L(T.violet,{fontSize:9,opacity:.7})}>OBJETIVO SEMANA {semanaActual}</div>
            {obj&&(
              <button onClick={function(){p.onToggleObj(!obj.completado)}}
                style={{fontFamily:T.mono,fontSize:8,fontWeight:700,
                  color:obj.completado?T.green:T.t3,background:"none",
                  border:"1px solid "+(obj.completado?T.green+"50":T.b2),
                  borderRadius:2,padding:"2px 8px",cursor:"pointer",
                  letterSpacing:"0.09em",textTransform:"uppercase",
                  WebkitTapHighlightColor:"transparent"}}>
                {obj.completado?"✓ COMPLETADO":"MARCAR COMPLETO"}
              </button>
            )}
          </div>
          {obj ? (
            <p style={B(obj.completado?T.t3:T.t1,{lineHeight:1.6})}>{obj.texto}</p>
          ) : (
            <button onClick={function(){p.onSub("objetivo")}}
              style={{width:"100%",height:40,background:T.violet+"14",
                border:"1px solid "+T.violet+"30",borderRadius:3,
                fontFamily:T.mono,fontSize:10,fontWeight:700,color:T.violet,
                letterSpacing:"0.10em",textTransform:"uppercase",
                cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              DEFINIR OBJETIVO DE LA SEMANA
            </button>
          )}
        </div>

        <div style={{padding:"8px 10px",borderBottom:"1px solid "+T.b2,
          cursor:"pointer",WebkitTapHighlightColor:"transparent"}}
          onClick={function(){p.onSub("vision")}}>
          <div style={L(T.t3,{marginBottom:5,fontSize:9})}>VISIÓN PROFESIONAL</div>
          {vision.texto ? (
            <p style={B(T.t2,{fontSize:13,lineHeight:1.6,overflow:"hidden",
              display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"})}>
              {vision.texto}
            </p>
          ) : (
            <p style={B(T.t4,{fontSize:13})}>Sin definir — toca para escribir tu visión.</p>
          )}
          {vision.frase&&(
            <p style={{fontFamily:T.mono,fontSize:11,color:T.violet,marginTop:4,opacity:.7}}>
              "{vision.frase}"
            </p>
          )}
        </div>

        {metasActivas.length>0&&(
          <div style={{padding:"8px 10px",borderBottom:"1px solid "+T.b2}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={L(T.t3,{fontSize:9})}>METAS TÉCNICAS ACTIVAS</div>
              <button onClick={function(){p.onSub("metas")}}
                style={L(T.t3,{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:9})}>
                VER TODAS →
              </button>
            </div>
            {metasActivas.slice(0,3).map(function(meta){
              var cat=CATS_MAP[meta.categoria]||{c:T.t3}
              return(
                <div key={meta.id} style={{marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <span style={B(T.t1,{fontSize:13,fontWeight:500,flex:1,
                      overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",marginRight:8})}>
                      {meta.titulo}
                    </span>
                    <BadgeEstado estado={calcularEvidencia(meta).estado}/>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {ultimaEntrada&&(
          <div style={{padding:"8px 10px",borderBottom:"1px solid "+T.b2,
            cursor:"pointer",WebkitTapHighlightColor:"transparent"}}
            onClick={function(){p.onSub("diario")}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
              <div style={L(T.t3,{fontSize:9})}>DIARIO TÉCNICO</div>
              <span style={L(T.t4,{fontSize:8})}>{ultimaEntrada.fecha}</span>
            </div>
            <p style={B(T.t2,{fontSize:13,lineHeight:1.6,overflow:"hidden",
              display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"})}>
              {ultimaEntrada.contenido}
            </p>
          </div>
        )}

        <div style={{padding:"8px 10px"}}>
          <div style={L(T.t3,{marginBottom:8,fontSize:9})}>SECCIONES</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {[
              {k:"objetivo", l:"Objetivo semanal",   sub:"Compromiso técnico de la semana",                       c:T.violet},
              {k:"vision",   l:"Visión profesional",  sub:"Dónde quieres estar en 3 años",                        c:T.violet},
              {k:"metas",    l:"Metas técnicas",       sub:perfil.metasTecnicas.length+" registradas",             c:T.blue},
              {k:"finanzas", l:"Metas financieras",    sub:perfil.metasFinancieras.length+" objetivos",            c:T.violet},
              {k:"diario",   l:"Diario técnico",       sub:p.diario.length+" entradas",                           c:T.blue},
              {k:"cursos",   l:"Cursos y formación",   sub:p.cursos.length+" cursos registrados",                 c:T.data},
            ].map(function(item){
              return(
                <div key={item.k} onClick={function(){p.onSub(item.k)}}
                  style={{display:"flex",alignItems:"center",gap:10,
                    padding:"8px 10px",background:T.panel,border:"1px solid "+T.b1,
                    borderRadius:3,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontFamily:T.mono,fontSize:12,fontWeight:700,
                      color:item.c,letterSpacing:"0.06em",marginBottom:2}}>{item.l}</p>
                    <p style={B(T.t3,{fontSize:12})}>{item.sub}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{padding:"8px 10px",borderTop:"1px solid "+T.b2,marginTop:4}}>
          <div style={L(T.t3,{marginBottom:8,fontSize:9})}>EVIDENCIA TOTAL ACUMULADA</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[
              {l:"LEVANTAMIENTOS",v:resumen.total.levantamientos,c:T.blue},
              {l:"PUNTOS TOPO",   v:resumen.total.puntos,        c:T.coord},
              {l:"PROYECTOS",     v:resumen.total.proyectos,     c:T.blue},
              {l:"NOTAS TÉC.",    v:resumen.total.notas,         c:T.data},
              {l:"APLICACIONES",  v:resumen.total.notasAplicadas,c:T.green},
            ].map(function(item){
              return(
                <div key={item.l} style={{padding:"7px 10px",background:T.base,
                  border:"1px solid "+T.b1,borderRadius:3}}>
                  <div style={{fontFamily:T.mono,fontSize:22,fontWeight:700,
                    color:item.v>0?item.c:T.t4,lineHeight:1,marginBottom:3}}>{item.v}</div>
                  <div style={L(T.t4,{fontSize:8})}>{item.l}</div>
                </div>
              )
            })}
            <div style={{padding:"7px 10px",background:T.violet+"08",
              border:"1px solid "+T.violet+"30",borderRadius:3,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={L(T.violet,{fontSize:9,textAlign:"center"})}>HABILIDADES{"\n"}S2 PENDIENTE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubVision(p){
  var [texto,setTexto]=useState(p.perfil.vision.texto||"")
  var [frase,setFrase]=useState(p.perfil.vision.frase||"")
  var hasDato=p.perfil.vision.texto&&!texto.includes(p.perfil.vision.texto.slice(0,5))
  var editing=!p.perfil.vision.texto||texto!==p.perfil.vision.texto

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="VISIÓN PROFESIONAL" accent={T.violet} onBack={p.onBack}/>
      <div style={{flex:1,overflowY:"auto",padding:"12px 10px"}}>
        {!p.perfil.vision.texto ? (
          <>
            <p style={B(T.t2,{fontSize:13,lineHeight:1.7,marginBottom:16})}>
              Sin frases motivacionales. ¿Dónde quieres estar técnica y profesionalmente en 3 años?
            </p>
            <Field label="VISIÓN (texto libre)" required>
              <TArea value={texto} onChange={setTexto}
                placeholder={"En 3 años quiero ser técnico independiente en control geométrico,\ntener mi propio estudio técnico, trabajar con empresas constructoras..."}
                rows={6}/>
            </Field>
            <Field label="FRASE QUE LO RESUME (opcional)">
              <TInput value={frase} onChange={setFrase} placeholder="Una línea. Lo que te define."/>
            </Field>
            <Btn onClick={function(){p.onGuardar({texto:texto.trim(),frase:frase.trim(),actualizadoEn:hoy()})}}
              variant="primary" color={T.violet} full disabled={!texto.trim()}>
              GUARDAR VISIÓN
            </Btn>
          </>
        ) : (
          <>
            <div style={{background:T.violet+"08",border:"1px solid "+T.violet+"30",
              borderLeft:"3px solid "+T.violet,borderRadius:3,padding:"12px 14px",marginBottom:16}}>
              <p style={B(T.t1,{lineHeight:1.8,whiteSpace:"pre-wrap"})}>{p.perfil.vision.texto}</p>
              {p.perfil.vision.frase&&(
                <p style={{fontFamily:T.mono,fontSize:12,color:T.violet,marginTop:8,opacity:.7}}>
                  "{p.perfil.vision.frase}"
                </p>
              )}
            </div>
            <DRow label="ESCRITA" value={p.perfil.vision.actualizadoEn||hoy()} color={T.t2}/>
            <div style={{padding:"10px 0"}}>
              <Btn onClick={function(){
                var t=p.perfil.vision.texto, f=p.perfil.vision.frase
                setTexto(t); setFrase(f||"")
                p.onGuardar({texto:"",frase:"",actualizadoEn:""})
              }} variant="ghost" size="sm">REVISAR VISIÓN</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SubObjetivo(p){
  var [texto,setTexto]=useState("")
  var obj=p.perfil.objetivoSemana
  var hist=p.historial.slice().sort(function(a,b){return b.semana>a.semana?1:-1})

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="OBJETIVO SEMANAL" accent={T.violet} onBack={p.onBack} sub={semanaActual}/>
      <div style={{flex:1,overflowY:"auto"}}>
        <div style={{padding:"10px 10px",borderBottom:"1px solid "+T.b2,
          background:obj?T.violet+"08":T.panel}}>
          <div style={L(T.violet,{marginBottom:8,fontSize:9,opacity:.7})}>SEMANA ACTUAL — {semanaActual}</div>
          {obj ? (
            <>
              <p style={B(T.t1,{lineHeight:1.6,marginBottom:10})}>{obj.texto}</p>
              <div style={{display:"flex",gap:6}}>
                <button onClick={function(){p.onToggle(!obj.completado)}}
                  style={{flex:1,height:36,background:obj.completado?T.green+"18":"transparent",
                    border:"1px solid "+(obj.completado?T.green+"50":T.b2),borderRadius:3,
                    fontFamily:T.mono,fontSize:10,fontWeight:700,
                    color:obj.completado?T.green:T.t2,letterSpacing:"0.10em",textTransform:"uppercase",
                    cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  {obj.completado?"✓ COMPLETADO":"MARCAR COMPLETADO"}
                </button>
                <Btn onClick={function(){p.onCerrar(obj)}} variant="ghost" size="sm">CERRAR SEMANA</Btn>
              </div>
            </>
          ) : (
            <>
              <TArea value={texto} onChange={setTexto}
                placeholder={"Un solo objetivo. Concreto. Técnico.\nEj: Completar levantamiento km 12 y documentar procedimiento GPS RTK."}
                rows={3}/>
              <div style={{marginTop:8}}>
                <Btn onClick={function(){
                  if(!texto.trim())return
                  p.onGuardar({id:uid(),texto:texto.trim(),semana:semanaActual,
                    completado:false,metaId:null,creadoEn:hoy(),cerradoEn:null})
                  setTexto("")
                }} variant="primary" color={T.violet} disabled={!texto.trim()}>
                  ESTABLECER OBJETIVO
                </Btn>
              </div>
            </>
          )}
        </div>
        {hist.length>0&&(
          <div>
            <div style={{padding:"5px 10px",background:T.surface,borderBottom:"1px solid "+T.b1}}>
              <div style={L(T.t3,{fontSize:9})}>HISTORIAL — {hist.length} SEMANAS</div>
            </div>
            {hist.map(function(h){
              return(
                <div key={h.id} style={{padding:"8px 10px",borderBottom:"1px solid "+T.b1,
                  background:h.completado?T.green+"06":T.row}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={L(T.t3,{fontSize:9})}>{h.semana}</span>
                    <span style={L(h.completado?T.green:T.amber,{fontSize:8})}>
                      {h.completado?"COMPLETADO":"NO COMPLETADO"}
                    </span>
                  </div>
                  <p style={B(T.t2,{fontSize:13,lineHeight:1.5})}>{h.texto}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SubDiario(p){
  var [modo,setModo]=useState("lista")
  var [form,setForm]=useState({contenido:"",tipo:"aprendizaje"})
  var [confirmDel,setConfirmDel]=useState(null)
  var entradas=p.diario.slice().sort(function(a,b){return b.creadoEn>a.creadoEn?1:-1})

  function guardar(){
    if(!form.contenido.trim())return
    p.onGuardar({id:uid(),fecha:hoy(),contenido:form.contenido.trim(),
      tipo:form.tipo,proyectoId:null,registroId:null,notaAprenId:null,
      creadoEn:new Date().toISOString()})
    setForm({contenido:"",tipo:"aprendizaje"})
    setModo("lista")
  }

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="DIARIO TÉCNICO" accent={T.blue} onBack={p.onBack}
        sub={entradas.length+" ENTRADAS"}
        right={modo==="lista"&&(
          <button onClick={function(){setModo("nueva")}}
            style={{fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.blue,
              background:T.blue+"14",border:"1px solid "+T.blue+"40",
              borderRadius:2,padding:"3px 9px",cursor:"pointer",
              letterSpacing:"0.10em",textTransform:"uppercase",
              WebkitTapHighlightColor:"transparent"}}>+ ENTRADA</button>
        )}/>
      <div style={{flex:1,overflowY:"auto"}}>
        {modo==="nueva"&&(
          <div style={{padding:"10px 10px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
            <div style={L(T.t3,{marginBottom:8,fontSize:9})}>NUEVA ENTRADA · {hoy()}</div>
            <div style={{display:"flex",gap:5,marginBottom:10}}>
              {TIPOS_DIARIO.map(function(t){
                var on=form.tipo===t.v
                return(
                  <button key={t.v} onClick={function(){setForm(function(s){return Object.assign({},s,{tipo:t.v})})}}
                    style={{flex:1,height:30,background:on?T.rowSel:"transparent",
                      border:"1px solid "+(on?T.b3:T.b1),borderRadius:2,
                      fontFamily:T.mono,fontSize:8,fontWeight:700,
                      color:on?T.t1:T.t4,letterSpacing:"0.05em",
                      cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                    {t.icon} {t.l.split(" ")[0]}
                  </button>
                )
              })}
            </div>
            <TArea value={form.contenido}
              onChange={function(v){setForm(function(s){return Object.assign({},s,{contenido:v})})}}
              placeholder={"¿Qué aprendiste hoy?\n¿Qué problema resolviste?\n¿Qué lograste en obra?"}
              rows={5}/>
            <div style={{display:"flex",gap:6,marginTop:8}}>
              <Btn onClick={guardar} variant="primary" color={T.blue} disabled={!form.contenido.trim()}>GUARDAR</Btn>
              <Btn onClick={function(){setModo("lista")}} variant="ghost" size="sm">CANCELAR</Btn>
            </div>
          </div>
        )}
        {entradas.length===0&&modo==="lista"&&(
          <div style={{padding:"36px 16px",textAlign:"center"}}>
            <p style={L(T.t3,{marginBottom:8})}>DIARIO VACÍO</p>
            <p style={B(T.t4,{fontSize:13})}>Registra lo que vives técnicamente cada día.</p>
          </div>
        )}
        {entradas.map(function(e){
          var tipo=TD_MAP[e.tipo]||TIPOS_DIARIO[3]
          return(
            <div key={e.id} style={{padding:"8px 10px",borderBottom:"1px solid "+T.b1}}>
              {confirmDel===e.id&&(
                <ConfirmBarra msg="ELIMINAR ESTA ENTRADA"
                  onOk={function(){p.onEliminar(e.id);setConfirmDel(null)}}
                  onCancel={function(){setConfirmDel(null)}} danger/>
              )}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:T.mono,fontSize:11,color:T.t2}}>{tipo.icon}</span>
                  <span style={L(T.t3,{fontSize:9})}>{tipo.l.toUpperCase()}</span>
                  <span style={L(T.t4,{fontSize:8})}>{e.fecha}</span>
                </div>
                <button onClick={function(){setConfirmDel(e.id)}}
                  style={L(T.t4,{background:"none",border:"none",cursor:"pointer",padding:"2px 6px",fontSize:9})}>×</button>
              </div>
              <p style={B(T.t1,{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"})}>{e.contenido}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// Calcula evidencia real para una meta desde los storages existentes
// Sin porcentajes. Sin niveles. Solo conteos verificables.
function calcularEvidencia(meta) {
  var notas     = rd(SK.aprendizaje, [])
  var registros = rd(SK.registros,   [])
  var proyectos = rd(SK.proyectos,   [])

  var notasCat = notas.filter(function(n){ return n.categoria === meta.categoria })

  var ev = {
    notasDominadas: notasCat.filter(function(n){ return n.dominio === "dominado" }).length,
    notasAplicando: notasCat.filter(function(n){ return n.dominio === "aplicando" }).length,
    proyectos:      0,
    registrosTopo:  0,
  }

  // Proyectos asociados a notas de esta categoría
  var proyIds = new Set(
    notasCat.filter(function(n){ return n.proyectoId }).map(function(n){ return n.proyectoId })
  )
  ev.proyectos = proyIds.size

  // Registros TOPO relevantes según categoría
  if (meta.categoria === "topografia" || meta.categoria === "control_geo" || meta.categoria === "instrumento") {
    var tipoFiltro = meta.categoria === "control_geo" ? "control_geo" : null
    ev.registrosTopo = registros.filter(function(r){
      return tipoFiltro ? r.tipo === tipoFiltro : r.tipo === "levantamiento"
    }).length
  }

  // Estado basado en evidencia — sin fórmulas, solo señales objetivas
  var tieneAlgo = ev.notasDominadas > 0 || ev.notasAplicando > 0 || ev.proyectos > 0 || ev.registrosTopo > 0
  var tieneVariasFuentes = [ev.notasDominadas > 0, ev.notasAplicando > 0, ev.proyectos > 0, ev.registrosTopo > 0]
    .filter(Boolean).length >= 2

  ev.estado = !tieneAlgo ? "sin_evidencia"
    : tieneVariasFuentes ? "con_evidencia"
    : "en_progreso"

  // fuentes_s2: array vacío preparado para que el motor de S2
  // agregue evaluaciones, casos prácticos y validaciones técnicas
  // sin romper los datos de S1
  ev.fuentes_s2 = []

  return ev
}

function FilaEvidencia({label, value, color}) {
  var hasValue = value && value > 0
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"4px 0",borderBottom:"1px solid "+T.b1}}>
      <span style={B(T.t2,{fontSize:12})}>{label}</span>
      <span style={{fontFamily:T.mono,fontSize:13,fontWeight:600,
        color:hasValue?(color||T.data):T.t4}}>
        {hasValue ? value : "—"}
      </span>
    </div>
  )
}

function BadgeEstado({estado}) {
  var cfg = {
    sin_evidencia: {l:"SIN EVIDENCIA",  bg:T.b2,    c:T.t3},
    en_progreso:   {l:"EN PROGRESO",    bg:T.blue+"20", c:T.blue},
    con_evidencia: {l:"CON EVIDENCIA",  bg:T.green+"20",c:T.green},
  }[estado] || {l:estado, bg:T.b2, c:T.t3}
  return (
    <span style={{fontFamily:T.mono,fontSize:8,fontWeight:700,
      color:cfg.c,background:cfg.bg,
      padding:"2px 7px",borderRadius:2,letterSpacing:"0.09em",
      textTransform:"uppercase",flexShrink:0}}>
      {cfg.l}
    </span>
  )
}

function SubMetas(p){
  var [adding,setAdding]=useState(false)
  var [form,setForm]=useState({titulo:"",categoria:"topografia",nivelObjetivo:"aplicado"})
  var metas=p.perfil.metasTecnicas

  function guardar(){
    if(!form.titulo.trim())return
    // Sin progreso manual — el sistema lo calcula desde evidencia real
    p.onGuardar({id:uid(),titulo:form.titulo.trim(),
      categoria:form.categoria,nivelObjetivo:form.nivelObjetivo,
      creadoEn:hoy(),actualizadoEn:hoy()})
    setAdding(false)
    setForm({titulo:"",categoria:"topografia",nivelObjetivo:"aplicado"})
  }

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="METAS TÉCNICAS" accent={T.violet} onBack={p.onBack}
        sub={metas.length+" REGISTRADAS"}/>
      <div style={{flex:1,overflowY:"auto"}}>
        {adding&&(
          <div style={{padding:"10px 10px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <Field label="CATEGORÍA">
                <TSelect value={form.categoria}
                  onChange={function(v){setForm(function(s){return Object.assign({},s,{categoria:v})})}}
                  options={CATS.map(function(c){return{v:c.v,l:c.l}})}/>
              </Field>
              <Field label="NIVEL OBJETIVO">
                <TSelect value={form.nivelObjetivo}
                  onChange={function(v){setForm(function(s){return Object.assign({},s,{nivelObjetivo:v})})}}
                  options={NIVELES.map(function(n){return{v:n.v,l:n.l}})}/>
              </Field>
            </div>
            <Field label="TÍTULO" required>
              <TInput value={form.titulo}
                onChange={function(v){setForm(function(s){return Object.assign({},s,{titulo:v})})}}
                placeholder="Ej: Dominar perfiles longitudinales en Civil 3D"/>
            </Field>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={guardar} variant="primary" color={T.violet} disabled={!form.titulo.trim()}>GUARDAR</Btn>
              <Btn onClick={function(){setAdding(false)}} variant="ghost" size="sm">CANCELAR</Btn>
            </div>
          </div>
        )}
        {metas.length===0&&!adding&&(
          <div style={{padding:"36px 16px",textAlign:"center"}}>
            <p style={L(T.t3,{marginBottom:8})}>SIN METAS</p>
            <p style={B(T.t4,{fontSize:13})}>Define las habilidades que quieres desarrollar.</p>
          </div>
        )}
        {metas.map(function(m,i){
          var cat = CATS_MAP[m.categoria]||{c:T.t3,l:m.categoria}
          var ev  = calcularEvidencia(m)
          return(
            <div key={m.id} style={{background:i%2===1?T.rowAlt:T.row,
              borderBottom:"1px solid "+T.b1}}>
              {/* Cabecera: categoría + nivel objetivo + estado */}
              <div style={{display:"flex",alignItems:"center",gap:6,
                padding:"8px 10px 4px"}}>
                <span style={L(cat.c,{fontSize:9})}>{cat.l.toUpperCase()}</span>
                <span style={{color:T.t4,fontSize:9}}>·</span>
                <span style={L(T.t4,{fontSize:8,textTransform:"uppercase"})}>
                  ASPIRACIÓN: {m.nivelObjetivo}
                </span>
                <span style={{marginLeft:"auto"}}>
                  <BadgeEstado estado={ev.estado}/>
                </span>
              </div>
              {/* Título */}
              <p style={B(T.t1,{fontSize:13,fontWeight:500,
                padding:"0 10px 6px",lineHeight:1.3})}>
                {m.titulo}
              </p>
              {/* Evidencia */}
              <div style={{padding:"0 10px 6px"}}>
                <div style={L(T.t4,{fontSize:8,marginBottom:5})}>EVIDENCIA ACTUAL</div>
                <FilaEvidencia label="Notas dominadas"   value={ev.notasDominadas} color={T.green}/>
                <FilaEvidencia label="Notas aplicando"   value={ev.notasAplicando} color={T.blue}/>
                <FilaEvidencia label="Proyectos asociados" value={ev.proyectos}     color={T.data}/>
                {(ev.registrosTopo > 0 || m.categoria==="topografia"||m.categoria==="control_geo"||m.categoria==="instrumento")&&(
                  <FilaEvidencia label="Registros TOPO"  value={ev.registrosTopo}  color={T.coord}/>
                )}
              </div>
              {/* Placeholder S2 — nivel calculado por evidencia */}
              <div style={{margin:"0 10px 8px",padding:"5px 8px",
                background:T.violet+"0A",border:"1px solid "+T.violet+"20",
                borderRadius:2,display:"flex",alignItems:"center",
                justifyContent:"space-between"}}>
                <span style={L(T.violet,{fontSize:8,opacity:.5})}>
                  NIVEL CALCULADO POR EVIDENCIA
                </span>
                <span style={L(T.violet,{fontSize:8,opacity:.4})}>S2</span>
              </div>
            </div>
          )
        })}
        {!adding&&(
          <div style={{padding:"8px 10px",background:T.surface,borderTop:"1px solid "+T.b2}}>
            <Btn onClick={function(){setAdding(true)}} variant="primary" color={T.violet} full>
              NUEVA META TÉCNICA
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}

function SubFinanzas(p){
  var [adding,setAdding]=useState(false)
  var [form,setForm]=useState({titulo:"",tipo:"ahorro",montoObjetivo:"",montoActual:"",moneda:"CLP"})
  var metas=p.perfil.metasFinancieras

  function guardar(){
    if(!form.titulo.trim()||!form.montoObjetivo)return
    p.onGuardar(Object.assign({},form,{id:uid(),
      titulo:form.titulo.trim(),
      montoObjetivo:Number(form.montoObjetivo),
      montoActual:Number(form.montoActual)||0,
      estado:"activo",creadoEn:hoy(),actualizadoEn:hoy()}))
    setAdding(false)
    setForm({titulo:"",tipo:"ahorro",montoObjetivo:"",montoActual:"",moneda:"CLP"})
  }

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="METAS FINANCIERAS" accent={T.violet} onBack={p.onBack}/>
      <div style={{flex:1,overflowY:"auto"}}>
        {adding&&(
          <div style={{padding:"10px 10px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
            <Field label="OBJETIVO" required>
              <TInput value={form.titulo}
                onChange={function(v){setForm(function(s){return Object.assign({},s,{titulo:v})})}}
                placeholder="Ej: Laptop para Civil 3D"/>
            </Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <Field label="TIPO">
                <TSelect value={form.tipo}
                  onChange={function(v){setForm(function(s){return Object.assign({},s,{tipo:v})})}}
                  options={[{v:"ahorro",l:"Ahorro"},{v:"ingreso_meta",l:"Ingreso meta"},{v:"inversion_tecnica",l:"Inversión"}]}/>
              </Field>
              <Field label="OBJETIVO">
                <TInput value={form.montoObjetivo} type="number"
                  onChange={function(v){setForm(function(s){return Object.assign({},s,{montoObjetivo:v})})}}
                  placeholder="20000"/>
              </Field>
              <Field label="ACTUAL">
                <TInput value={form.montoActual} type="number"
                  onChange={function(v){setForm(function(s){return Object.assign({},s,{montoActual:v})})}}
                  placeholder="0"/>
              </Field>
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={guardar} variant="primary" color={T.violet}
                disabled={!form.titulo.trim()||!form.montoObjetivo}>GUARDAR</Btn>
              <Btn onClick={function(){setAdding(false)}} variant="ghost" size="sm">CANCELAR</Btn>
            </div>
          </div>
        )}
        {metas.length===0&&!adding&&(
          <div style={{padding:"36px 16px",textAlign:"center"}}><p style={L(T.t3)}>SIN METAS</p></div>
        )}
        {metas.map(function(m){
          var pct=m.montoObjetivo>0?Math.min(100,Math.round((m.montoActual/m.montoObjetivo)*100)):0
          return(
            <div key={m.id} style={{padding:"8px 10px",borderBottom:"1px solid "+T.b1}}>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:4}}>
                <p style={B(T.t1,{fontSize:13,fontWeight:500})}>{m.titulo}</p>
                <span style={L(T.violet,{fontSize:9})}>{pct}%</span>
              </div>
              <div style={{fontFamily:T.mono,fontSize:20,fontWeight:700,color:T.violet,marginBottom:2}}>
                ${m.montoActual.toLocaleString("es-CL")}
              </div>
              <p style={{fontFamily:T.mono,fontSize:10,color:T.t3,marginBottom:6}}>
                de ${m.montoObjetivo.toLocaleString("es-CL")} {m.moneda}
              </p>
              <ProgBar value={pct} color={pct>=100?T.green:T.violet} h={3}/>
              <div style={{marginTop:8}}>
                <TInput value={String(m.montoActual)} type="number"
                  onChange={function(v){
                    p.onActualizar(metas.map(function(x){
                      return x.id===m.id?Object.assign({},x,{montoActual:Number(v),actualizadoEn:hoy()}):x
                    }))
                  }} placeholder="Actualizar monto"/>
              </div>
            </div>
          )
        })}
        {!adding&&(
          <div style={{padding:"8px 10px",background:T.surface,borderTop:"1px solid "+T.b2}}>
            <Btn onClick={function(){setAdding(true)}} variant="primary" color={T.violet} full>NUEVA META FINANCIERA</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

function SubCursos(p){
  var [adding,setAdding]=useState(false)
  var [form,setForm]=useState({nombre:"",plataforma:"",categoria:"civil3d",estado:"en_curso",fechaInicio:hoy()})
  var cursos=p.cursos

  function guardar(){
    if(!form.nombre.trim())return
    p.onGuardar({id:uid(),nombre:form.nombre.trim(),
      plataforma:form.plataforma||"",categoria:form.categoria,
      estado:form.estado,fechaInicio:form.fechaInicio,
      aplicacionesEnObra:[],
      // habilidadesIds: campo preparado para S2 — motor conectará curso con habilidades
      habilidadesIds:[],
      creadoEn:hoy(),actualizadoEn:hoy()})
    setAdding(false)
    setForm({nombre:"",plataforma:"",categoria:"civil3d",estado:"en_curso",fechaInicio:hoy()})
  }

  function addAplic(cursoId, desc){
    p.onActualizar(cursos.map(function(c){
      if(c.id!==cursoId) return c
      var a={id:uid(),fecha:hoy(),descripcion:desc.trim(),proyectoId:null,notaAprenId:null}
      return Object.assign({},c,{aplicacionesEnObra:(c.aplicacionesEnObra||[]).concat([a]),actualizadoEn:hoy()})
    }))
  }

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="CURSOS Y FORMACIÓN" accent={T.data} onBack={p.onBack} sub={cursos.length+" CURSOS"}/>
      <div style={{flex:1,overflowY:"auto"}}>
        <div style={{padding:"8px 10px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
          <p style={B(T.t2,{fontSize:13,lineHeight:1.6})}>
            El valor real está en las aplicaciones en obra — registra cada vez que apliques algo de un curso.
          </p>
        </div>
        {adding&&(
          <div style={{padding:"10px 10px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
            <Field label="NOMBRE DEL CURSO" required>
              <TInput value={form.nombre}
                onChange={function(v){setForm(function(s){return Object.assign({},s,{nombre:v})})}}
                placeholder="Ej: Civil 3D Superficies y Perfiles"/>
            </Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Field label="PLATAFORMA">
                <TInput value={form.plataforma}
                  onChange={function(v){setForm(function(s){return Object.assign({},s,{plataforma:v})})}}
                  placeholder="Autodesk, Udemy, YouTube..."/>
              </Field>
              <Field label="CATEGORÍA">
                <TSelect value={form.categoria}
                  onChange={function(v){setForm(function(s){return Object.assign({},s,{categoria:v})})}}
                  options={CATS.map(function(c){return{v:c.v,l:c.l}})}/>
              </Field>
            </div>
            <Field label="ESTADO">
              <TSelect value={form.estado}
                onChange={function(v){setForm(function(s){return Object.assign({},s,{estado:v})})}}
                options={[{v:"pendiente",l:"Pendiente"},{v:"en_curso",l:"En curso"},{v:"completado",l:"Completado"},{v:"pausado",l:"Pausado"}]}/>
            </Field>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={guardar} variant="primary" color={T.data} disabled={!form.nombre.trim()}>GUARDAR CURSO</Btn>
              <Btn onClick={function(){setAdding(false)}} variant="ghost" size="sm">CANCELAR</Btn>
            </div>
          </div>
        )}
        {cursos.length===0&&!adding&&(
          <div style={{padding:"36px 16px",textAlign:"center"}}>
            <p style={L(T.t3,{marginBottom:8})}>SIN CURSOS</p>
            <p style={B(T.t4,{fontSize:13})}>Registra formación externa con aplicaciones reales en obra.</p>
          </div>
        )}
        {cursos.map(function(c){ return <CursoItem key={c.id} curso={c} onAddAplic={addAplic}/> })}
        {!adding&&(
          <div style={{padding:"8px 10px",background:T.surface,borderTop:"1px solid "+T.b2}}>
            <Btn onClick={function(){setAdding(true)}} variant="primary" color={T.data} full>REGISTRAR CURSO</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

function CursoItem(p){
  var [exp,setExp]=useState(false)
  var [input,setInput]=useState("")
  var c=p.curso
  var cat=CATS_MAP[c.categoria]||{c:T.t3,l:c.categoria}
  var nAplic=(c.aplicacionesEnObra||[]).length
  var ec={en_curso:T.blue,completado:T.green,pausado:T.amber,pendiente:T.t3}[c.estado]||T.t3
  return(
    <div style={{borderBottom:"1px solid "+T.b1}}>
      <div onClick={function(){setExp(!exp)}}
        style={{padding:"8px 10px",cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={L(cat.c,{fontSize:9})}>{cat.l.toUpperCase()}</span>
          <span style={{color:T.t4,fontSize:9}}>·</span>
          <span style={L(ec,{fontSize:9})}>{c.estado.replace("_"," ").toUpperCase()}</span>
          <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
            {nAplic>0&&<span style={L(T.green,{fontSize:9})}>{nAplic} APLIC.</span>}
            <span style={{color:T.t4,fontSize:12}}>{exp?"▲":"▼"}</span>
          </span>
        </div>
        <p style={B(T.t1,{fontSize:13,fontWeight:500,lineHeight:1.3,marginBottom:4})}>{c.nombre}</p>
        <p style={B(T.t3,{fontSize:12})}>{c.plataforma}</p>
      </div>
      {exp&&(
        <div style={{background:T.base,padding:"8px 10px",borderTop:"1px solid "+T.b1}}>
          <div style={L(T.t3,{marginBottom:8,fontSize:9})}>APLICACIONES EN OBRA ({nAplic})</div>
          {(c.aplicacionesEnObra||[]).map(function(a){
            return(
              <div key={a.id} style={{padding:"5px 0",borderBottom:"1px solid "+T.b1}}>
                <span style={L(T.t4,{fontSize:8,marginRight:6})}>{a.fecha}</span>
                <span style={B(T.t2,{fontSize:12})}>{a.descripcion}</span>
              </div>
            )
          })}
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <input autoComplete="off" autoCorrect="off" value={input} onChange={function(e){setInput(e.target.value)}}
              placeholder="¿Qué aplicaste de este curso en obra hoy?"
              style={{flex:1,background:T.input,border:"1px solid "+T.b2,
                borderRadius:3,color:T.t1,fontFamily:T.sans,fontSize:13,
                padding:"7px 10px",outline:"none",WebkitAppearance:"none"}}/>
            <Btn onClick={function(){if(input.trim()){p.onAddAplic(c.id,input);setInput("")}}}
              variant="primary" color={T.green} size="sm" disabled={!input.trim()}>REGISTRAR</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

function ModuloEvolucion(){
  var [perfil,   setPerfil]    = useState(function(){ return rd(SK.perfil,    PERFIL_DEFAULT) })
  var [diario,   setDiario]    = useState(function(){ return rd(SK.diario,    []) })
  var [historial,setHistorial] = useState(function(){ return rd(SK.objetivos, []) })
  var [cursos,   setCursos]    = useState(function(){ return rd(SK.cursos,    []) })
  var [sub,      setSub]       = useState(null)
  var [resumen,  setResumen]   = useState(function(){ return calcularResumen() })

  useEffect(function(){ wr(SK.perfil,    perfil)    },[perfil])
  useEffect(function(){ wr(SK.diario,    diario)    },[diario])
  useEffect(function(){ wr(SK.objetivos, historial) },[historial])
  useEffect(function(){ wr(SK.cursos,    cursos)    },[cursos])
  useEffect(function(){ setResumen(calcularResumen()) },[sub])

  function toggleObj(completado){
    if(!perfil.objetivoSemana) return
    setPerfil(function(s){ return Object.assign({},s,{
      objetivoSemana:Object.assign({},s.objetivoSemana,{completado:completado})
    })})
  }

  function guardarVision(vision){
    setPerfil(function(s){ return Object.assign({},s,{vision:vision}) })
    setSub(null)
  }

  function guardarObjetivo(obj){
    if(perfil.objetivoSemana){
      setHistorial(function(h){ return [perfil.objetivoSemana].concat(h) })
    }
    setPerfil(function(s){ return Object.assign({},s,{objetivoSemana:obj}) })
  }

  function cerrarObjetivo(obj){
    setHistorial(function(h){ return [Object.assign({},obj,{cerradoEn:hoy()})].concat(h) })
    setPerfil(function(s){ return Object.assign({},s,{objetivoSemana:null}) })
  }

  function guardarMetaTec(m){
    setPerfil(function(s){ return Object.assign({},s,{metasTecnicas:[m].concat(s.metasTecnicas)}) })
  }

  function actualizarMetasTec(metas){
    setPerfil(function(s){ return Object.assign({},s,{metasTecnicas:metas}) })
  }

  function guardarMetaFin(m){
    setPerfil(function(s){ return Object.assign({},s,{metasFinancieras:[m].concat(s.metasFinancieras)}) })
  }

  function actualizarMetasFin(metas){
    setPerfil(function(s){ return Object.assign({},s,{metasFinancieras:metas}) })
  }

  if(sub==="vision")   return <SubVision   perfil={perfil}  onBack={function(){setSub(null)}} onGuardar={guardarVision}/>
  if(sub==="objetivo") return <SubObjetivo perfil={perfil}  historial={historial} onBack={function(){setSub(null)}} onGuardar={guardarObjetivo} onCerrar={cerrarObjetivo} onToggle={toggleObj}/>
  if(sub==="diario")   return <SubDiario   diario={diario}  onBack={function(){setSub(null)}} onGuardar={function(e){setDiario(function(d){return [e].concat(d)})}} onEliminar={function(id){setDiario(function(d){return d.filter(function(e){return e.id!==id})})}}/>
  if(sub==="metas")    return <SubMetas    perfil={perfil}  onBack={function(){setSub(null)}} onGuardar={guardarMetaTec} onActualizar={actualizarMetasTec}/>
  if(sub==="finanzas") return <SubFinanzas perfil={perfil}  onBack={function(){setSub(null)}} onGuardar={guardarMetaFin} onActualizar={actualizarMetasFin}/>
  if(sub==="cursos")   return <SubCursos   cursos={cursos}  onBack={function(){setSub(null)}} onGuardar={function(c){setCursos(function(cs){return [c].concat(cs)})}} onActualizar={setCursos}/>

  return(
    <PanelEvolucion
      perfil={perfil} diario={diario} cursos={cursos} resumen={resumen}
      onSub={setSub} onToggleObj={toggleObj}
    />
  )
}

export default ModuloEvolucion
