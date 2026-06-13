/**
 * Helper Functions
 */

/**
 * Format amount in cedis to GHS string
 * @param {number} cedis - Amount in cedis
 * @returns {string} Formatted currency string
 */
export function formatGHS(cedis) {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2
  }).format(cedis);
}

/**
 * Format date string to readable format
 * @param {string} isoString - Date string
 * @returns {string} Formatted date (e.g., "Sat, Jun 14, 2026")
 */
export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time string
 * @param {string} isoString - Date/time string
 * @returns {string} Formatted time (e.g., "10:00 AM")
 */
export function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Truncate text with ellipsis
 * @param {string} str - Text to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated text
 */
export function truncate(str, length) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

/**
 * Strip HTML tags from a string
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Generate a random unique ID
 * @returns {string} Random ID
 */
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Validates an email address
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validates a Ghanaian phone number (basic check)
 * @param {string} phone 
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  // basic check for 10 digits starting with 0, or +233
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+233|0)\d{9}$/.test(cleaned);
}

/**
 * Escape string for safe insertion into HTML
 * @param {string} str
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get a deterministic dummy image for an event (used for development before URLs are production ready)
 * Only uses images that actually exist in public/images/
 * @param {string} id - Event ID
 * @returns {string} Image URL
 */
export function getDummyEventImage(id) {
  if (!id) return '/images/Laptop.jpg';
  // Specific image overrides for known events
  const imageOverrides = {
    '0188b8e0-1234-7abc-8def-000000000001': '/images/Laptop.jpg',
    'evt_001': '/images/Laptop.jpg',
  };
  if (imageOverrides[id]) return imageOverrides[id];
  const dummyImages = [
    '/images/event-sunday.jpg',
    '/images/event-youth.jpg',
    '/images/Keepers.jpg'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return dummyImages[hash % dummyImages.length];
}
