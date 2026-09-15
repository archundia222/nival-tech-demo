"use client";
export default function PayError({ reset }: { reset: () => void }) {
  return <main className="payWorkspace"><header className="payHeading"><h1>No pudimos cargar Nival Pay.</h1><p>Tus datos guardados se conservan. Intenta de nuevo.</p><button className="payButton" onClick={reset}>Volver a intentar</button></header></main>;
}
