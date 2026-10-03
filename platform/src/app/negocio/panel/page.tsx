import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getBusinessSession, managedBusinesses, currentPeriod, isBusinessActive, nivalWhatsApp } from '@/lib/managed-business';
import { publicSiteUrl } from '@/lib/payment-profile';
import { PeriodSummary, PeriodHistory } from '@/app/managed-shared';
import { BusinessCards, BusinessLogout } from './business-cards';

export default async function BusinessPanel() {
  const session = await getBusinessSession();
  if (!session) redirect('/negocio');
  const [business] = await managedBusinesses(session.business_id);
  if (!business) redirect('/negocio');
  const active = isBusinessActive(business);
  const whatsapp = await nivalWhatsApp(`Hola, soy ${business.name} y me interesa conseguir otra Nival Pay.`);
  const payContact = await nivalWhatsApp(`Hola, soy ${business.name}. Quiero recargar aperturas de mi Nival Pay.`);
  return <main className="managedShell"><header className="managedTop"><Link href="/" className="managedBrand">NIVAL <span>PAY</span></Link><BusinessLogout /></header>
    <section className="managedHeading"><div><span className="managedEyebrow">MI NEGOCIO</span><h1>{business.name}</h1></div><span className={`managedStatus ${active ? '' : 'paused'}`}>{active ? 'Servicio activo' : 'Servicio suspendido'}</span></section>
    {!active && <div className="managedNotice"><strong>Tus tarjetas están suspendidas.</strong><p>Puedes consultar tu consumo y editar tus datos. Recarga aperturas con Nival para volver a activar la tarjeta que se quedó sin saldo.</p>{payContact ? <a href={payContact} target="_blank" rel="noreferrer">Recargar aperturas por WhatsApp</a> : <Link href="/support">Contactar a Nival</Link>}</div>}
    <PeriodSummary period={currentPeriod(business)} />
    <section className="managedSectionHead"><div><h2>Mis Nival Pay</h2><p>Configura los datos que verá tu cliente en cada tarjeta.</p></div>{whatsapp ? <a className="managedButton" href={whatsapp} target="_blank" rel="noreferrer">Solicitar otra por WhatsApp</a> : <Link className="managedButton" href="/support">Solicitar otra tarjeta</Link>}</section>
    <BusinessCards cards={business.cards.filter(c => !c.managed_removed_at)} siteUrl={publicSiteUrl()} />
    <p className="managedFine">Recargar la misma página no consume otra apertura. Tus consultas con sesión iniciada como negocio tampoco consumen saldo. Una apertura no confirma una transferencia.</p>
    <PeriodHistory business={business} />
  </main>;
}
