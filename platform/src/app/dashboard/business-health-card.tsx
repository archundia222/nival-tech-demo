import Link from 'next/link';
import styles from './business-health-card.module.css';

type HealthItem = { label: string; complete: boolean; href: string; action: string };

export function BusinessHealthCard({ items }: { items: HealthItem[] }) {
  const completed = items.filter((item) => item.complete).length;
  const percent = Math.round((completed / items.length) * 100);
  const nextItem = items.find((item) => !item.complete);
  return <section className={styles.card} aria-labelledby="business-health-title">
    <div className={styles.heading}>
      <div><span>ESTADO DEL NEGOCIO</span><h2 id="business-health-title">Tu configuración está al {percent}%</h2><p>{nextItem ? `Siguiente paso: ${nextItem.action}.` : 'Todo lo esencial está listo para operar.'}</p></div>
      <strong>{completed}/{items.length}</strong>
    </div>
    <div className={styles.progress} aria-label={`${percent}% completado`}><i style={{ width: `${percent}%` }} /></div>
    <div className={styles.items}>{items.map((item) => <Link className={item.complete ? styles.complete : styles.pending} href={item.href} key={item.label}><span aria-hidden="true">{item.complete ? '✓' : '○'}</span><div><b>{item.label}</b><small>{item.complete ? 'Listo' : item.action}</small></div><i aria-hidden="true">→</i></Link>)}</div>
  </section>;
}
