import 'server-only';
import { createHmac, createPrivateKey, createPublicKey, timingSafeEqual, X509Certificate } from 'node:crypto';
import { connect } from 'node:http2';
import { PKPass } from 'passkit-generator';
import { appleWalletIcons } from '@/lib/apple-wallet-icons';

type Card = { token: string; businessName: string; customerName: string; points: number; visits: number; reward: string };

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value.replace(/\\n/g, '\n');
}

export function appleWalletReady() {
  if (!['APPLE_PASS_TYPE_ID', 'APPLE_TEAM_ID', 'APPLE_PASS_CERT', 'APPLE_PASS_KEY', 'APPLE_WWDR_CERT', 'APPLE_PASS_AUTH_SECRET'].every((key) => Boolean(process.env[key]?.trim()))) return false;
  if (required('APPLE_PASS_AUTH_SECRET').length < 32 || !/^pass\.[a-zA-Z0-9.-]+$/.test(required('APPLE_PASS_TYPE_ID'))) return false;
  try {
    const cert = new X509Certificate(required('APPLE_PASS_CERT'));
    const wwdr = new X509Certificate(required('APPLE_WWDR_CERT'));
    const key = createPrivateKey({ key: required('APPLE_PASS_KEY'), passphrase: process.env.APPLE_PASS_KEY_PASSPHRASE });
    return Date.parse(cert.validTo) > Date.now() && Date.parse(wwdr.validTo) > Date.now()
      && createPublicKey(key).export({ type: 'spki', format: 'der' }).equals(cert.publicKey.export({ type: 'spki', format: 'der' }));
  } catch { return false; }
}

export function applePassType() { return required('APPLE_PASS_TYPE_ID'); }
export function applePassToken(serial: string) {
  return createHmac('sha256', required('APPLE_PASS_AUTH_SECRET')).update(serial).digest('hex');
}
export function validApplePassRequest(serial: string, passType: string, authorization: string | null) {
  if (!appleWalletReady() || passType !== applePassType() || !/^[0-9a-f-]{36}$/i.test(serial)) return false;
  const supplied = authorization?.match(/^ApplePass ([a-f0-9]{64})$/i)?.[1];
  if (!supplied) return false;
  return timingSafeEqual(Buffer.from(supplied.toLowerCase()), Buffer.from(applePassToken(serial)));
}

export async function createApplePass(card: Card, latestMessage?: { title: string; body: string } | null) {
  const origin = (process.env.NIVAL_PUBLIC_ORIGIN || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '');
  const pass = new PKPass({
    ...appleWalletIcons,
    'pass.json': Buffer.from(JSON.stringify({
      formatVersion: 1,
      passTypeIdentifier: applePassType(),
      teamIdentifier: required('APPLE_TEAM_ID'),
      serialNumber: card.token,
      organizationName: 'Nival Tech',
      description: `Puntos de ${card.businessName}`,
      logoText: card.businessName,
      backgroundColor: 'rgb(28, 28, 31)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(213, 184, 118)',
      webServiceURL: `${origin}/api/wallet/apple`,
      authenticationToken: applePassToken(card.token),
      barcodes: [{ format: 'PKBarcodeFormatQR', message: `${origin}/card/${encodeURIComponent(card.token)}`, messageEncoding: 'iso-8859-1' }],
      generic: {
        primaryFields: [{ key: 'points', label: 'PUNTOS', value: card.points, changeMessage: 'Ahora tienes %@ puntos.' }],
        secondaryFields: [{ key: 'reward', label: 'PRÓXIMA RECOMPENSA', value: card.reward }],
        auxiliaryFields: [{ key: 'visits', label: 'VISITAS', value: card.visits }],
        backFields: [
          { key: 'member', label: 'CLIENTE', value: card.customerName },
          ...(latestMessage ? [{ key: 'promotion', label: latestMessage.title, value: latestMessage.body, changeMessage: 'Tienes una novedad en tu tarjeta: %@' }] : []),
          { key: 'website', label: 'CONSULTA TU TARJETA', value: `${origin}/card/${encodeURIComponent(card.token)}` },
        ],
      },
    })),
  }, {
    signerCert: required('APPLE_PASS_CERT'),
    signerKey: required('APPLE_PASS_KEY'),
    signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE,
    wwdr: required('APPLE_WWDR_CERT'),
  });
  return pass.getAsBuffer();
}

export async function pushApplePass(pushToken: string) {
  if (!/^[a-f0-9]{32,256}$/i.test(pushToken)) throw new Error('Invalid APNs token');
  const connection = connect('https://api.push.apple.com', {
    cert: required('APPLE_PASS_CERT'),
    key: required('APPLE_PASS_KEY'),
    passphrase: process.env.APPLE_PASS_KEY_PASSPHRASE,
  });
  try {
    return await new Promise<void>((resolve, reject) => {
      connection.once('error', reject);
      const request = connection.request({
        ':method': 'POST', ':path': `/3/device/${pushToken}`,
        'apns-topic': applePassType(), 'apns-push-type': 'background',
      });
      request.setTimeout(8000, () => request.close());
      let status = 0;
      let responseBody = '';
      request.on('response', (headers) => { status = Number(headers[':status']); });
      request.on('data', (chunk: Buffer) => { responseBody += chunk.toString().slice(0, 120); });
      request.on('end', () => status === 200 ? resolve() : reject(new Error(`APNs ${status}: ${responseBody}`)));
      request.on('error', reject);
      request.end('{}');
    });
  } finally { connection.close(); }
}

export async function notifyAppleWalletPass(serial: string) {
  if (!appleWalletReady()) return { accepted: 0, failed: 0 };
  const { createPointsAdminClient } = await import('@/lib/supabase/points-admin');
  const admin = createPointsAdminClient();
  const { data, error } = await admin.from('apple_wallet_registrations').select('push_token').eq('pass_serial', serial);
  if (error) throw error;
  let accepted = 0;
  let failed = 0;
  for (let index = 0; index < (data ?? []).length; index += 5) {
    const results = await Promise.allSettled((data ?? []).slice(index, index + 5).map((row) => pushApplePass(row.push_token)));
    for (const result of results) {
      if (result.status === 'fulfilled') accepted += 1;
      else {
        failed += 1;
        console.error('[apple-wallet] APNs pass update rejected', result.reason instanceof Error ? result.reason.message : 'unknown');
      }
    }
  }
  return { accepted, failed };
}

export async function notifyAppleForScanSession(sessionId: string) {
  if (!appleWalletReady()) return;
  const { createPointsAdminClient } = await import('@/lib/supabase/points-admin');
  const admin = createPointsAdminClient();
  const { data: session } = await admin.from('loyalty_scan_sessions').select('loyalty_account_id').eq('id', sessionId).maybeSingle();
  if (!session) return;
  const { data: account } = await admin.from('loyalty_accounts').select('public_token').eq('id', session.loyalty_account_id).maybeSingle();
  if (account) await notifyAppleWalletPass(account.public_token);
}
