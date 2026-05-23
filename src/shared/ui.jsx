// Componentes UI compartidos — usados por todos los módulos
import { useState } from "react"
import { T } from "./tokens"

export function L(c, x) { return Object.assign({fontFamily:T.mono,fontSize:10,fontWeight:700,color:c||T.t3,letterSpacing:"0.11em",textTransform:"uppercase",lineHeight:1},x) }
export function B(c, x) { return Object.assign({fontFamily:T.sans,fontSize:14,fontWeight:400,color:c||T.t1,lineHeight:1.6},x) }
export function TL(c, x){ return Object.assign({fontFamily:T.mono,fontSize:16,fontWeight:700,color:c||T.t1,letterSpacing:"-0.01em",lineHeight:1.2},x) }

export function HR({ color, my } = {}) {
  return <div style={{height:1,background:color||T.b1,margin:my?`${my}px 0`:"0",flexShrink:0}}/>
}

export function Btn({ onClick, disabled, variant="ghost", color, size="md", full, children }) {
  const [pr, setPr] = useState(false)
  const col = color || T.blue
  const H = size==="sm"?34:size==="lg"?50:44
  const FS = size==="sm"?10:size==="lg"?12:11
  let bg, br, cl
  if (variant==="primary")     { bg=col; br=col; cl="#fff" }
  else if (variant==="danger") { bg=T.redBg; br=T.red+"50"; cl=T.red }
  else                         { bg="transparent"; br=T.b2; cl=T.t2 }
  return (
    <button onClick={onClick} disabled={disabled}
      onPointerDown={()=>setPr(true)} onPointerUp={()=>setPr(false)} onPointerLeave={()=>setPr(false)}
      style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,
        fontFamily:T.mono,fontSize:FS,fontWeight:700,color:cl,letterSpacing:"0.11em",textTransform:"uppercase",
        height:H,padding:"0 14px",width:full?"100%":"auto",
        background:bg,border:`1px solid ${br}`,borderRadius:3,
        cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?0.35:pr?0.72:1,transform:pr?"scale(0.97)":"scale(1)",
        transition:"opacity 80ms, transform 80ms",
        WebkitTapHighlightColor:"transparent",flexShrink:0}}>
      {children}
    </button>
  )
}

export function TInput({ value, onChange, placeholder, type="text", coord, numeric }) {
  const [f, setF] = useState(false)
  return (
    <input type={type} value={value}
      onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={numeric||coord?"decimal":undefined}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      autoComplete="off" autoCorrect="off" spellCheck="false"
      style={{width:"100%",background:T.input,border:`1px solid ${f?T.b3:T.b2}`,
        borderRadius:3,color:coord?T.coord:T.t1,
        fontFamily:coord?T.mono:T.sans,fontSize:coord?13:14,
        padding:"9px 10px",outline:"none",textAlign:coord?"right":"left",
        letterSpacing:coord?"0.04em":"normal",WebkitAppearance:"none"}}/>
  )
}

export function TSelect({ value, onChange, options }) {
  const [f, setF] = useState(false)
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{width:"100%",background:T.input,border:`1px solid ${f?T.b3:T.b2}`,
        borderRadius:3,color:T.t1,fontFamily:T.sans,fontSize:14,
        padding:"9px 10px",outline:"none",WebkitAppearance:"none",appearance:"none",
        backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6'%3E%3Cpath fill='%23384858' d='M4.5 6L0 0h9z'/%3E%3C/svg%3E\")",
        backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",paddingRight:26}}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}

export function TArea({ value, onChange, placeholder, rows=4, mono }) {
  const [f, setF] = useState(false)
  return (
    <textarea value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{width:"100%",background:T.input,border:`1px solid ${f?T.b3:T.b2}`,
        borderRadius:3,color:T.t1,fontFamily:mono?T.mono:T.sans,fontSize:mono?13:14,
        padding:"9px 10px",outline:"none",resize:"vertical",minHeight:80,lineHeight:1.65,
        WebkitAppearance:"none"}}/>
  )
}

export function Field({ label, required, children }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={L(T.t2,{marginBottom:5})}>{label}{required&&<span style={{color:T.amber,marginLeft:4}}>*</span>}</div>
      {children}
    </div>
  )
}

