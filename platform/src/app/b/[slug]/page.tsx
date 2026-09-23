import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import { enrollCustomer } from "./actions";
import { getPublicPointsProgram } from "@/app/points/actions";

interface BusinessPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function BusinessPage({ params, searchParams }: BusinessPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data, error }, pointsProgram] = await Promise.all([
    supabase.rpc("get_public_business_v2", { business_slug: slug }),
    getPublicPointsProgram(slug).catch(() => null),
  ]);
  if (error || !data?.[0] || !pointsProgram) notFound();
  const business = data[0];

  return (
    <main className="customerShell brandedCustomerShell" style={{ "--business-accent": business.brand_color } as CSSProperties}>
      <header className="customerBrand">
        {business.logo_url ? <img className="businessLogo" src={business.logo_url} alt={`Logo de ${business.business_name}`} /> : <span className="brandmark">N</span>}
        <span>Programa impulsado por <a href="/?from=nival-puntos"><b>NIVAL tech</b></a></span>
      </header>
      <section className="customerHero">
        <p className="eyebrow">PROGRAMA DE CLIENTES FRECUENTES</p>
        <h1>{business.business_name}</h1>
        <p>{business.description ?? "Cada visita te acerca a una recompensa. Regístrate una vez y guarda tu tarjeta en el celular."}</p>
      </section>

      <section className="loyaltyPromise">
        <div><span>1</span><strong>Regístrate una vez</strong><small>Solo necesitas tu nombre y teléfono.</small></div>
        <div><span>2</span><strong>Suma al visitar</strong><small>Muestra tu tarjeta para registrar tu visita.</small></div>
        <div><span>3</span><strong>Recibe tu recompensa</strong><small>{pointsProgram.reward_description} al llegar a {pointsProgram.reward_threshold} puntos.</small></div>
      </section>

      <section className="customerFormCard">
          <h2>Crea tu tarjeta gratis</h2>
          <p>No necesitas descargar una app. Al terminar podrás abrir tu tarjeta desde este mismo celular.</p>
          {query.error && <div className="formMessage errorMessage">{query.error}</div>}
          <form action={enrollCustomer} className="authForm">
            <input type="hidden" name="slug" value={business.slug} />
            <input type="hidden" name="origin" value="qr" />
            <label>Nombre<input name="name" required minLength={2} maxLength={100} autoComplete="name" /></label>
            <label>Teléfono<input name="phone" type="tel" required minLength={10} maxLength={18} inputMode="tel" autoComplete="tel" placeholder="55 1234 5678" /></label>
            <label className="checkLabel"><input name="privacyConsent" type="checkbox" required /> Acepto el aviso de privacidad y el uso de mis datos para operar el programa.</label>
            <label className="checkLabel"><input name="marketingConsent" type="checkbox" /> Quiero recibir promociones de este negocio.</label>
            <button className="primaryButton" type="submit">Crear mi tarjeta y empezar</button>
          </form>
      </section>
      <aside className="publicNivalPromo"><div><span>PARA NEGOCIOS</span><strong>Haz que tus clientes quieran volver.</strong><p>Crea un programa como este con Nival Puntos.</p></div><a href="/?from=nival-puntos#productos">Conocer Nival Tech →</a></aside>
      {(business.phone || business.website_url) && <footer className="businessContact">
        {business.phone && <a href={`tel:${business.phone}`}>Llamar al negocio</a>}
        {business.website_url && <a href={business.website_url} target="_blank" rel="noreferrer">Visitar sitio web</a>}
      </footer>}
    </main>
  );
}
