import { useState, lazy, Suspense } from "react"
import { T } from "./shared/tokens"
import { Nav } from "./shared/ui"

// Lazy loading por módulo — cada módulo carga solo cuando se necesita
// En Sistema 2 esto permite añadir módulos sin aumentar el bundle inicial
const ModuloInicio      = lazy(() => import("./modules/Inicio"))
const ModuloProyectos   = lazy(() => import("./modules/Proyectos"))
const ModuloTopografia  = lazy(() => import("./modules/Topografia"))
const ModuloAprendizaje = lazy(() => import("./modules/Aprendizaje"))
const ModuloEvolucion   = lazy(() => import("./modules/Evolucion"))

function Cargando() {
  return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
      background:T.base}}>
      <span style={{fontFamily:T.mono,fontSize:10,color:T.t3,letterSpacing:"0.11em"}}>
        CARGANDO...
      </span>
    </div>
  )
}

export default function App() {
  const [modulo, setModulo] = useState("inicio")

  return (
    <div style={{background:T.base,height:"100dvh",maxWidth:440,margin:"0 auto",
      display:"flex",flexDirection:"column",fontFamily:T.sans,color:T.t1,
      overflow:"hidden",minHeight:0}}>

      {/* minHeight:0 es necesario: sin él, flex:1 en columna ignora overflow del hijo */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        <Suspense fallback={<Cargando/>}>
          {modulo === "inicio"      && <ModuloInicio      onNav={setModulo}/>}
          {modulo === "proyectos"   && <ModuloProyectos   onNav={setModulo}/>}
          {modulo === "topografia"  && <ModuloTopografia  onNav={setModulo}/>}
          {modulo === "aprendizaje" && <ModuloAprendizaje onNav={setModulo}/>}
          {modulo === "evolucion"   && <ModuloEvolucion   onNav={setModulo}/>}
        </Suspense>
      </div>

      {/* Nav global — siempre visible */}
      <Nav active={modulo} onNav={setModulo}/>
    </div>
  )
}
