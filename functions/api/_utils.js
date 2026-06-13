/**
 * Generates a UUIDv7 string.
 * UUIDv7 features a time-ordered value followed by random data, ideal for database primary keys.
 */
export function generateUUIDv7() {
  const timestamp = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // 48-bit timestamp (milliseconds since epoch)
  bytes[0] = Math.floor(timestamp / 2**40) & 0xFF;
  bytes[1] = Math.floor(timestamp / 2**32) & 0xFF;
  bytes[2] = Math.floor(timestamp / 2**24) & 0xFF;
  bytes[3] = Math.floor(timestamp / 2**16) & 0xFF;
  bytes[4] = Math.floor(timestamp / 2**8) & 0xFF;
  bytes[5] = Math.floor(timestamp) & 0xFF;
  
  // Version 7 (0111)
  bytes[6] = (bytes[6] & 0x0F) | 0x70;
  
  // Variant 10xx
  bytes[8] = (bytes[8] & 0x3F) | 0x80;
  
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.substring(0,8)}-${hex.substring(8,12)}-${hex.substring(12,16)}-${hex.substring(16,20)}-${hex.substring(20,32)}`;
}
