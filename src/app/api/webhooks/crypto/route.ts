import { handleCryptoIpn, MAX_IPN_BYTES } from "@/features/orders/ipn";
import { getRequestId } from "@/lib/request-id";

// IPN do gateway USDT: só assinatura do provedor (docs/04 rotas, RN-32)
export async function POST(request: Request) {
  // corpo grande é recusado antes de ser lido (sem assinatura não há motivo para aceitar)
  if (Number(request.headers.get("content-length") ?? 0) > MAX_IPN_BYTES)
    return new Response(null, { status: 413 });
  const status = await handleCryptoIpn(
    await request.text(),
    request.headers.get("x-nowpayments-sig"),
    getRequestId(request.headers),
  );
  return new Response(null, { status });
}
