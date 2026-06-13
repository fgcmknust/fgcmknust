// Paystack processing fee (Ghana, GHS): 1.95% capped at GHS 10.
// Kept in sync with src/utils/fees.js — if you change rates, change both.

export const PAYSTACK_FEE_RATE = 0.0195;
export const PAYSTACK_FEE_CAP_CEDIS = 10;

export function computeProcessingFee(subtotalCedis) {
  const subtotal = Number(subtotalCedis);
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  const raw = subtotal * PAYSTACK_FEE_RATE;
  const capped = Math.min(raw, PAYSTACK_FEE_CAP_CEDIS);
  return Math.round(capped * 100) / 100;
}

export function computeChargeBreakdown(subtotalCedis) {
  const subtotal = Math.round(Number(subtotalCedis) * 100) / 100;
  const fee = computeProcessingFee(subtotal);
  const total = Math.round((subtotal + fee) * 100) / 100;
  return { subtotal, fee, total };
}
