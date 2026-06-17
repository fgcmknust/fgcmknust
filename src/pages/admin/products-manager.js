import { showToast } from '../../components/toast.js';
import { formatGHS, escapeHtml } from '../../utils/helpers.js';
import { sanitizeInputString } from '../../utils/validation.js';
import { renderAdminShell, attachAdminShellBehavior } from './_layout.js';
import { ADMIN_ROUTES } from '../../config/admin-path.js';

function validateProductPayload(p) {
  if (!p.name || p.name.length < 1 || p.name.length > 200) return 'Name must be 1–200 characters';
  if (!p.description || p.description.length < 1 || p.description.length > 2000) return 'Description must be 1–2000 characters';
  if (!p.image) return 'Image is required';
  if (!['T-Shirts','Hoodies','Accessories','Books','Uncategorized'].includes(p.category)) return 'Invalid category';
  const priceNum = Number(p.price);
  if (!Number.isFinite(priceNum) || priceNum < 0 || priceNum > 1_000_000) return 'Invalid price';
  if (p.sizes && p.sizes.length > 20) return 'Too many sizes';
  if (/<\s*script\b/i.test(p.name + ' ' + p.description)) return 'Invalid characters';
  return null;
}

export async function ProductsManager(container) {
  const token = sessionStorage.getItem('adminToken');
  if (!token) {
    window.appNavigate(ADMIN_ROUTES.login);
    return;
  }

  const headerExtra = `<button id="btn-new-product" class="btn btn-gold">+ New Product</button>`;
  const innerContent = `
        <!-- Form Section -->
        <div id="product-form-section" class="admin-card mb-4" style="display: none;">
          <h3 class="admin-card-title mb-3" id="form-title">Create Product</h3>
          <form id="product-form" class="flex flex-col gap-3">
            <input type="hidden" id="product-id">
            <input type="hidden" id="product-existing-image">
            
            <div class="form-group">
              <label>Name *</label>
              <input type="text" id="product-name" class="form-control" required>
            </div>
            
            <div class="flex gap-3">
              <div class="form-group flex-1">
                  <label>Price (in GHS) *</label>
                  <input type="number" id="product-price" class="form-control" placeholder="e.g. 85.00 for 85 GHS" required min="0" step="0.01">
                  <small class="text-muted" id="price-preview">0.00 GHS</small>
              </div>
              <div class="form-group flex-1">
                <label>Category *</label>
                <select id="product-category" class="form-control" required>
                  <option value="T-Shirts">T-Shirts</option>
                  <option value="Hoodies">Hoodies</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Books">Books</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Sizes (comma separated)</label>
              <input type="text" id="product-sizes" class="form-control" placeholder="S, M, L, XL">
            </div>

            <div class="form-group">
              <label>Colours (comma separated)</label>
              <input type="text" id="product-colors" class="form-control" placeholder="Black, White, Light Green">
            </div>

            <div class="form-group">
              <label>Description *</label>
              <textarea id="product-description" class="form-control" rows="3" required></textarea>
            </div>
            
            <div class="form-group">
              <label>Image Upload *</label>
              <input type="file" id="product-image" class="form-control" accept="image/*">
            </div>
            
            <div class="form-group flex items-center gap-2">
              <input type="checkbox" id="product-is-featured">
              <label for="product-is-featured" style="margin: 0;">Feature on Store Homepage</label>
            </div>
            
            <div class="flex gap-2 mt-2">
              <button type="submit" class="btn btn-gold flex-1">Save Product</button>
              <button type="button" id="btn-cancel" class="btn btn-outline flex-1">Cancel</button>
            </div>
          </form>
        </div>

        <!-- List Section -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">All Products</h3>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="products-table-body">
                <tr><td colspan="5" class="admin-empty">Loading products…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
  `;

  container.innerHTML = renderAdminShell({
    title: 'Merch Manager',
    subtitle: 'Add, edit, and feature products in the store.',
    current: 'products',
    content: innerContent,
    headerExtra
  });
  attachAdminShellBehavior();

  // UI Elements
  const formSection = document.getElementById('product-form-section');
  const form = document.getElementById('product-form');
  const priceInput = document.getElementById('product-price');
  const pricePreview = document.getElementById('price-preview');
  const imageInput = document.getElementById('product-image');
  const tbody = document.getElementById('products-table-body');

  // Live price preview
  priceInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      pricePreview.textContent = formatGHS(val);
    } else {
      pricePreview.textContent = '0.00 GHS';
    }
  });

  // Load products
  async function loadProducts() {
    try {
      const res = await fetch('/api/products');
      const products = await res.json();
      
      tbody.innerHTML = '';
      if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">No products yet — create one above.</td></tr>';
        return;
      }
      
      products.forEach(p => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        tr.innerHTML = `
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${formatGHS(p.price)}</td>
          <td><span class="admin-badge is-pending">${escapeHtml(p.category)}</span></td>
          <td>${p.isFeatured ? '<span class="admin-badge is-success">Yes</span>' : '<span class="text-muted">—</span>'}</td>
          <td>
            <button class="btn btn-outline btn-sm btn-edit" data-id="${escapeHtml(p.id)}">Edit</button>
            <button class="btn btn-outline btn-sm btn-delete" data-id="${escapeHtml(p.id)}" style="border-color: #dc3545; color: #dc3545; margin-left: 0.4rem;">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      // Bind edit/delete
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editProduct(products.find(x => x.id === btn.dataset.id)));
      });
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
      });
      
    } catch (err) {
      showToast('Failed to load products', 'error');
    }
  }

  // Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let imageUrl = document.getElementById('product-existing-image').value;
    const file = imageInput.files[0];

    // Upload file if new
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const uploadRes = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      } catch (err) {
        showToast('Image upload failed', 'error');
        return;
      }
    }

    if (!imageUrl) {
      showToast('Image is required', 'error');
      return;
    }

    const sizesStr = document.getElementById('product-sizes').value;
    const sizesArr = sizesStr.split(',').map(s => sanitizeInputString(s, 32)).filter(Boolean).slice(0, 20);

    const colorsStr = document.getElementById('product-colors').value;
    const colorsArr = colorsStr.split(',').map(c => sanitizeInputString(c, 32)).filter(Boolean).slice(0, 20);

    const payload = {
      id: sanitizeInputString(document.getElementById('product-id').value, 128) || undefined,
      name: sanitizeInputString(document.getElementById('product-name').value, 200),
      price: document.getElementById('product-price').value,
      category: sanitizeInputString(document.getElementById('product-category').value, 100),
      sizes: sizesArr,
      colors: colorsArr,
      description: sanitizeInputString(document.getElementById('product-description').value, 2000),
      image: imageUrl,
      isFeatured: document.getElementById('product-is-featured').checked
    };

    const validationError = validateProductPayload(payload);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    try {
      const method = payload.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/products', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Save failed');
      
      showToast('Product saved successfully', 'success');
      form.reset();
      formSection.style.display = 'none';
      loadProducts();
    } catch (err) {
      showToast('Failed to save product', 'error');
    }
  });

  // Edit Product
  function editProduct(p) {
    document.getElementById('form-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = p.id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-price').value = p.price;
    document.getElementById('product-category').value = p.category;
    document.getElementById('product-description').value = p.description;
    document.getElementById('product-sizes').value = p.sizes ? p.sizes.join(', ') : '';
    document.getElementById('product-colors').value = p.colors ? p.colors.join(', ') : '';
    document.getElementById('product-existing-image').value = p.image;
    document.getElementById('product-is-featured').checked = p.isFeatured;
    
    pricePreview.textContent = formatGHS(p.price);
    imageInput.required = false;
    
    formSection.style.display = 'block';
    formSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Delete Product
  async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Product deleted', 'success');
      loadProducts();
    } catch (err) {
      showToast('Failed to delete product', 'error');
    }
  }

  document.getElementById('btn-new-product').addEventListener('click', () => {
    document.getElementById('form-title').textContent = 'Create Product';
    form.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-existing-image').value = '';
    pricePreview.textContent = '0.00 GHS';
    imageInput.required = true;
    formSection.style.display = 'block';
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    formSection.style.display = 'none';
    form.reset();
  });

  loadProducts();
}
