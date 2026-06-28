// Image file-signature ("magic bytes") validator.
//
// The manual-payment upload endpoint accepts JPEG, PNG, WEBP,
// and GIF. Without this check, an attacker can name an HTML/SVG/PDF payload
// `xss.jpg`, get it accepted via the extension + Content-Type check, and have
// it stored in R2 with an `image/jpeg` Content-Type. The X-Content-Type-Options:
// nosniff response header prevents browsers from interpreting the bytes as
// HTML — but that's the LAST line of defence; this is the first.
//
// Each recognised image format has a stable byte prefix:
//   JPEG : FF D8 FF
//   PNG  : 89 50 4E 47 0D 0A 1A 0A
//   GIF  : 47 49 46 38 (37|39) 61          ("GIF87a" / "GIF89a")
//   WEBP : 52 49 46 46 _ _ _ _ 57 45 42 50  ("RIFF" + 4 bytes size + "WEBP")
//
// We read the first ~16 bytes from the file's ArrayBuffer and match against
// these prefixes. Cloudflare Workers' Request.formData() returns Files with
// .arrayBuffer() / .slice() — we slice 16 bytes (a couple of KB at most) so
// we don't pay to read the whole file twice.

function arraysMatch(bytes, sig, offset = 0) {
  for (let i = 0; i < sig.length; i++) {
    if (bytes[offset + i] !== sig[i]) return false;
  }
  return true;
}

/**
 * Return the canonical image type ('jpg'|'png'|'gif'|'webp') if the supplied
 * File's first bytes match a known image signature, or null if not. Designed
 * to be invoked AFTER the cheap extension / declared-type checks so we don't
 * spend storage I/O on obviously-bad uploads.
 *
 * @param {File} file
 * @returns {Promise<'jpg'|'png'|'gif'|'webp'|null>}
 */
export async function detectImageType(file) {
  if (!file || typeof file.slice !== 'function') return null;
  let head;
  try {
    head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch (e) {
    return null;
  }
  if (head.length < 4) return null;

  // JPEG: FF D8 FF
  if (arraysMatch(head, [0xFF, 0xD8, 0xFF])) return 'jpg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (arraysMatch(head, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return 'png';

  // GIF87a / GIF89a: 47 49 46 38 (37|39) 61
  if (arraysMatch(head, [0x47, 0x49, 0x46, 0x38]) && (head[4] === 0x37 || head[4] === 0x39) && head[5] === 0x61) return 'gif';

  // WEBP: "RIFF" .... "WEBP"
  if (arraysMatch(head, [0x52, 0x49, 0x46, 0x46]) && arraysMatch(head, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';

  return null;
}

/**
 * Convenience wrapper: detect → assert it matches the extension-derived
 * type. Returns { ok: true } on match, otherwise an error message that
 * an endpoint can surface verbatim.
 *
 * @param {File} file
 * @param {'jpg'|'jpeg'|'png'|'gif'|'webp'} expectedExt
 */
export async function assertImageFile(file, expectedExt) {
  const detected = await detectImageType(file);
  if (!detected) return { ok: false, error: 'File does not look like a real image' };
  const normalizedExt = expectedExt === 'jpeg' ? 'jpg' : expectedExt;
  if (detected !== normalizedExt) {
    return { ok: false, error: `File content (${detected}) does not match its .${expectedExt} extension` };
  }
  return { ok: true, detected };
}
