// Shared Hubtel helpers used by the (currently suppressed) online checkout
// endpoints — pay/initialize, pay/verify, and pay/webhook.

export function hubtelAuthHeader(env) {
  // Basic auth from the API client id/secret pair issued in the Hubtel dashboard.
  return `Basic ${btoa(`${env.HUBTEL_CLIENT_ID}:${env.HUBTEL_CLIENT_SECRET}`)}`;
}

export function hasHubtelConfig(env) {
  return !!(env.HUBTEL_CLIENT_ID && env.HUBTEL_CLIENT_SECRET && env.HUBTEL_MERCHANT_ACCOUNT);
}

// Whitelist only the fields we actually use when reviewing a transaction, so we
// never persist more of the gateway payload than necessary. Accepts both the
// status-check shape (camelCase) and the callback shape (PascalCase).
export function sanitizeGatewayData(data) {
  if (!data || typeof data !== 'object') return null;
  const pick = (a, b) => (data[a] !== undefined ? data[a] : data[b]);
  return {
    clientReference: pick('clientReference', 'ClientReference'),
    transactionId: pick('transactionId', 'TransactionId'),
    externalTransactionId: pick('externalTransactionId', 'ExternalTransactionId'),
    status: pick('status', 'Status'),
    amount: pick('amount', 'Amount'),
    charges: pick('charges', 'Charges'),
    amountAfterCharges: pick('amountAfterCharges', 'AmountAfterCharges'),
    currencyCode: pick('currencyCode', 'CurrencyCode'),
    paymentMethod: pick('paymentMethod', 'PaymentMethod'),
    date: pick('date', 'Date')
  };
}

// Calls Hubtel's Transaction Status Check API. Returns
// { ok, paid, status, data } and never throws — callers treat a thrown/!ok
// result as "not yet confirmed". This is the authoritative check: callbacks are
// not signed, so we always re-confirm a payment server-to-server before marking
// a purchase paid.
export async function fetchHubtelStatus(env, clientReference) {
  if (!hasHubtelConfig(env) || !clientReference) {
    return { ok: false, paid: false, status: null, data: null };
  }
  const merchant = env.HUBTEL_MERCHANT_ACCOUNT;
  const url = `https://api-txnstatus.hubtel.com/transactions/${encodeURIComponent(merchant)}/status?clientReference=${encodeURIComponent(clientReference)}`;

  let res;
  let json = null;
  try {
    res = await fetch(url, { headers: { 'Authorization': hubtelAuthHeader(env) } });
    json = await res.json();
  } catch (e) {
    return { ok: false, paid: false, status: null, data: null };
  }

  const data = json && json.data ? json.data : null;
  const responseCode = json && (json.responseCode || json.ResponseCode);
  const status = data && (data.status || data.Status);
  const paid = !!res.ok && responseCode === '0000' &&
    typeof status === 'string' && status.toLowerCase() === 'paid';

  return { ok: !!res.ok, paid, status: status || null, data };
}
