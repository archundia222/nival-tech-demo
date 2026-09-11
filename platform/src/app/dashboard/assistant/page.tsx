import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssistantChat } from "./chat";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ business?: string; conversation?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role, businesses(name)").eq("user_id", user.id).in("role", ["owner", "manager"]).order("business_id");
  const membership = params.business ? memberships?.find((m) => m.business_id === params.business) : memberships?.[0];
  if (!membership) return <main className="assistantShell"><Link href="/dashboard">← Volver al panel</Link><h1>Asistente Nival</h1><p>Disponible para propietarios y administradores de tu negocio.</p></main>;
  const businessId = membership.business_id;
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const [conversations, memory] = await Promise.all([
    supabase.from("assistant_conversations").select("id, title").eq("business_id", businessId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("assistant_business_memory").select("content").eq("business_id", businessId).maybeSingle(),
  ]);
  const active = params.conversation ? conversations.data?.find((c) => c.id === params.conversation) : conversations.data?.[0];
  const messages = active ? await supabase.from("assistant_messages").select("id, role, content").eq("conversation_id", active.id).eq("business_id", businessId).eq("user_id", user.id).order("id", { ascending: false }).limit(100) : { data: [], error: null };
  const databaseReady = !conversations.error && !memory.error && !messages.error;
  const aiReady = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <main className="assistantShell">
    <header className="assistantHeader"><Link href="/dashboard">← Volver al panel</Link><span>{business?.name}</span></header>
    <div className="assistantTitle"><div><p className="eyebrow">NIVAL INTELLIGENCE</p><h1>Asistente Nival</h1><p>Pregunta sobre tu negocio y retoma tus conversaciones.</p></div><span className="ready">{databaseReady && aiReady ? "Disponible" : "Pendiente de activación"}</span></div>
    {!databaseReady && <p role="alert" className="formMessage errorMessage">Falta preparar la base de datos del asistente o no está disponible. Contacta con Nival Tech.</p>}
    {databaseReady && !aiReady && <p role="status" className="formMessage">Ya puedes preparar la memoria y tus conversaciones. Falta activar la conexión con la IA.</p>}
    <AssistantChat key={`${businessId}:${active?.id ?? "new"}`} businessId={businessId} conversationId={active?.id ?? null}
      conversations={conversations.data ?? []} messages={(messages.data ?? []).reverse()}
      initialMemory={memory.data?.content ?? ""} databaseReady={databaseReady} aiReady={aiReady} />
  </main>;
}
