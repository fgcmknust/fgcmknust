/**
 * Hubtel processing-fee math (Ghana, GHS).
 *
 * We compute the fee on the cart subtotal and add it on top so the customer
 * sees and pays the full amount, and the church receives close to the subtotal
 * after Hubtel settles.
 *
 * NOTE: the rate/cap below are placeholders carried over from the previous
 * gateway. Confirm them against your Hubtel merchant agreement (Hubtel's fee
 * differs by channel — card vs mobile money). They only affect the currently
 * suppressed online checkout, not the active manual MoMo flow, which charges
 * the raw subtotal with no added fee.
 */

export const HUBTEL_FEE = Object.freeze({
  RATE: 0.0195,
  CAP_CEDIS: 10
});

export function computeProcessingFee(subtotalCedis) {
  const subtotal = Number(subtotalCedis);
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  const raw = subtotal * HUBTEL_FEE.RATE;
  const capped = Math.min(raw, HUBTEL_FEE.CAP_CEDIS);
  return Math.round(capped * 100) / 100;
}

export function computeChargeBreakdown(subtotalCedis) {
  const subtotal = Math.round(Number(subtotalCedis) * 100) / 100;
  const fee = computeProcessingFee(subtotal);
  const total = Math.round((subtotal + fee) * 100) / 100;
  return { subtotal, fee, total };
}
