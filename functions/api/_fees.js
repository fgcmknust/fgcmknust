// Hubtel processing fee (Ghana, GHS).
// Kept in sync with src/utils/fees.js — if you change rates, change both.
//
// NOTE: these are placeholder rates carried over from the previous gateway.
// Confirm the exact charge against your Hubtel merchant agreement (Hubtel's
// fee differs by channel — card vs mobile money) before the online flow is
// switched on; the value below is only used by the (currently suppressed)
// online checkout, not the active manual MoMo flow.
export const HUBTEL_FEE_RATE = 0.0195;
export const HUBTEL_FEE_CAP_CEDIS = 10;

export function computeProcessingFee(subtotalCedis) {
  const subtotal = Number(subtotalCedis);
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  const raw = subtotal * HUBTEL_FEE_RATE;
  const capped = Math.min(raw, HUBTEL_FEE_CAP_CEDIS);
  return Math.round(capped * 100) / 100;
}

export function computeChargeBreakdown(subtotalCedis) {
  const subtotal = Math.round(Number(subtotalCedis) * 100) / 100;
  const fee = computeProcessingFee(subtotal);
  const total = Math.round((subtotal + fee) * 100) / 100;
  return { subtotal, fee, total };
}
