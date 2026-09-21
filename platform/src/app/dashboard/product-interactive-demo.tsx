'use client';

import { useMemo, useState } from 'react';

type Mode = 'points' | 'intelligence';

const intelligenceInsights = [
  {
    label: 'Clientes en riesgo',
    value: '24',
    title: 'Recupera clientes antes de perderlos.',
    detail: 'Hay 24 clientes que solían regresar y no han vuelto en más de 30 días.',
    action: 'Enviar una oferta de regreso válida por 5 días.',
  },
  {
    label: 'Clientes frecuentes',
    value: '42',
    title: 'Premia a quienes ya te eligen.',
    detail: 'Tus clientes frecuentes son el grupo más estable y el que mejor responde a beneficios simples.',
    action: 'Crea una recompensa exclusiva para la próxima visita.',
  },
  {
    label: 'Nuevos clientes',
    value: '31',
    title: 'Convierte la primera visita en una segunda.',
    detail: '31 clientes llegaron recientemente y todavía están en el mejor momento para generar hábito.',
    action: 'Envía un incentivo para volver dentro de los próximos 7 días.',
  },
];

export function ProductInteractiveDemo({ mode }: { mode: Mode }) {
  return mode === 'points' ? <PointsInteractiveDemo /> : <IntelligenceInteractiveDemo />;
}

function PointsInteractiveDemo() {
  const [points, setPoints] = useState(7);
  const [message, setMessage] = useState('Faltan 3 puntos para la recompensa.');
  const rewardReady = points >= 10;
  const progress = Math.min(points * 10, 100);

  function addVisit() {
    setPoints((current) => {
      const next = Math.min(current + 1, 10);
      setMessage(next >= 10 ? 'Recompensa desbloqueada. El cliente ya puede canjearla.' : `Faltan ${10 - next} punto${10 - next === 1 ? '' : 's'} para la recompensa.`);
      return next;
    });
  }

  function redeem() {
    if (!rewardReady) return;
    setPoints(0);
    setMessage('Recompensa canjeada. El cliente empieza un nuevo ciclo.');
  }

  function reset() {
    setPoints(7);
    setMessage('Faltan 3 puntos para la recompensa.');
  }

  return (
    <section className="interactiveProductDemo pointsInteractiveDemo">
      <div className="interactiveDemoCopy">
        <span>PRUÉBALO</span>
        <h2>Así se siente Nival Puntos en una visita real.</h2>
        <p>Simula una visita, desbloquea la recompensa y mira cómo el progreso cambia frente al cliente.</p>
        <div className="interactiveDemoActions">
          <button type="button" onClick={addVisit} disabled={rewardReady}>Registrar visita +1</button>
          <button type="button" className="secondary" onClick={redeem} disabled={!rewardReady}>Canjear recompensa</button>
          <button type="button" className="textual" onClick={reset}>Reiniciar demo</button>
        </div>
      </div>
      <article className="interactiveLoyaltyCard">
        <div className="interactiveCardTop"><span>NIVAL PUNTOS</span><b>CAFÉ DEL CENTRO</b></div>
        <div className="interactivePointsValue"><small>TUS PUNTOS</small><strong>{points}</strong><span>de 10</span></div>
        <div className="interactiveProgress"><i style={{ width: `${progress}%` }} /></div>
        <div className={`interactiveRewardState ${rewardReady ? 'ready' : ''}`}>
          <small>{rewardReady ? 'RECOMPENSA LISTA' : 'PRÓXIMA RECOMPENSA'}</small>
          <b>Bebida mediana gratis</b>
          <p>{message}</p>
        </div>
      </article>
    </section>
  );
}

function IntelligenceInteractiveDemo() {
  const [selected, setSelected] = useState(0);
  const insight = useMemo(() => intelligenceInsights[selected], [selected]);

  return (
    <section className="interactiveProductDemo intelligenceInteractiveDemo">
      <div className="interactiveDemoCopy">
        <span>EXPLORA UNA RECOMENDACIÓN</span>
        <h2>Haz clic en un segmento y mira qué te sugeriría Intelligence.</h2>
        <p>La idea no es mostrarte más números: es ayudarte a decidir qué hacer después.</p>
        <div className="insightSelector" role="tablist" aria-label="Segmentos de ejemplo">
          {intelligenceInsights.map((item, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={selected === index}
              className={selected === index ? 'active' : ''}
              onClick={() => setSelected(index)}
              key={item.label}
            >
              <span>{item.label}</span>
              <b>{item.value}</b>
            </button>
          ))}
        </div>
      </div>
      <article className="interactiveInsightCard" aria-live="polite">
        <span>OPORTUNIDAD DETECTADA</span>
        <h3>{insight.title}</h3>
        <p>{insight.detail}</p>
        <div>
          <small>ACCIÓN RECOMENDADA</small>
          <strong>{insight.action}</strong>
        </div>
        <button type="button">Preparar acción →</button>
      </article>
    </section>
  );
}
