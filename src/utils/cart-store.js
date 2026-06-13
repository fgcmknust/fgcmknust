/**
 * Cart Store
 *
 * The cart lives in localStorage, scoped to a per-browser client id so two
 * people on different devices (or different browsers on the same device) can
 * never see each other's cart. localStorage is already origin-scoped by the
 * browser; the client id is an extra defensive namespace so even if storage
 * keys somehow collide (shared profile sync, partner-mode, etc.) carts stay
 * separated.
 */

const CLIENT_ID_KEY = 'fgcm_client_id';

function generateClientId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // fall through
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = generateClientId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch (e) {
    // Storage unavailable (privacy mode etc.) — fall back to an ephemeral id
    // so the cart still works for the lifetime of the page.
    return 'ephemeral-' + generateClientId();
  }
}

const CLIENT_ID = getClientId();
const CART_KEY = `fgcm_cart::${CLIENT_ID}`;

export const CartStore = {
  CART_KEY,
  CLIENT_ID,

  getItems() {
    try {
      const items = localStorage.getItem(CART_KEY);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      console.error('Error reading cart from localStorage', e);
      return [];
    }
  },

  saveItems(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      this.dispatchUpdate();
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  },

  addItem(product, size, quantity = 1, color = null) {
    const items = this.getItems();
    const existingIndex = items.findIndex(item => item.id === product.id && item.size === size && item.color === color);

    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size,
        color,
        quantity
      });
    }

    this.saveItems(items);
  },

  updateQuantity(id, size, quantity) {
    const items = this.getItems();
    const existingIndex = items.findIndex(item => item.id === id && item.size === size);

    if (existingIndex > -1) {
      if (quantity <= 0) {
        items.splice(existingIndex, 1);
      } else {
        items[existingIndex].quantity = quantity;
      }
      this.saveItems(items);
    }
  },

  removeItem(id, size, color = null) {
    const items = this.getItems();
    const filteredItems = items.filter(item => !(item.id === id && item.size === size && item.color === color));
    this.saveItems(filteredItems);
  },

  clear() {
    this.saveItems([]);
  },

  getTotal() {
    return this.getItems().reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  getCount() {
    return this.getItems().reduce((count, item) => count + item.quantity, 0);
  },

  dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: this.getCount() } }));
  }
};
