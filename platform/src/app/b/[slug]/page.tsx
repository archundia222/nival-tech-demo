import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enrollCustomer } from "./actions";

interface BusinessPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enrolled?: string; card?: string; error?: string }>;
}

export default async function BusinessPage({ params, searchParams }: BusinessPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_business", { business_slug: slug });
  if (error || !data?.[0]) notFound();
  const business = data[0];

  return (
    <main className="customerShell">
      <header className="customerBrand"><span className="brandmark">N</span><span>Programa impulsado por <b>NIVAL tech</b></span></header>
      <section className="customerHero">
        <p className="eyebrow">PROGRAMA DE LEALTAD</p>
        <h1>{business.business_name}</h1>
        <p>Registra tus visitas, acumula puntos y recibe beneficios del negocio.</p>
      </section>

      {query.enrolled ? (
        <section className="enrollmentSuccess">
          <span className="successIcon">✓</span>
          <p className="eyebrow">REGISTRO COMPLETADO</p>
          <h2>Tu tarjeta ya fue creada</h2>
          <p>Comienzas con 0 puntos. En el siguiente paso podrás guardarla en Apple Wallet o Google Wallet.</p>
          <div className="walletPreview"><span>{business.business_name}</span><strong>0 puntos</strong><small>ID {query.card?.slice(0, 8).toUpperCase()}</small></div>
        </section>
      ) : (
        <section className="customerFormCard">
          <h2>Obtén tu tarjeta de puntos</h2>
          <p>Completa tus datos una sola vez. No necesitas descargar una aplicación.</p>
          {query.error && <div className="formMessage errorMessage">{query.error}</div>}
          <form action={enrollCustomer} className="authForm">
            <input type="hidden" name="slug" value={business.slug} />
            <label>Nombre<input name="name" required minLength={2} maxLength={100} autoComplete="name" /></label>
            <label>Teléfono<input name="phone" type="tel" required minLength={10} maxLength={18} inputMode="tel" autoComplete="tel" placeholder="55 1234 5678" /></label>
            <label>Correo <small>Opcional</small><input name="email" type="email" autoComplete="email" /></label>
            <label className="checkLabel"><input name="privacyConsent" type="checkbox" required /> Acepto el aviso de privacidad y el uso de mis datos para operar el programa.</label>
            <label className="checkLabel"><input name="marketingConsent" type="checkbox" /> Quiero recibir promociones de este negocio.</label>
            <button className="primaryButton" type="submit">Crear mi tarjeta</button>
          </form>
        </section>
      )}
    </main>
  );
}
