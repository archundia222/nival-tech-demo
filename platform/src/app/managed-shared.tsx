import type { ManagedBusiness, UsagePeriod } from '@/lib/managed-business';
import { money } from '@/lib/orders';

export function dateLabel(value: string) { return new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
export function PeriodSummary({ period }: { period?: UsagePeriod }) {
  if (!period) return null;
  return <><div className="managedMetrics"><article><span>Aperturas del negocio</span><strong>{period.views}</strong><small>{period.included_views ?? 0} incluidas · {period.billable_views ?? period.views} con cobro</small></article><article><span>Total del corte</span><strong>{money(Number(period.amount_cents))}</strong><small>{money(period.rate_cents)} por apertura con cobro</small></article><article><span>Día de corte</span><strong className="managedDate">{dateLabel(period.ends_at)}</strong><small>Un solo corte para todo el negocio</small></article></div><CardBreakdown period={period} /></>;
}
function CardBreakdown({ period }: { period: UsagePeriod }) {
  const cards = period.card_totals ?? [];
  if (!cards.length) return null;
  return <details className="managedHistory"><summary>Ver consumo por tarjeta ({cards.length})</summary>{cards.map(c => <article key={c.id}><div><strong>{c.name}</strong><span>{c.views} aperturas · {c.included_views ?? 0} incluidas · {c.billable_views ?? c.views} con cobro · {money(Number(c.amount_cents ?? (c.billable_views ?? c.views) * period.rate_cents))}</span></div></article>)}</details>;
}
export function PeriodHistory({ business }: { business: ManagedBusiness }) {
  const history = business.periods.filter(p => p.paid_at);
  return <details className="managedHistory"><summary>Historial de cortes y pagos ({history.length})</summary>{history.length ? history.map(p => <article key={p.id}><div><strong>{dateLabel(p.starts_at)} — {dateLabel(p.ends_at)}</strong><span>{p.views} aperturas · {p.billable_views} cobrables · {money(Number(p.amount_cents))} · Pagado {dateLabel(p.paid_at!)}</span>{p.payment_reference && <small>Referencia: {p.payment_reference}</small>}</div><ul>{p.card_totals?.map(c => <li key={c.id}>{c.name}: <b>{c.views}</b> aperturas · {c.billable_views ?? c.views} cobrables · {money(Number(c.amount_cents ?? (c.billable_views ?? c.views) * p.rate_cents))}</li>)}</ul></article>) : <p>Todavía no hay periodos pagados.</p>}</details>;
}
