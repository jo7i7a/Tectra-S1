import { useState, useMemo, useEffect } from "react"
import { T } from "../shared/tokens"
import { SK } from "../shared/tokens"
import { rd, wr, storageKB } from "../shared/storage"
import { uid, hoy } from "../shared/utils"
import { L, B, TL, HR, D, Dot, Tag, DRow, ProgBar, Btn, TInput, TSelect, TArea, Field, Topbar, Tabs, Nav, ConfirmBarra } from "../shared/ui"


var EC = { activo:T.green, en_pausa:T.amber, completado:T.t2, archivado:T.t4 }


var TIPOS=[{v:"construccion",l:"Construcción"},{v:"topografia",l:"Topografía"},{v:"civil3d",l:"Civil 3D"},{v:"control_geo",l:"Control Geométrico"},{v:"personal",l:"Personal"}]
var ESTADOS=[{v:"activo",l:"Activo"},{v:"en_pausa",l:"En pausa"},{v:"completado",l:"Completado"},{v:"archivado",l:"Archivado"}]

var DEMO=[
  {id:"p1",codigo:"PRY-2025-001",nombre:"Edificio Residencial Norte — Etapa 1",tipo:"construccion",estado:"activo",avance:34,ubicacion:"Av. Las Torres km 4.2, Sector Norte",cliente:"Constructora Andina SA",responsable:"J. Martínez",descripcion:"Control de trazado y replanteo de ejes estructurales. Verificación de plomada en columnas principales.",notas:[{id:"n1",texto:"Eje B-4 con desviación 3mm respecto al plano. Documentado y aprobado por ITO.",fecha:"2025-05-15"},{id:"n2",texto:"Replanteo de fundaciones completo. 47 ejes verificados.",fecha:"2025-05-10"}],creadoEn:"2025-03-01",actualizadoEn:"2025-05-15"},
  {id:"p2",codigo:"PRY-2025-002",nombre:"Levantamiento Topográfico Ruta 5 km 12",tipo:"topografia",estado:"activo",avance:78,ubicacion:"Ruta 5 Norte km 12.4",cliente:"Dirección de Vialidad",responsable:"J. Martínez",descripcion:"Levantamiento planimétrico y altimétrico para proyecto de ensanche de calzada.",notas:[{id:"n3",texto:"Sección km 12.0 al 12.4 completa. 180 puntos registrados.",fecha:"2025-05-16"}],creadoEn:"2025-04-15",actualizadoEn:"2025-05-16"},
  {id:"p3",codigo:"PRY-2025-003",nombre:"Control Geométrico Fachada Bloque A",tipo:"control_geo",estado:"en_pausa",avance:45,ubicacion:"Edificio Comercial Centro — Bloque A",cliente:"Inmobiliaria Central Ltda.",responsable:"J. Martínez",descripcion:"Control de verticalidad y desviaciones de fachada prefabricada. Tolerancia ±5mm.",notas:[{id:"n4",texto:"Pausa por retraso en entrega de paneles.",fecha:"2025-05-12"}],creadoEn:"2025-04-20",actualizadoEn:"2025-05-12"},
  {id:"p4",codigo:"PRY-2025-004",nombre:"Modelo Civil 3D — Carretera Sur",tipo:"civil3d",estado:"completado",avance:100,ubicacion:"Oficina técnica",cliente:"Consultora Vial Norte",responsable:"J. Martínez",descripcion:"Alineamiento horizontal y vertical con perfiles y secciones transversales.",notas:[],creadoEn:"2025-02-01",actualizadoEn:"2025-04-30"},
]

