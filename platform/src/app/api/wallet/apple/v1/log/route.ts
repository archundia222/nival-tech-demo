export async function POST(request: Request) {
  const data = await request.json().catch(() => null);
  if (Array.isArray(data?.logs)) console.info('[apple-wallet] client logs', data.logs.slice(0, 5).map((entry: unknown) => String(entry).slice(0, 160)));
  return new Response(null, { status: 200 });
}
