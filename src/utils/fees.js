/**
 * Paystack processing-fee math (Ghana, GHS).
 *
 * Standard Paystack rate for local Ghana transactions is 1.95%, capped at
 * GHS 10. We compute the fee on the cart subtotal and add it on top so the
 * customer sees and pays the full amount, and the church receives close to
 * the subtotal after Paystack settles.
 */

export const PAYSTACK_FEE = Object.freeze({
  RATE: 0.0195,
  CAP_CEDIS: 10
});

export function computeProcessingFee(subtotalCedis) {
  const subtotal = Number(subtotalCedis);
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  const raw = subtotal * PAYSTACK_FEE.RATE;
  const capped = Math.min(raw, PAYSTACK_FEE.CAP_CEDIS);
  return Math.round(capped * 100) / 100;
}

export function computeChargeBreakdown(subtotalCedis) {
  const subtotal = Math.round(Number(subtotalCedis) * 100) / 100;
  const fee = computeProcessingFee(subtotal);
  const total = Math.round((subtotal + fee) * 100) / 100;
  return { subtotal, fee, total };
}
