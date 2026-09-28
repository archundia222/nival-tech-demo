'use client';
export function MobileMoreToggle() { return <button type="button" aria-label="Abrir más opciones" onClick={()=>{const menu=document.getElementById('v2MobileMore') as HTMLDetailsElement | null;if(menu){menu.open=!menu.open;menu.scrollIntoView({block:'nearest'});}}}>Más</button>; }
