import { renderHero } from '../components/hero.js';
import { renderEventCard } from '../components/event-card.js';
import { eventsData } from '../data/events.js';
import { Animations } from '../utils/animations.js';
import { getDummyEventImage, escapeHtml } from '../utils/helpers.js';

export async function Events(container) {
  let allEvents = eventsData;
  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      allEvents = await res.json();
      allEvents.forEach(ev => ev.image = getDummyEventImage(ev.id));
    }
  } catch(e) {
    console.error('API failed, using fallback data');
  }

  const heroHTML = renderHero({
    title: 'Events & Programs',
    subtitle: 'Stay connected with what God is doing on campus',
    bgImage: '/images/event-youth.jpg',
    height: '40vh',
    overlayOpacity: 0.7,
    // breadcrumbs intentionally removed per design
  });

  const html = `
    ${heroHTML}
    
    <section class="section bg-bg">
      <div class="container">
            <!-- Event Grid -->
        <div id="events-grid" class="grid grid-3">
          ${allEvents.map(e => renderEventCard(e)).join('')}
        </div>
        
        <!-- Empty State (hidden by default) -->
        <div id="events-empty" class="hidden text-center py-5">
           <i data-lucide="calendar-x" class="text-muted mx-auto mb-1" style="width: 48px; height: 48px; opacity: 0.5;"></i>
           <p class="text-muted">No events found for this category.</p>
        </div>
      </div>
    </section>
  `;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ root: container });
  Animations.initScrollReveals(container);

  // Attach click handlers to event cards (delegated via data-event-id)
  function attachEventCardHandlers(root) {
    const cards = (root || container).querySelectorAll('.event-card');
    cards.forEach(card => {
      // remove previous cached handler if any
      if (card._clickHandler) card.removeEventListener('click', card._clickHandler);
      const handler = (e) => {
        if (e.target.closest('a')) return;
        const id = card.dataset.eventId;
        if (id) window.appNavigate(`/events?eventId=${encodeURIComponent(id)}`);
      };
      card._clickHandler = handler;
      card.addEventListener('click', handler);
    });
  }

  // Filter Logic

  const eventsGrid = document.getElementById('events-grid');
  // initial attach
  attachEventCardHandlers(eventsGrid);
  const hashPart = (window.location.pathname + window.location.search);
  const queryParamsString = hashPart.split('?')[1];
  const urlParams = new URLSearchParams(queryParamsString || '');
  const activeEventId = urlParams.get('eventId');

  if (activeEventId) {
    const event = allEvents.find(e => e.id === activeEventId);
    if (event) {
      // No category tabs on this page — just show the event modal
      const displayDate = (event.id === 'evt_001' || event.id === '0188b8e0-1234-7abc-8def-000000000001') 
        ? '27th-28th Jun 2026' 
        : (event.date ? new Date(event.date).toLocaleDateString() : 'TBA');

      const venueHTML = (event.id === 'evt_001' || event.id === '0188b8e0-1234-7abc-8def-000000000001')
        ? `<a href="https://maps.app.goo.gl/i8Aw8zWGq6162fgQ8" target="_blank" style="text-decoration: underline; color: inherit;" class="hover-gold">${escapeHtml(event.venue || 'TBA')}</a>`
        : escapeHtml(event.venue || 'TBA');

      // Dynamically load showModal and launch it
      const { showModal } = await import('../components/modal.js');
      const content = `
        <div class="flex flex-col gap-2">
          <img src="${escapeHtml(event.image)}" alt="${escapeHtml(event.title)}" class="rounded w-full mb-2" loading="lazy" decoding="async" style="max-height: 250px; object-fit: cover;" />
          <div class="text-small text-muted flex flex-col gap-1 mb-2">
            <p class="flex gap-1 items-center mb-0"><i data-lucide="calendar" class="icon-sm"></i> <span>${escapeHtml(displayDate)}</span></p>
            <p class="flex gap-1 items-center mb-0"><i data-lucide="clock" class="icon-sm"></i> <span>${escapeHtml(event.time || 'TBA')}</span></p>
            <p class="flex gap-1 items-center mb-0"><i data-lucide="map-pin" class="icon-sm"></i> <span>${venueHTML}</span></p>
          </div>
          <div class="text-small text-muted" style="line-height: 1.6; margin-bottom: 1rem;">${event.description}</div>
          <div class="flex gap-1 mt-auto justify-end">
            <button class="btn btn-outline btn-sm" onclick="window.closeModal()">Close</button>
            <a href="/event-registration?eventId=${encodeURIComponent(event.id)}" onclick="window.closeModal()" class="btn btn-gold btn-sm">Register Now</a>
          </div>
        </div>
      `;
      showModal(event.title, content);
    }
  }
}
