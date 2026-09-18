'use client';

import { useMemo, useState } from 'react';
import { confirmCashPayment } from './actions';

export type AdminSaleRow = {
  id: string; businessName: string; phone: string | null; activatedAt: string;
  paymentMethod: string; status: string; amountCents: number; publicUrl: string | null;
};
export type AdminClientRow = {
  id: string; holder: string | null; businessName: string; clabe: string | null;
  bank: string | null; phone: string | null; purchasedAt: string;
};

function date(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(new Date(value));
}

export function SalesTable({ rows }: { rows: AdminSaleRow[] }) {
  const [pendingOnly, setPendingOnly] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const visible = pendingOnly ? rows.filter((row) => row.status === 'pending_cash_confirmation') : rows;
  return <>
    <div className="adminActions"><a className="adminPrimaryAction" href="/checkout" target="_blank">Activar nueva tarjeta</a><button className={pendingOnly ? 'active' : ''} onClick={() => setPendingOnly((value) => !value)}>Pendientes de confirmar</button></div>
    <section className="adminDataTable">
      <div className="adminTableHead sales"><span>Negocio</span><span>Contacto</span><span>Activación</span><span>Método</span><span>Estado</span><span>Página</span></div>
      {visible.length ? visible.map((row) => <article className="sales" key={row.id}>
        <strong>{row.businessName}</strong><span>{row.phone || 'Sin teléfono'}</span><time>{date(row.activatedAt)}</time><span>{row.paymentMethod === 'cash' ? 'Efectivo' : 'Mercado Pago'}</span>
        <span>{row.status === 'paid' ? <b className="adminStatus active">Activa</b> : <form action={confirmCashPayment}><input type="hidden" name="orderId" value={row.id} /><button className="adminConfirmButton">Confirmar efectivo</button></form>}</span>
        <span>{row.publicUrl ? <button className="adminCopyButton" onClick={async () => { await navigator.clipboard.writeText(row.publicUrl!); setCopied(row.id); }}>{copied === row.id ? 'Copiado' : 'Copiar link'}</button> : 'Pendiente'}</span>
      </article>) : <p className="adminNoRows">No hay ventas en este estado.</p>}
    </section>
  </>;
}

export function ClientsTable({ rows }: { rows: AdminClientRow[] }) {
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const normalized = search.trim().toLowerCase();
  const visible = useMemo(() => rows.filter((row) => !normalized || [row.holder, row.businessName, row.phone].some((value) => value?.toLowerCase().includes(normalized))), [rows, normalized]);
  return <>
    <label className="adminSearch"><span>Buscar cliente</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, negocio o teléfono" /></label>
    <section className="adminDataTable">
      <div className="adminTableHead clients"><span>Titular</span><span>Negocio</span><span>Banco</span><span>CLABE</span><span>Teléfono</span><span>Compra</span></div>
      {visible.length ? visible.map((row) => <article className="clients" key={row.id}><strong>{row.holder || 'Datos pendientes'}</strong><span>{row.businessName}</span><span>{row.bank || 'Pendiente'}</span>
        <span><button className="adminSensitive" onClick={() => setRevealed(revealed === row.id ? null : row.id)}>{revealed === row.id ? row.clabe || 'Pendiente' : row.clabe ? `•••• ${row.clabe.slice(-4)}` : 'Pendiente'}</button></span>
        <span>{row.phone || 'Sin teléfono'}</span><time>{date(row.purchasedAt)}</time></article>) : <p className="adminNoRows">No encontramos clientes con esa búsqueda.</p>}
    </section>
  </>;
}
