import { truncate, stripHtml, escapeHtml } from '../utils/helpers.js';

export function renderEventCard(event) {
  const dateObj = new Date(event.date);
  const displayDateRaw = event.date ? dateObj.toLocaleDateString() : 'TBA';

  let displayDate = escapeHtml(displayDateRaw);
  let venueHTML = escapeHtml(event.venue || 'TBA');

  if (event.id === 'evt_001' || event.id === '0188b8e0-1234-7abc-8def-000000000001') {
    displayDate = '27th-28th Jun 2026';
    venueHTML = `<a href="https://maps.app.goo.gl/i8Aw8zWGq6162fgQ8" target="_blank" style="text-decoration: underline; color: inherit;" class="hover-gold">${escapeHtml(event.venue || 'TBA')}</a>`;
  }

  return `
    <article class="card event-card hover-lift" data-event-id="${escapeHtml(event.id)}" data-reveal="true" data-reveal-direction="up" style="cursor: pointer;">
      <!-- Image Cover -->
      <div class="event-cover" style="height: 200px; background-color: var(--color-dark-surface);">
        <img src="${escapeHtml(event.image)}" alt="${escapeHtml(event.title)}" loading="lazy" decoding="async">

        <!-- Category Pill -->
        <div class="position-absolute" style="top: 1rem; right: 1rem;">
          <span class="badge" style="background: rgba(255,255,255,0.9); color: var(--color-dark);">${escapeHtml(event.category)}</span>
        </div>
      </div>

      <!-- Content -->
      <div class="event-content">
        <h3 class="mb-1" style="font-size: 1.125rem;">${escapeHtml(event.title)}</h3>

        <div class="text-small text-muted flex flex-col gap-1 mb-2">
          <div class="flex items-center gap-1">
            <i data-lucide="calendar" class="icon-sm"></i>
            <span>${displayDate}</span>
          </div>
          <div class="flex items-center gap-1">
            <i data-lucide="clock" class="icon-sm"></i>
            <span>${escapeHtml(event.time || 'TBA')}</span>
          </div>
          <div class="flex items-center gap-1">
            <i data-lucide="map-pin" class="icon-sm"></i>
            <span>${venueHTML}</span>
          </div>
        </div>

        <p class="text-small text-muted mb-3" style="flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(truncate(stripHtml(event.description), 140))}
        </p>

        <a href="/event-registration" data-event-id="${escapeHtml(event.id)}" class="text-gold font-bold text-small flex items-center gap-1 mt-auto" style="text-decoration: none;">
          Register Now <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
        </a>
      </div>
    </article>
  `;
}