function Lista(p) {
  var [fe,setFe]=useState("todos")
  var [ft,setFt]=useState("todos")
  var [bq,setBq]=useState("")
  var filt=useMemo(function(){
    return p.proyectos.filter(function(x){
      return (fe==="todos"||x.estado===fe)&&(ft==="todos"||x.tipo===ft)&&(!bq||[x.nombre,x.codigo,x.cliente].some(function(s){return s.toLowerCase().includes(bq.toLowerCase())}))
    })
  },[p.proyectos,fe,ft,bq])
  var cnt=useMemo(function(){
    return {total:p.proyectos.length,activo:p.proyectos.filter(function(x){return x.estado==="activo"}).length,en_pausa:p.proyectos.filter(function(x){return x.estado==="en_pausa"}).length,completado:p.proyectos.filter(function(x){return x.estado==="completado"}).length}
  },[p.proyectos])
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="PROYECTOS" accent={T.blue} sub={filt.length+" DE "+cnt.total} />
      <div style={{padding:"8px 10px",background:T.surface,borderBottom:"1px solid "+T.b1}}>
        <div style={{position:"relative"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth="2" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input autoComplete="off" autoCorrect="off" value={bq} onChange={function(e){setBq(e.target.value)}} placeholder="Buscar nombre, código, cliente..."
            style={{width:"100%",background:T.input,border:"1px solid "+(bq?T.b3:T.b2),borderRadius:3,color:T.t1,fontFamily:T.sans,fontSize:14,padding:"8px 28px",outline:"none"}} />
          {bq&&<button onClick={function(){setBq("")}} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.t3,padding:0,display:"flex"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>}
        </div>
      </div>
      <div style={{display:"flex",background:T.panel,borderBottom:"1px solid "+T.b2,flexShrink:0}}>
        {[{v:"todos",l:"TODOS "+cnt.total,c:T.t2},{v:"activo",l:"ACT "+cnt.activo,c:T.green},{v:"en_pausa",l:"PAU "+cnt.en_pausa,c:T.amber},{v:"completado",l:"COMP "+cnt.completado,c:T.t2}].map(function(f,i){
          var on=fe===f.v
          return <button key={f.v} onClick={function(){setFe(f.v)}} style={{flex:1,height:30,background:on?T.rowSel:"transparent",borderRight:i<3?"1px solid "+T.b1:"none",borderTop:"none",borderBottom:on?"2px solid "+f.c:"2px solid transparent",borderLeft:"none",fontFamily:T.mono,fontSize:9,fontWeight:700,color:on?f.c:T.t4,letterSpacing:"0.09em",textTransform:"uppercase",cursor:"pointer",WebkitTapHighlightColor:"transparent",marginBottom:-1}}>{f.l}</button>
        })}
      </div>
      <div style={{display:"flex",background:T.base,borderBottom:"1px solid "+T.b1,overflowX:"auto",WebkitOverflowScrolling:"touch",flexShrink:0,scrollbarWidth:"none"}}>
        {[{v:"todos",l:"TODOS"},{v:"construccion",l:"CONST"},{v:"topografia",l:"TOPO"},{v:"civil3d",l:"C3D"},{v:"control_geo",l:"CTL-G"}].map(function(f){
          var on=ft===f.v
          return <button key={f.v} onClick={function(){setFt(f.v)}} style={{height:28,padding:"0 11px",flexShrink:0,background:on?T.rowSel:"transparent",borderRight:"1px solid "+T.b1,borderTop:"none",borderBottom:"none",borderLeft:"none",fontFamily:T.mono,fontSize:9,fontWeight:700,color:on?T.blue:T.t4,letterSpacing:"0.09em",textTransform:"uppercase",cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>{f.l}</button>
        })}
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {filt.length===0
          ? <div style={{padding:"40px 16px",textAlign:"center"}}>
              <p style={L(T.t3,{marginBottom:10})}>SIN PROYECTOS</p>
              {p.totalProy===0&&(
                <button onClick={p.onCargarDemo}
                  style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:700,color:"#607080",
                    background:"none",border:"1px solid #253650",borderRadius:2,
                    padding:"5px 10px",cursor:"pointer",letterSpacing:"0.10em",textTransform:"uppercase"}}>
                  CARGAR DATOS DE EJEMPLO
                </button>
              )}
            </div>
          : filt.map(function(x,i){return <Fila key={x.id} proyecto={x} alt={i%2===1} onClick={function(){p.onSelect(x)}} />})
        }
      </div>
      <div style={{padding:"8px 10px",background:T.surface,borderTop:"1px solid "+T.b2,flexShrink:0}}>
        <Btn onClick={p.onNuevo} variant="primary" color={T.blue} full>+ NUEVO PROYECTO</Btn>
      </div>
    </div>
  )
}

function Fila(p) {
  var x=p.proyecto
  var [pr,setPr]=useState(false)
  return (
    <div onClick={p.onClick} onPointerDown={function(){setPr(true)}} onPointerUp={function(){setPr(false)}} onPointerLeave={function(){setPr(false)}}
      style={{background:pr?T.rowSel:p.alt?T.rowAlt:T.row,borderBottom:"1px solid "+T.b1,padding:"8px 10px",cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"background 80ms"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        <span style={L(T.t3,{fontSize:9})}>{x.codigo}</span>
        <span style={{color:T.t4,fontSize:9}}>·</span>
        <Dot color={EC[x.estado]} size={6} />
        <span style={L(EC[x.estado],{fontSize:9})}>{x.estado.replace("_"," ").toUpperCase()}</span>
        <span style={{marginLeft:"auto"}}><Tag color={T.data}>{x.tipo.replace("_"," ")}</Tag></span>
      </div>
      <p style={B(T.t1,{fontWeight:500,lineHeight:1.25,marginBottom:5,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"})}>{x.nombre}</p>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={B(T.t3,{fontSize:12,flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"})}>{x.cliente}</span>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <div style={{width:48,height:2,background:T.b2}}><div style={{height:"100%",width:x.avance+"%",background:x.avance===100?T.green:EC[x.estado]}} /></div>
          <span style={D(T.data,{fontSize:11,minWidth:26,textAlign:"right"})}>{x.avance}%</span>
        </div>
      </div>
    </div>
  )
}

function Detalle(p) {
  var [x,setX]=useState(p.proyecto)
  var [tab,setTab]=useState("datos")
  var [nota,setNota]=useState("")
  function cycleEstado(){
    var seq={activo:"en_pausa",en_pausa:"activo",completado:"archivado",archivado:"activo"}
    var u=Object.assign({},x,{estado:seq[x.estado]||"activo",actualizadoEn:hoy()})
    setX(u);p.onActualizar(u)
  }
  function addNota(){
    if(!nota.trim())return
    var u=Object.assign({},x,{notas:[{id:uid(),texto:nota.trim(),fecha:hoy()}].concat(x.notas),actualizadoEn:hoy()})
    setX(u);p.onActualizar(u);setNota("")
  }
  function delNota(id){
    var u=Object.assign({},x,{notas:x.notas.filter(function(n){return n.id!==id})})
    setX(u);p.onActualizar(u)
  }
  function setAv(v){
    var u=Object.assign({},x,{avance:v,actualizadoEn:hoy()})
    setX(u);p.onActualizar(u)
  }
  var stBtn=(
    <button onClick={cycleEstado} style={{display:"flex",alignItems:"center",gap:5,fontFamily:T.mono,fontSize:9,fontWeight:700,color:EC[x.estado],letterSpacing:"0.09em",textTransform:"uppercase",background:EC[x.estado]+"14",border:"1px solid "+EC[x.estado]+"40",borderRadius:2,padding:"4px 8px",cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
      <Dot color={EC[x.estado]} size={5}/>{x.estado.replace("_"," ").toUpperCase()}
    </button>
  )
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title={x.codigo} accent={T.blue} onBack={p.onBack} sub={x.tipo.replace("_"," ").toUpperCase()} right={stBtn} />
      <div style={{padding:"8px 12px",background:T.panel,borderBottom:"1px solid "+T.b2}}>
        <p style={B(T.t1,{fontWeight:500,lineHeight:1.35})}>{x.nombre}</p>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
          <span style={L(T.t3,{fontSize:9})}>{x.cliente}</span>
          <span style={{color:T.t4}}>·</span>
          <span style={L(T.t3,{fontSize:9})}>Actualizado {x.actualizadoEn}</span>
        </div>
      </div>
      <Tabs tabs={[{k:"datos",l:"DATOS"},{k:"bitacora",l:"BITÁCORA"},{k:"avance",l:"AVANCE"}]} active={tab} onChange={setTab} accent={T.blue} />
      <div style={{flex:1,overflowY:"auto"}}>
        {tab==="datos"&&(
          <div>
            <DRow label="CÓDIGO" value={x.codigo} />
            <DRow label="TIPO" value={x.tipo.replace("_"," ")} color={T.t1} mono={false} />
            <DRow label="AVANCE" value={x.avance+"%"} color={x.avance===100?T.green:T.blue} />
            <DRow label="RESPONSABLE" value={x.responsable} color={T.t1} mono={false} />
            <DRow label="CREADO" value={x.creadoEn} color={T.t2} />
            <DRow label="ACTUALIZADO" value={x.actualizadoEn} color={T.t2} />
            <div style={{padding:"8px 12px",borderBottom:"1px solid "+T.b1}}>
              <div style={L(T.t3,{marginBottom:5})}>UBICACIÓN</div>
              <p style={B(T.t2,{fontSize:13})}>{x.ubicacion}</p>
            </div>
            {x.descripcion&&<div style={{padding:"8px 12px",borderBottom:"1px solid "+T.b1}}>
              <div style={L(T.t3,{marginBottom:5})}>DESCRIPCIÓN TÉCNICA</div>
              <p style={B(T.t2,{fontSize:13,lineHeight:1.7})}>{x.descripcion}</p>
            </div>}
            <div style={{padding:"10px 12px",display:"flex",gap:8}}>
              <Btn onClick={cycleEstado} variant="ghost" size="sm">CAMBIAR ESTADO</Btn>
              <Btn onClick={function(){p.onEliminar(x.id)}} variant="danger" size="sm">ELIMINAR</Btn>
            </div>
          </div>
        )}
        {tab==="bitacora"&&(
          <div>
            <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.b2,background:T.panel}}>
              <div style={L(T.t3,{marginBottom:6})}>NUEVA ENTRADA · {hoy()}</div>
              <TArea value={nota} onChange={setNota} placeholder="Observación técnica, medición, incidencia..." rows={3} />
              <div style={{marginTop:8}}><Btn onClick={addNota} variant="primary" color={T.blue} disabled={!nota.trim()} size="sm">REGISTRAR</Btn></div>
            </div>
            {x.notas.length===0
              ? <div style={{padding:"32px 16px",textAlign:"center"}}><p style={L(T.t3)}>SIN ENTRADAS</p></div>
              : x.notas.map(function(n){
                return (
                  <div key={n.id} style={{padding:"9px 12px",borderBottom:"1px solid "+T.b1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={L(T.t3,{fontSize:9})}>{n.fecha}</span>
                      <button onClick={function(){delNota(n.id)}} style={L(T.t4,{background:"none",border:"none",cursor:"pointer",padding:"2px 6px",fontSize:10})}>× ELIMINAR</button>
                    </div>
                    <p style={B(T.t1,{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"})}>{n.texto}</p>
                  </div>
                )
              })
            }
          </div>
        )}
        {tab==="avance"&&(
          <div>
            <div style={{padding:"16px 12px",borderBottom:"1px solid "+T.b1,display:"flex",flexDirection:"column",gap:12}}>
              <div style={L(T.t3)}>AVANCE ACTUAL</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontFamily:T.mono,fontSize:52,fontWeight:700,color:x.avance===100?T.green:T.blue,lineHeight:1}}>{x.avance}</span>
                <span style={D(T.t2,{fontSize:16})}>%</span>
              </div>
              <ProgBar value={x.avance} color={x.avance===100?T.green:T.blue} height={4} />
              <div>
                <input type="range" min="0" max="100" value={x.avance} onChange={function(e){setAv(Number(e.target.value))}} style={{width:"100%",accentColor:T.blue}} />
                <p style={L(T.t3,{textAlign:"center",marginTop:4})}>DESLIZA PARA ACTUALIZAR</p>
              </div>
            </div>
            {[{r:[0,25],l:"INICIO",c:T.t3},{r:[25,50],l:"EN DESARROLLO",c:T.amber},{r:[50,75],l:"AVANZADO",c:T.blue},{r:[75,100],l:"CASI COMPLETO",c:T.data},{r:[100],l:"COMPLETADO",c:T.green}].map(function(it){
              var on=it.r.length===1?x.avance===100:x.avance>=it.r[0]&&x.avance<it.r[1]
              return (
                <div key={it.l} style={{display:"flex",alignItems:"center",gap:10,minHeight:36,padding:"0 12px",borderBottom:"1px solid "+T.b1,background:on?T.rowSel:"transparent"}}>
                  <Dot color={on?it.c:T.t4} size={7}/><span style={L(on?it.c:T.t4,{flex:1})}>{it.l}</span>
                  <span style={L(T.t4,{fontSize:9})}>{it.r.length===1?"100%":it.r[0]+"–"+it.r[1]+"%"}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Nuevo(p) {
  var [f,setF]=useState({nombre:"",tipo:"construccion",estado:"activo",ubicacion:"",cliente:"",responsable:"",descripcion:""})
  var [err,setErr]=useState("")
  function sf(k){return function(v){setF(function(s){var n=Object.assign({},s);n[k]=v;return n})}}
  function guardar(){
    if(!f.nombre.trim()){setErr("NOMBRE OBLIGATORIO");return}
    p.onGuardar(Object.assign({},f,{id:uid(),codigo:"PRY-"+new Date().getFullYear()+"-"+String(Math.floor(Math.random()*900)+100),nombre:f.nombre.trim(),avance:0,notas:[],creadoEn:hoy(),actualizadoEn:hoy()}))
  }
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <Topbar title="NUEVO PROYECTO" accent={T.blue} onBack={p.onCancelar} />
      <div style={{flex:1,overflowY:"auto",padding:"12px 10px"}}>
        {err&&<div style={Object.assign({},L(T.red),{background:T.redBg,border:"1px solid "+T.red+"50",borderRadius:3,padding:"8px 12px",marginBottom:12})}>⚠ {err}</div>}
        <Field label="NOMBRE DEL PROYECTO" required><TInput value={f.nombre} onChange={function(v){sf("nombre")(v);setErr("")}} placeholder="Ej: Edificio Residencial Norte Etapa 1" /></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Field label="TIPO"><TSelect value={f.tipo} onChange={sf("tipo")} options={TIPOS} /></Field>
          <Field label="ESTADO"><TSelect value={f.estado} onChange={sf("estado")} options={ESTADOS} /></Field>
        </div>
        <Field label="CLIENTE"><TInput value={f.cliente} onChange={sf("cliente")} placeholder="Nombre del cliente" /></Field>
        <Field label="RESPONSABLE"><TInput value={f.responsable} onChange={sf("responsable")} placeholder="Técnico responsable" /></Field>
        <Field label="UBICACIÓN"><TInput value={f.ubicacion} onChange={sf("ubicacion")} placeholder="Dirección, sector, km" /></Field>
        <Field label="DESCRIPCIÓN TÉCNICA"><TArea value={f.descripcion} onChange={sf("descripcion")} placeholder="Alcance, metodología, observaciones..." rows={4} /></Field>
        <HR my={4} />
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={guardar} variant="primary" color={T.blue} full>CREAR PROYECTO</Btn>
          <Btn onClick={p.onCancelar} variant="ghost">CANCELAR</Btn>
        </div>
      </div>
    </div>
  )
}

function Proyectos() {
  var [proy,setProy]=useState(function(){
    var saved = rd(SK.proyectos)
    return (saved && Array.isArray(saved) && saved.length) ? saved : DEMO
  })
  useEffect(function(){ wr(SK.proyectos, proy) }, [proy])
  var [vista,setVista]=useState("lista")
  var [sel,setSel]=useState(null)
  var [confirmDel,setConfirmDel]=useState(null)
  function upd(x){setProy(function(ps){return ps.map(function(y){return y.id===x.id?x:y})});setSel(x)}
  function del(id){
    setProy(function(ps){return ps.filter(function(y){return y.id!==id})})
    setVista("lista")
    setConfirmDel(null)
  }
  function add(x){setProy(function(ps){return [x].concat(ps)});setVista("lista")}
  if(confirmDel) return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <ConfirmBarra
        msg={"ELIMINAR PROYECTO — NO SE PUEDE DESHACER"}
        onOk={function(){del(confirmDel)}}
        onCancel={function(){setConfirmDel(null)}}
        danger/>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"#607080",textAlign:"center",lineHeight:1.6}}>
          Confirma para eliminar este proyecto y todos sus datos.
        </p>
      </div>
    </div>
  )
  if(vista==="nuevo") return <Nuevo onGuardar={add} onCancelar={function(){setVista("lista")}} />
  if(vista==="detalle"&&sel) return <Detalle proyecto={sel} onBack={function(){setVista("lista")}} onActualizar={upd} onEliminar={function(id){setConfirmDel(id)}} />
  return <Lista proyectos={proy} totalProy={proy.length} onSelect={function(x){setSel(x);setVista("detalle")}} onNuevo={function(){setVista("nuevo")}} onCargarDemo={function(){setProy(DEMO)}} />
}

export default Proyectos
