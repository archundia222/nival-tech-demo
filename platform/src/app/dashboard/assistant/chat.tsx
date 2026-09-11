"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Props {
  businessId: string;
  conversationId: string | null;
  conversations: { id: string; title: string }[];
  messages: { id: number; role: string; content: string }[];
  initialMemory: string;
  databaseReady: boolean;
  aiReady: boolean;
}

export function AssistantChat(props: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [memory, setMemory] = useState(props.initialMemory);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [props.messages.length]);
  const base = `/dashboard/assistant?business=${props.businessId}`;

  async function act(action: string) {
    if (busy) return;
    if (action === "delete" && !window.confirm("¿Eliminar esta conversación y todos sus mensajes?")) return;
    setBusy(action); setError(""); setNotice("");
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, businessId: props.businessId, conversationId: props.conversationId, message: draft, content: memory }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo completar la solicitud.");
      if (action === "create") router.push(`${base}&conversation=${result.id}`);
      if (action === "delete") router.push(base);
      if (action === "send") setDraft("");
      if (action === "memory") setNotice(memory.trim() ? "Memoria guardada. Se usará en las siguientes respuestas." : "Memoria borrada.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo conectar. Intenta de nuevo."); }
    finally { setBusy(""); }
  }

  return <>
    {error && <p role="alert" className="formMessage errorMessage">{error}</p>}
    {notice && <p role="status" className="formMessage">{notice}</p>}
    <div className="assistantGrid">
      <aside className="assistantSidebar"><button className="primaryButton" disabled={!!busy || !props.databaseReady} onClick={() => act("create")}>{busy === "create" ? "Creando…" : "+ Nueva conversación"}</button>
        <h2>Tus conversaciones</h2><p>Privadas para tu usuario en este negocio.</p>
        <nav aria-label="Conversaciones">{props.conversations.map((c) => <Link aria-current={c.id === props.conversationId ? "page" : undefined} key={c.id} href={`${base}&conversation=${c.id}`}>{c.title}</Link>)}</nav>
        {!props.conversations.length && <p>Todavía no hay conversaciones.</p>}
      </aside>
      <section className="assistantChat" aria-label="Chat con Asistente Nival">
        <div className="assistantChatTop"><strong>Tu negocio, en conversación</strong>{props.conversationId && <button className="textButton" disabled={!!busy} onClick={() => act("delete")}>Eliminar conversación</button>}</div>
        <div className="assistantMessages" role="log" aria-live="polite" aria-label="Mensajes">
          {!props.messages.length && <div className="assistantEmpty"><h2>¿Qué quieres entender hoy?</h2><p>Consulta la actividad registrada o prepara una idea para tu negocio.</p>
            <div className="assistantSuggestions">{["¿Cómo van las visitas de los últimos 7 días?", "¿Qué puedes decirme de mis clientes?", "Ayúdame a preparar una promoción"].map((q) => <button key={q} disabled={!!busy} onClick={() => setDraft(q)}>{q}</button>)}</div>
            {!props.conversationId && <p>Crea una conversación para comenzar.</p>}
          </div>}
          {props.messages.map((m) => <article key={m.id} className={`assistantBubble ${m.role === "user" ? "fromUser" : "fromNival"}`}><strong>{m.role === "user" ? "Tú" : "Asistente Nival"}</strong><p>{m.content}</p></article>)}
          {busy === "send" && <p role="status" className="assistantThinking">Consultando los datos y preparando tu respuesta…</p>}<div ref={end} />
        </div>
        <form className="assistantComposer" onSubmit={(event) => { event.preventDefault(); act("send"); }}>
          <label htmlFor="assistant-question">Tu pregunta</label><textarea id="assistant-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={3} placeholder="Escribe lo que quieres saber…" disabled={!!busy} />
          <div><small>{draft.length}/2000</small><button className="primaryButton" disabled={!!busy || !props.databaseReady || !props.aiReady || !props.conversationId || !draft.trim()}>{busy === "send" ? "Respondiendo…" : "Enviar pregunta"}</button></div>
          <p>Hasta 30 consultas por día. La IA puede equivocarse: revisa sus sugerencias antes de aplicarlas.</p>
        </form>
      </section>
    </div>
    <details className="assistantMemory"><summary>Memoria del negocio</summary><p>Guarda objetivos, preferencias y contexto que quieras usar en futuras conversaciones. Se comparte con propietarios y administradores de este negocio. El chat no modifica esta memoria automáticamente.</p>
      <form onSubmit={(event) => { event.preventDefault(); act("memory"); }}><label htmlFor="business-memory">¿Qué debería recordar Nival?</label><textarea id="business-memory" value={memory} onChange={(event) => setMemory(event.target.value)} rows={5} maxLength={4000} disabled={!!busy} placeholder="Ejemplo: queremos aumentar las visitas entre semana. Preferimos ofrecer valor adicional antes que descuentos." /><p>Para borrar la memoria, deja el campo vacío y guarda. Evita contraseñas y datos bancarios.</p><button className="primaryButton" disabled={!!busy || !props.databaseReady}>{busy === "memory" ? "Guardando…" : "Guardar memoria"}</button></form>
    </details><p className="assistantFootnote">Las respuestas consultan los datos actuales, la memoria guardada y los últimos 20 mensajes. Aquí se muestran hasta 100 mensajes de la conversación. Los datos necesarios y tus preguntas se procesan con OpenAI; no se incluyen teléfonos, correos ni datos bancarios de clientes automáticamente.</p>
  </>;
}
