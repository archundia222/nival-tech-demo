import type { ManagedBusiness, UsagePeriod } from '@/lib/managed-business';
import { money } from '@/lib/orders';

export function dateLabel(value: string) { return new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
export function PeriodSummary({ period }: { period?: UsagePeriod }) {
  if (!period) return null;
  return <div className="managedMetrics"><article><span>Aperturas del periodo</span><strong>{period.views}</strong><small>{period.included_views ?? 0} incluidas · {period.billable_views ?? period.views} con cobro</small></article><article><span>Importe del periodo</span><strong>{money(Number(period.amount_cents))}</strong><small>{money(period.rate_cents)} por apertura con cobro</small></article><article><span>Próximo corte</span><strong className="managedDate">{dateLabel(period.ends_at)}</strong><small>Periodo de 30 días</small></article></div>;
}
export function PeriodHistory({ business }: { business: ManagedBusiness }) {
  const history = business.periods.filter(p => p.paid_at);
  return <details className="managedHistory"><summary>Historial de pagos y periodos ({history.length})</summary>{history.length ? history.map(p => <article key={p.id}><div><strong>{dateLabel(p.starts_at)} — {dateLabel(p.ends_at)}</strong><span>{p.views} aperturas · {money(Number(p.amount_cents))} · Pagado {dateLabel(p.paid_at!)}</span>{p.payment_reference && <small>Referencia: {p.payment_reference}</small>}</div><ul>{p.card_totals?.map(c => <li key={c.id}>{c.name}: <b>{c.views}</b></li>)}</ul></article>) : <p>Todavía no hay periodos pagados.</p>}</details>;
}