export function Topbar({ title, sub, accent, onBack, right }) {
  const ac = accent || T.blue
  return (
    <div style={{background:T.surface,borderBottom:`2px solid ${T.b2}`,borderTop:`2px solid ${ac}`,
      display:"flex",alignItems:"center",height:46,padding:"0 4px 0 0",
      flexShrink:0,position:"sticky",top:0,zIndex:50}}>
      <div style={{width:3,background:ac,alignSelf:"stretch",flexShrink:0}}/>
      {onBack && (
        <button onClick={onBack} style={{width:44,height:46,display:"flex",alignItems:"center",
          justifyContent:"center",background:"none",border:"none",cursor:"pointer",
          color:T.t2,flexShrink:0,WebkitTapHighlightColor:"transparent"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}
      <div style={{flex:1,padding:onBack?"0 8px 0 0":"0 12px",minWidth:0}}>
        <div style={TL(T.t1,{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"})}>{title}</div>
        {sub && <div style={L(ac,{opacity:0.65,marginTop:2})}>{sub}</div>}
      </div>
      {right && <div style={{paddingRight:10,flexShrink:0}}>{right}</div>}
    </div>
  )
}

export function Tabs({ tabs, active, onChange, accent }) {
  const ac = accent || T.blue
  return (
    <div style={{display:"flex",background:T.base,borderBottom:`1px solid ${T.b2}`,flexShrink:0,overflowX:"auto",scrollbarWidth:"none"}}>
      {tabs.map((t, i) => {
        const on = active === t.k
        return (
          <button key={t.k} onClick={()=>onChange(t.k)}
            style={{flexShrink:0,height:34,padding:"0 14px",background:on?T.panel:"transparent",
              borderRight:i<tabs.length-1?`1px solid ${T.b1}`:"none",
              borderTop:"none",borderBottom:on?`2px solid ${ac}`:"2px solid transparent",borderLeft:"none",
              fontFamily:T.mono,fontSize:10,fontWeight:700,color:on?ac:T.t3,
              letterSpacing:"0.11em",textTransform:"uppercase",cursor:"pointer",
              WebkitTapHighlightColor:"transparent",marginBottom:-1,whiteSpace:"nowrap"}}>
            {t.l}
          </button>
        )
      })}
    </div>
  )
}

export function ConfirmBarra({ msg, onOk, onCancel, danger }) {
  return (
    <div style={{display:"flex",alignItems:"center",
      background:danger?T.redBg:T.amberBg,
      borderBottom:`1px solid ${danger?T.red+"50":T.amber+"50"}`,
      padding:"6px 10px",gap:8,flexShrink:0,minHeight:36}}>
      <span style={{fontFamily:T.mono,fontSize:9,fontWeight:700,
        color:danger?T.red:T.amber,letterSpacing:"0.09em",
        textTransform:"uppercase",flex:1,lineHeight:1.3}}>{msg}</span>
      <button onClick={onOk} style={{height:28,padding:"0 12px",flexShrink:0,
        background:danger?T.red:T.amber,border:"none",borderRadius:2,
        fontFamily:T.mono,fontSize:9,fontWeight:700,
        color:danger?"#fff":T.base,letterSpacing:"0.09em",textTransform:"uppercase",
        cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
        CONFIRMAR
      </button>
      <button onClick={onCancel} style={{height:28,padding:"0 10px",flexShrink:0,
        background:"transparent",border:`1px solid ${T.b3}`,borderRadius:2,
        fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.t2,
        letterSpacing:"0.09em",textTransform:"uppercase",
        cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
        CANCELAR
      </button>
    </div>
  )
}

// ── Datos y métricas — usados en múltiples módulos ───────────
export function D(c, x) {
  return Object.assign({fontFamily:T.mono,fontSize:13,fontWeight:600,color:c||T.data,letterSpacing:"0.02em",lineHeight:1}, x)
}

export function Dot({ size, color }) {
  return <span style={{display:"inline-block",width:size||7,height:size||7,background:color,borderRadius:2,flexShrink:0}}/>
}

// Tag: versión sin decoración (texto técnico con corchetes)
export function Tag({ color, children }) {
  const c = color || T.t3
  return <span style={{fontFamily:T.mono,fontSize:10,fontWeight:700,color:c,
    letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>[{children}]</span>
}

// DRow: fila de dato label/valor — metadatos, fichas, detalles
export function DRow({ label, value, unit, color, mono=true }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      minHeight:36,padding:"0 12px",borderBottom:`1px solid ${T.b1}`,gap:12}}>
      <span style={L(T.t3,{flexShrink:0})}>{label}</span>
      <span style={mono ? D(color||T.data) : B(color||T.t1,{fontSize:13})}>
        {value}{unit && <span style={L(T.t3,{marginLeft:5,fontWeight:500})}>{unit}</span>}
      </span>
    </div>
  )
}

// ProgBar: barra de progreso técnica
export function ProgBar({ value=0, color, height=3, showLabel=false }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height,background:T.b2,overflow:"hidden"}}>
        <div style={{height:"100%",width:pct+"%",background:color||T.blue,transition:"width 300ms ease"}}/>
      </div>
      {showLabel && <span style={D(color||T.blue,{fontSize:10,minWidth:28,textAlign:"right"})}>{pct}%</span>}
    </div>
  )
}


export function Nav({ active, onNav }) {
  const items = [
    {k:"inicio",     l:"INICIO", ac:T.cyan,   icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>},
    {k:"proyectos",  l:"PROY",   ac:T.blue,   icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/></svg>},
    {k:"topografia", l:"TOPO",   ac:T.blue,   icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>},
    "div",
    {k:"evolucion",  l:"EVOL",   ac:T.violet, icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>},
    {k:"aprendizaje",l:"APREN",  ac:T.blue,   icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14"/><path d="M22 3h-6a4 4 0 0 0-4 4v14"/></svg>},
  ]
  return (
    <div style={{height:56,background:T.surface,borderTop:`1px solid ${T.b2}`,display:"flex",alignItems:"stretch",flexShrink:0}}>
      {items.map((item, i) => {
        if (item === "div") return <div key={i} style={{width:1,background:T.b2,margin:"10px 0"}}/>
        const on = active === item.k
        return (
          <button key={item.k} onClick={()=>onNav(item.k)}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",gap:4,background:on?item.ac+"12":"none",
              borderTop:on?`2px solid ${item.ac}`:"2px solid transparent",
              borderRight:"none",borderBottom:"none",borderLeft:"none",
              cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
            <span style={{color:on?item.ac:T.t3,display:"flex"}}>{item.icon}</span>
            <span style={L(on?item.ac:T.t3,{fontSize:8})}>{item.l}</span>
          </button>
        )
      })}
    </div>
  )
}
