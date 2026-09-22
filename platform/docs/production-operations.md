# Operación profesional de Nival Tech

## Prioridad comercial

El producto vendible es Nival Pay por $199 MXN en un solo pago. Nival Puntos e Intelligence permanecen como productos en desarrollo hasta completar validación funcional, soporte y cobro recurrente.

## Alta de un negocio

1. Confirmar el pago aprobado de $199 MXN.
2. Verificar nombre, teléfono y responsable del negocio.
3. Revisar banco, titular, CLABE y concepto antes de activar la página.
4. Abrir la página pública sin sesión y comprobar todos los botones.
5. Descargar y probar el QR.
6. Programar la tarjeta NFC con el enlace permanente, nunca con datos bancarios directos.
7. Entregar y registrar la confirmación del cliente.

## Revisión diaria

- Revisar órdenes pagadas cuya activación no haya concluido.
- Revisar pagos pendientes con más de 24 horas y cancelarlos si corresponden.
- Confirmar que las páginas públicas principales respondan correctamente.
- Atender solicitudes de soporte sin pedir contraseñas, NIP, CVV ni códigos de acceso.
- Separar claramente cuentas y datos de prueba de los negocios reales.

## Incidencias de pago

- Nunca activar por el regreso del navegador; activar sólo mediante pago verificado o confirmación administrativa autorizada.
- Comparar producto, moneda, monto esperado, referencia externa y negocio.
- Mantener idempotencia: repetir un webhook no debe duplicar productos, perfiles ni cargos.
- Si Mercado Pago confirma el pago pero falla la activación, conservar la orden pagada y reintentar únicamente la activación.

## Soporte

Solicitar siempre:

- correo de la cuenta;
- nombre del negocio;
- enlace afectado;
- hora aproximada;
- captura sin datos bancarios completos.

Clasificación:

- P0: cobro incorrecto, exposición de datos, acceso cruzado entre negocios;
- P1: pago aprobado sin activación, página pública caída;
- P2: configuración, QR, NFC o edición;
- P3: dudas de uso y diseño.

## Liberación de cambios

1. Revisar que precios, textos y disponibilidad comercial sean coherentes.
2. Ejecutar la compilación de producción.
3. Verificar registro, inicio de sesión, dashboard, checkout y página pública.
4. Probar móvil y escritorio.
5. Revisar errores de ejecución.
6. Publicar una sola versión consolidada para evitar despliegues innecesarios.
7. Registrar el commit y el resultado del deployment.

## Seguridad y datos

- Toda tabla pública debe usar RLS.
- Las funciones con privilegios elevados deben validar usuario, negocio y rol.
- No exponer claves secretas en variables públicas.
- No mostrar CLABE completa en paneles administrativos innecesarios, logs o soporte.
- Conservar el principio de mínimo acceso para owner, manager y staff.
- Activar la protección contra contraseñas filtradas en Supabase Auth.
