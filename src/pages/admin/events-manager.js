import { showToast } from '../../components/toast.js';
import { formatDate, escapeHtml } from '../../utils/helpers.js';
import { sanitizeInputString } from '../../utils/validation.js';
import { renderAdminShell, attachAdminShellBehavior } from './_layout.js';
import { ADMIN_ROUTES } from '../../config/admin-path.js';

function validateEventPayload(p) {
  if (!p.title || p.title.length < 1 || p.title.length > 300) return 'Title must be 1–300 characters';
  if (!p.description || p.description.length < 1 || p.description.length > 2000) return 'Description must be 1–2000 characters';
  if (!p.image) return 'Image is required';
  if (!['Service','Youth','Outreach','Teaching','Social','Special','General'].includes(p.category)) return 'Invalid category';
  if (!['confirmed','cancelled','tentative','anticipatory'].includes(p.eventStatus)) return 'Invalid status';
  if (p.venue && p.venue.length > 300) return 'Venue is too long';
  if (p.time && p.time.length > 50) return 'Time is too long';
  if (/<\s*script\b/i.test(p.title + ' ' + p.description + ' ' + (p.venue || '') + ' ' + (p.time || ''))) return 'Invalid characters';
  return null;
}

export async function EventsManager(container) {
  const token = sessionStorage.getItem('adminToken');
  if (!token) {
    window.appNavigate(ADMIN_ROUTES.login);
    return;
  }

  const headerExtra = `<button id="btn-new-event" class="btn btn-gold">+ New Event</button>`;
  const innerContent = `
        <!-- Form Section (Hidden by default) -->
        <div id="event-form-section" class="admin-card mb-4" style="display: none;">
          <h3 class="admin-card-title mb-3" id="form-title">Create Event</h3>
          <form id="event-form" class="flex flex-col gap-3">
            <input type="hidden" id="event-id">
            <input type="hidden" id="event-existing-image">
            
            <div class="form-group">
              <label>Title *</label>
              <input type="text" id="event-title" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>Category *</label>
              <select id="event-category" class="form-control" required>
                <option value="Service">Service</option>
                <option value="Youth">Youth</option>
                <option value="Outreach">Outreach</option>
                <option value="Teaching">Teaching</option>
                <option value="Social">Social</option>
                <option value="Special">Special</option>
              </select>
            </div>
            
            <div class="form-group flex items-center gap-2">
              <input type="checkbox" id="event-is-special">
              <label for="event-is-special" class="font-semibold" style="margin: 0;">Mark as Special Event (Appears in Hero Carousel)</label>
            </div>
            
            <!-- Special Event Status Toggle -->
            <div id="event-status-group" class="form-group p-3 border" style="display: none; background: #fff; border-radius: 4px;">
              <label class="font-semibold block mb-2">Event Status (Special Events Only)</label>
              <div class="flex gap-3">
                <label class="flex items-center gap-1">
                  <input type="radio" name="eventStatus" value="confirmed" checked> Confirmed (Requires Date/Time/Venue)
                </label>
                <label class="flex items-center gap-1">
                  <input type="radio" name="eventStatus" value="anticipatory"> Anticipatory Flyer (Hides Date/Time/Venue)
                </label>
              </div>
            </div>
            
            <div id="event-details-group" class="flex flex-col gap-3" style="border-left: 2px solid var(--color-gold); padding-left: 1rem;">
              <div class="form-group">
                <label>Date *</label>
                <input type="date" id="event-date" class="form-control" required>
              </div>
              <div class="form-group">
                <label>Time *</label>
                <input type="text" id="event-time" class="form-control" placeholder="e.g., 9:00 AM - 11:30 AM" required>
              </div>
              <div class="form-group">
                <label>Venue *</label>
                <input type="text" id="event-venue" class="form-control" required>
              </div>
            </div>
            
            <div class="form-group">
              <label>Description *</label>
              <textarea id="event-description" class="form-control" rows="3" required></textarea>
            </div>
            
            <div class="form-group">
              <label>Image Upload * <span id="image-hint" class="text-muted" style="font-size: 0.8rem;"></span></label>
              <input type="file" id="event-image" class="form-control" accept="image/*">
            </div>
            
            <div class="form-group flex items-center gap-2">
              <input type="checkbox" id="event-is-featured">
              <label for="event-is-featured" style="margin: 0;">Feature in standard grid</label>
            </div>
            
            <div class="flex gap-2 mt-2">
              <button type="submit" class="btn btn-gold flex-1">Save Event</button>
              <button type="button" id="btn-cancel" class="btn btn-outline flex-1">Cancel</button>
            </div>
          </form>
        </div>

        <!-- List Section -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">All Events</h3>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Special</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="events-table-body">
                <tr><td colspan="6" class="admin-empty">Loading events…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
  `;

  container.innerHTML = renderAdminShell({
    title: 'Events Manager',
    subtitle: 'Create, edit, and feature events on the public site.',
    current: 'events',
    content: innerContent,
    headerExtra
  });
  attachAdminShellBehavior();

  // UI Elements
  const formSection = document.getElementById('event-form-section');
  const form = document.getElementById('event-form');
  const isSpecialCb = document.getElementById('event-is-special');
  const statusGroup = document.getElementById('event-status-group');
  const detailsGroup = document.getElementById('event-details-group');
  const dateInput = document.getElementById('event-date');
  const timeInput = document.getElementById('event-time');
  const venueInput = document.getElementById('event-venue');
  const imageInput = document.getElementById('event-image');
  const imageHint = document.getElementById('image-hint');
  const tbody = document.getElementById('events-table-body');
  const statusRadios = document.querySelectorAll('input[name="eventStatus"]');

  // Load events
  async function loadEvents() {
    try {
      const res = await fetch('/api/events');
      const events = await res.json();
      
      tbody.innerHTML = '';
      if (!events || events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">No events yet — create one above.</td></tr>';
        return;
      }

      events.forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(ev.title)}</strong></td>
          <td class="text-small text-muted">${ev.date ? formatDate(ev.date) : '—'}</td>
          <td><span class="admin-badge is-pending">${escapeHtml(ev.category)}</span></td>
          <td>${ev.isSpecial ? '<span class="admin-badge is-success">Yes</span>' : '<span class="text-muted">—</span>'}</td>
          <td>${ev.eventStatus === 'anticipatory' ? '<span class="admin-badge is-pending">Flyer</span>' : '<span class="admin-badge is-success">Confirmed</span>'}</td>
          <td>
            <button class="btn btn-outline btn-sm btn-edit" data-id="${escapeHtml(ev.id)}">Edit</button>
            <button class="btn btn-outline btn-sm btn-delete" data-id="${escapeHtml(ev.id)}" style="border-color: #dc3545; color: #dc3545; margin-left: 0.4rem;">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      // Bind edit/delete
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editEvent(events.find(e => e.id === btn.dataset.id)));
      });
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
      });
      
    } catch (err) {
      showToast('Failed to load events', 'error');
    }
  }

  // Toggle dynamic form fields based on "Special" and "Status"
  function updateFormDynamicFields() {
    const isSpecial = isSpecialCb.checked;
    const isAnticipatory = document.querySelector('input[name="eventStatus"]:checked').value === 'anticipatory';

    if (isSpecial) {
      statusGroup.style.display = 'block';
      imageHint.textContent = '(Must be 16:9 aspect ratio, e.g. 1920x1080)';
    } else {
      statusGroup.style.display = 'none';
      document.querySelector('input[name="eventStatus"][value="confirmed"]').checked = true;
      imageHint.textContent = '';
    }

    if (isSpecial && isAnticipatory) {
      detailsGroup.style.display = 'none';
      dateInput.required = false;
      timeInput.required = false;
      venueInput.required = false;
    } else {
      detailsGroup.style.display = 'flex';
      dateInput.required = true;
      timeInput.required = true;
      venueInput.required = true;
    }
  }

  isSpecialCb.addEventListener('change', updateFormDynamicFields);
  statusRadios.forEach(r => r.addEventListener('change', updateFormDynamicFields));

  // Validate Image Aspect Ratio (16:9) for Special Events
  function validateImageAspectRatio(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        // 16:9 is 1.777... allow some leniency (1.7 to 1.8)
        if (ratio >= 1.7 && ratio <= 1.8) {
          resolve(true);
        } else {
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  }

  // Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isSpecial = isSpecialCb.checked;
    let imageUrl = document.getElementById('event-existing-image').value;
    const file = imageInput.files[0];

    // If new file uploaded
    if (file) {
      if (isSpecial) {
        const validRatio = await validateImageAspectRatio(file);
        if (!validRatio) {
          showToast('Special event images must have a 16:9 aspect ratio (e.g. 1920x1080). Please resize your image and try again.', 'error');
          return;
        }
      }

      // Upload file
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

    const isAnticipatory = isSpecial && document.querySelector('input[name="eventStatus"]:checked').value === 'anticipatory';
    let isoDate = dateInput.value;
    if (isoDate && !isoDate.includes('T')) {
      isoDate = isoDate + 'T00:00:00Z'; // Append time to make valid ISO
    }

    const payload = {
      id: sanitizeInputString(document.getElementById('event-id').value, 128) || undefined,
      title: sanitizeInputString(document.getElementById('event-title').value, 300),
      category: sanitizeInputString(document.getElementById('event-category').value, 100),
      isSpecial: isSpecialCb.checked,
      eventStatus: isSpecialCb.checked ? document.querySelector('input[name="eventStatus"]:checked').value : 'confirmed',
      date: isAnticipatory ? null : isoDate,
      time: isAnticipatory ? null : sanitizeInputString(timeInput.value, 50),
      venue: isAnticipatory ? null : sanitizeInputString(venueInput.value, 300),
      description: sanitizeInputString(document.getElementById('event-description').value, 2000),
      image: imageUrl,
      isFeatured: document.getElementById('event-is-featured').checked
    };

    const validationError = validateEventPayload(payload);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    try {
      const method = payload.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/events', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Save failed');
      
      showToast('Event saved successfully', 'success');
      form.reset();
      formSection.style.display = 'none';
      loadEvents();
    } catch (err) {
      showToast('Failed to save event', 'error');
    }
  });

  // Edit Event
  function editEvent(ev) {
    document.getElementById('form-title').textContent = 'Edit Event';
    document.getElementById('event-id').value = ev.id;
    document.getElementById('event-title').value = ev.title;
    document.getElementById('event-category').value = ev.category;
    document.getElementById('event-description').value = ev.description;
    document.getElementById('event-existing-image').value = ev.image;
    document.getElementById('event-is-featured').checked = ev.isFeatured;
    isSpecialCb.checked = ev.isSpecial;
    
    if (ev.eventStatus === 'anticipatory') {
      document.querySelector('input[name="eventStatus"][value="anticipatory"]').checked = true;
    } else {
      document.querySelector('input[name="eventStatus"][value="confirmed"]').checked = true;
    }
    
    if (ev.date) {
      document.getElementById('event-date').value = ev.date.split('T')[0];
    } else {
      document.getElementById('event-date').value = '';
    }
    
    document.getElementById('event-time').value = ev.time || '';
    document.getElementById('event-venue').value = ev.venue || '';
    
    imageInput.required = false; // Not required on edit if existing image
    
    updateFormDynamicFields();
    formSection.style.display = 'block';
    formSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Delete Event
  async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Event deleted', 'success');
      loadEvents();
    } catch (err) {
      showToast('Failed to delete event', 'error');
    }
  }

  document.getElementById('btn-new-event').addEventListener('click', () => {
    document.getElementById('form-title').textContent = 'Create Event';
    form.reset();
    document.getElementById('event-id').value = '';
    document.getElementById('event-existing-image').value = '';
    imageInput.required = true;
    updateFormDynamicFields();
    formSection.style.display = 'block';
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    formSection.style.display = 'none';
    form.reset();
  });

  // Initial setup
  loadEvents();
}
