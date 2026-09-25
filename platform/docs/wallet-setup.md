# Nival Puntos: web, Google Wallet y Apple Wallet

## Estado del código

- La tarjeta web muestra puntos, visitas, recompensa y el último aviso para clientes que aceptaron promociones.
- Google Wallet firma enlaces de guardado, actualiza el saldo y permite mensajes `TEXT_AND_NOTIFY`.
- Apple Wallet genera un pase `.pkpass` firmado con puntos, visitas, recompensa y mensaje; registra los dispositivos en el servicio `/api/wallet/apple/v1`, entrega pases actualizados y solicita a APNs que notifique los cambios.
- La migración `20260925015627_apple_wallet_pass_updates.sql` ya está aplicada en Supabase `ukrfpgevpasheaabqskb` y limita sus tres tablas a `service_role` con RLS habilitado.

## Datos necesarios antes de habilitar Apple

1. Inscribirse en Apple Developer Program y crear un **Pass Type ID** para Nival Puntos.
2. Generar un certificado de ese Pass Type ID. Exportar el certificado y su clave privada en formato PEM. Descargar el certificado Apple WWDR vigente y convertirlo a PEM.
3. En el servidor de Vercel, configurar `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT`, `APPLE_PASS_KEY`, `APPLE_WWDR_CERT` y un secreto aleatorio de al menos 32 caracteres en `APPLE_PASS_AUTH_SECRET`. Si la clave está cifrada, agregar `APPLE_PASS_KEY_PASSPHRASE`. `NIVAL_PUBLIC_ORIGIN` debe ser la URL pública HTTPS de producción sin `/` final.
4. No colocar certificados o claves privadas en `NEXT_PUBLIC_*`, en el repositorio o en formularios de clientes. La misma pareja certificado/clave firma los pases y autentica los avisos de actualización con APNs.
5. Abrir `/card/<token>` en un iPhone, agregar el pase, registrar un punto y comprobar que el saldo se actualiza. Después enviar una promoción a una cuenta de prueba con consentimiento y comprobar la actualización y la notificación con Wallet habilitada. Repetir guardado y aviso en Google Wallet en Android; la tarjeta web debe mostrar el mismo saldo.

Sin estos certificados, el botón Apple permanece oculto y el resto de la tarjeta sigue disponible. La aceptación por APNs o Google no garantiza que el sistema operativo muestre una alerta: depende de ajustes del usuario y límites del proveedor.
