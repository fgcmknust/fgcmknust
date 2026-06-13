import { renderHero } from '../components/hero.js';
import { renderHeroCarousel } from '../components/hero-carousel.js';
import { renderEventCard } from '../components/event-card.js';
import { eventsData } from '../data/events.js';
import { churchInfo } from '../data/church-info.js';
import { Animations } from '../utils/animations.js';
import { getDummyEventImage, escapeHtml } from '../utils/helpers.js';

export async function Home(container) {
  let allEvents = eventsData;
  let specialEvents = [];
  let devotional = {
    reference: "Lamentations 3:22-23",
    text: "Through the LORD's mercies we are not consumed, Because His compassions fail not. They are new every morning; Great is Your faithfulness.",
    version: "NKJV",
    category: "Mercy"
  };

  try {
    const [eventsRes, specialRes, devRes] = await Promise.all([
      fetch('/api/events'),
      fetch('/api/events?special=1'),
      fetch('/api/devotional')
    ]);
    if (eventsRes.ok) {
      allEvents = await eventsRes.json();
      allEvents.forEach(ev => ev.image = getDummyEventImage(ev.id));
    }
    if (specialRes.ok) {
      specialEvents = await specialRes.json();
      specialEvents.forEach(ev => ev.image = getDummyEventImage(ev.id));
    }
    if (devRes.ok) {
      const dbDevotional = await devRes.json();
      if (dbDevotional && dbDevotional.text) {
        devotional = dbDevotional;
      }
    }
  } catch (e) {
    console.error("API failed, using fallback data");
  }

  const featuredEvents = allEvents.filter(e => e.isFeatured).slice(0, 3);

  let heroHTML = '';
  
  if (specialEvents && specialEvents.length > 0) {
    // We will render the carousel inside a container later
    heroHTML = `<div id="hero-carousel-container"></div>`;
  } else {
    const defaultEvent = featuredEvents[0] || allEvents[0];
    const defaultEventId = defaultEvent ? defaultEvent.id : '';
    heroHTML = renderHero({
      title: '',
      subtitle: '',
      bgImage: '/images/Laptop.jpg',
      mobileBgImage: '/images/phone.jpg',
      height: 'auto; aspect-ratio: 16 / 9',
      mobileHeight: 'var(--mobile-vh, 100vh)',
      mobileBgSize: 'cover',
      mobileBgPosition: 'center center',
      overlayOpacity: 0.1,
      extraHTML: `
        <div class="position-absolute" style="bottom: 10%; right: 5%; z-index: 10;">
          <div class="flex gap-1">
            <a href="/events"${defaultEventId ? ` data-event-id="${escapeHtml(defaultEventId)}"` : ''} class="btn bg-white text-dark shadow-md" style="border-radius: 0;">Learn More</a>
            <a href="/event-registration"${defaultEventId ? ` data-event-id="${escapeHtml(defaultEventId)}"` : ''} class="btn btn-gold shadow-md hover-lift hero-register-btn" data-event-image="/images/Laptop.jpg" style="border-radius: 0;">Register</a>
          </div>
        </div>
      `
    });
  }

  const html = `
    ${heroHTML}




    <!-- About Section -->
    <section class="section bg-bg-alt welcome-section">
      <div class="container grid grid-2 items-center gap-4">
        <div data-reveal="true" data-reveal-direction="right">
          <h2 class="mb-1 text-gold-dark">Welcome Home</h2>
          <div style="width: 50px; height: 3px; background: var(--color-gold); margin-bottom: 1.5rem;"></div>
          <p class="text-muted" style="font-size: 1.1rem; line-height: 1.8;">${churchInfo.about}</p>
          <blockquote class="welcome-quote p-3 bg-white rounded shadow-sm border-l" style="border-left: 4px solid var(--color-gold);">
            <p class="mb-0 text-small italic">"${churchInfo.pastorWelcome}"</p>
          </blockquote>
        </div>
        <div data-reveal="true" data-reveal-direction="left" class="position-relative welcome-media">
           <img src="/images/event-sunday.jpg" alt="Church Service" class="rounded shadow-lg w-full" loading="lazy" decoding="async" style="height: 400px; object-fit: cover;">
           <div class="position-absolute glass p-2 rounded shadow-md" style="bottom: -2rem; right: 2rem; max-width: 200px;">
              <p class="font-bold text-small mb-0">Join us this Sunday</p>
              <p class="text-muted text-small mb-0 mt-0.5">9:00 AM @ ${churchInfo.address}</p>
           </div>
        </div>
      </div>
    </section>

    <!-- Featured Events -->
    <section class="section">
      <div class="container">
        <div class="flex justify-between items-center mb-3">
          <h2 class="mb-0" data-reveal="true">Upcoming Events</h2>
          <a href="/events" class="text-gold font-bold hover-gold-dark text-small">View All →</a>
        </div>
        <div class="grid grid-3" id="featured-events-grid">
          ${featuredEvents.map(e => renderEventCard(e)).join('')}
        </div>
      </div>
    </section>

    <!-- Daily Devotional -->
    <section class="section" style="background: linear-gradient(135deg, var(--color-bg-alt) 0%, var(--color-bg) 100%); position: relative; overflow: hidden;">
      <!-- Subtle background decoration -->
      <div class="position-absolute" style="top: -10%; right: -5%; width: 40%; height: 40%; background: radial-gradient(circle, rgba(197,151,62,0.08) 0%, rgba(255,255,255,0) 70%); z-index: 0;"></div>
      <div class="position-absolute" style="bottom: -10%; left: -5%; width: 50%; height: 50%; background: radial-gradient(circle, rgba(197,151,62,0.04) 0%, rgba(255,255,255,0) 70%); z-index: 0;"></div>
      
      <div class="container" style="position: relative; z-index: 1;">
        <div class="text-center mb-4" data-reveal="true" data-reveal-direction="up">
          <span class="text-gold font-bold text-small uppercase tracking-wider mb-1" style="display: block;">Daily Devotional</span>
          <h2 class="mb-0">Word for Today</h2>
          ${devotional.category ? `<span class="badge bg-gold text-dark mt-2">${escapeHtml(devotional.category)}</span>` : ''}
        </div>
        
        <div class="card p-4 shadow-lg border-0" data-reveal="true" style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px;">
          <div class="text-center">
            <i data-lucide="quote" class="text-gold opacity-50 mb-3 mx-auto" style="width: 48px; height: 48px;"></i>
            <blockquote class="mb-4" style="font-size: 1.5rem; line-height: 1.6; font-style: italic; color: var(--color-dark); font-weight: 500;">
              "${escapeHtml(devotional.text)}"
            </blockquote>
            <div class="mt-3">
              <h4 class="mb-0 font-bold" style="color: var(--color-gold); font-family: 'Playfair Display', serif;">
                ${escapeHtml(devotional.reference)}
              </h4>
              <p class="text-muted text-small mt-1 mb-0">${escapeHtml(devotional.version || 'NKJV')}</p>
            </div>
          </div>
        </div>
        <div class="text-center mt-4" data-reveal="true" data-reveal-direction="up" data-reveal-delay="200">
          <button class="btn btn-outline" onclick="window.location.reload();" style="border-radius: 30px; padding: 0.5rem 1.5rem;">
            <i data-lucide="refresh-cw" class="mr-1" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i> Read Another
          </button>
        </div>
      </div>
    </section>

    <!-- CTA Banner -->
    <section class="section gradient-bg text-center">
      <div class="container" data-reveal="true" data-reveal-direction="up">
        <h2 class="mb-1 text-dark">Become a Member Today</h2>
        <p class="text-dark opacity-80 mb-3 max-w-md mx-auto" style="max-width: 600px; margin-left: auto; margin-right: auto;">
          Take the next step in your spiritual journey. Join a department, serve with your gifts, and grow in a supportive community.
        </p>
        <a href="/register" class="btn btn-dark bg-dark text-white hover-lift px-4">Register Now</a>
      </div>
    </section>
  `;

  container.innerHTML = html;

  if (window.lucide) lucide.createIcons({ root: container });

  // Init GSAP animations
  Animations.initScrollReveals(container);
  
  if (specialEvents && specialEvents.length > 0) {
    const carouselContainer = document.getElementById('hero-carousel-container');
    renderHeroCarousel(carouselContainer, specialEvents);
  } else {
    const bg = document.getElementById('hero-parallax-bg');
    const heroButtons = container.querySelectorAll('.position-absolute .btn');
    if (bg) Animations.premiumHero(bg, heroButtons);

    // Store image in sessionStorage when default hero Register is clicked
    container.querySelectorAll('.hero-register-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventImage = btn.getAttribute('data-event-image');
        if (eventImage) {
          sessionStorage.setItem('eventHeroImage', eventImage);
        }
      });
    });
  }

  // Attach click handlers to featured event cards so they open the Events page Learn More
  function attachEventCardHandlers(root) {
    const grid = (root || container).querySelector('#featured-events-grid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.event-card');
    cards.forEach(card => {
      if (card._homeClick) card.removeEventListener('click', card._homeClick);
      const handler = (e) => {
        if (e.target.closest('a')) return;
        const id = card.dataset.eventId;
        if (id) {
          try { sessionStorage.setItem('skipRestore:/events', '1'); } catch (err) {}
          try { sessionStorage.setItem('nav:eventId', id); } catch (err) {}
          window.appNavigate('/events');
        }
      };
      card._homeClick = handler;
      card.addEventListener('click', handler);
    });
  }

  // initial attach for featured events
  attachEventCardHandlers(container);
}
