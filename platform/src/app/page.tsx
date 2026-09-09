import { platformModules } from "@/lib/domain";

export default function Home() {
  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="#inicio" aria-label="Nival Tech">
          <span className="brandmark">N</span>
          NIVAL tech
        </a>
        <div className="navActions">
          <a className="healthLink" href="/api/health">Estado del sistema</a>
          <span className="badge">PLATAFORMA · EN CONSTRUCCIÓN</span>
        </div>
      </nav>

      <section className="hero" id="inicio">
        <p className="eyebrow">INFRAESTRUCTURA COMERCIAL</p>
        <h1>Lealtad digital que se convierte en decisiones.</h1>
        <p className="lead">
          Una sola plataforma para identificar clientes, actualizar sus puntos y ayudar al
          dueño a tomar acciones concretas desde su panel o WhatsApp.
        </p>
        <div className="flow" aria-label="Flujo principal">
          <span>NFC o QR</span><i>→</i><span>Registro</span><i>→</i><span>Wallet</span><i>→</i><span>Intelligence</span>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">NÚCLEO DEL PRODUCTO</p>
            <h2>Arquitectura modular</h2>
          </div>
          <p>Todos los módulos comparten una base de datos multiempresa.</p>
        </div>
        <div className="moduleGrid">
          {platformModules.map((module, index) => (
            <article className="module" key={module.name}>
              <span>0{index + 1}</span>
              <h3>{module.name}</h3>
              <p>{module.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="statusCard">
        <div>
          <p className="eyebrow">PRIMERA BASE</p>
          <h2>Modelo multiempresa preparado</h2>
          <p>El esquema separa negocios, miembros, clientes, visitas, pases y campañas.</p>
        </div>
        <span className="ready">LISTO</span>
      </section>
    </main>
  );
}
