import { escapeHtml } from '../utils/helpers.js';

export function renderHeroCarousel(container, events) {
  if (!events || events.length === 0) return;

  // Render carousel structure
  container.innerHTML = `
    <div class="hero-carousel" style="position: relative; width: 100%; height: 100vh; min-height: 600px; overflow: hidden; background: #000;">
      <!-- Slides -->
      <div class="carousel-track" style="display: flex; height: 100%; transition: transform 0.5s ease-in-out;">
        ${events.map(ev => {
    const isAnticipatory = ev.eventStatus === 'anticipatory';

    return `
            <div class="carousel-slide" style="min-width: 100%; height: 100%; position: relative;">
              <img src="${escapeHtml(ev.image)}" alt="${escapeHtml(ev.title)}" decoding="async" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.6;">
              <div class="carousel-content position-absolute flex flex-col justify-center items-center text-center p-4" 
                   style="top: 0; left: 0; width: 100%; height: 100%; z-index: 2;">
                
                ${isAnticipatory ? `
                  <h1 class="display text-white mb-2" style="text-shadow: 0 4px 12px rgba(0,0,0,0.5);">${escapeHtml(ev.title)}</h1>
                  <p class="text-white mb-4 max-w-[600px]" style="font-size: 1.2rem; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">${escapeHtml(ev.description)}</p>
                  <div class="flex gap-2">
                    <a href="/event-registration?eventId=${escapeHtml(ev.id)}" class="btn btn-gold hero-register-btn" data-event-image="${escapeHtml(ev.image)}">Register Now</a>
                    <a href="/events?eventId=${escapeHtml(ev.id)}" class="btn btn-outline" style="border-color: white; color: white;">Learn More</a>
                  </div>
                ` : `
                  <h1 class="display text-white mb-2" style="text-shadow: 0 4px 12px rgba(0,0,0,0.5);">${escapeHtml(ev.title)}</h1>
                  <p class="text-white mb-2 font-semibold" style="font-size: 1.2rem; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                    ${(ev.id === 'evt_001' || ev.id === '0188b8e0-1234-7abc-8def-000000000001') ? '27th-28th Jun 2026' : escapeHtml(ev.date ? new Date(ev.date).toLocaleDateString() : '')} | ${escapeHtml(ev.time || '')} | ${(ev.id === 'evt_001' || ev.id === '0188b8e0-1234-7abc-8def-000000000001') ? `<a href="https://maps.app.goo.gl/i8Aw8zWGq6162fgQ8" target="_blank" style="text-decoration: underline; color: inherit;">${escapeHtml(ev.venue || '')}</a>` : escapeHtml(ev.venue || '')}
                  </p>
                  <p class="text-white mb-4 max-w-[600px]" style="font-size: 1.1rem; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">${escapeHtml(ev.description)}</p>
                  <div class="flex gap-2">
                    <a href="/event-registration?eventId=${escapeHtml(ev.id)}" class="btn btn-gold hero-register-btn" data-event-image="${escapeHtml(ev.image)}">Register Now</a>
                    <a href="/events?eventId=${escapeHtml(ev.id)}" class="btn btn-outline" style="border-color: white; color: white;">Learn More</a>
                  </div>
                `}
              </div>
            </div>
          `;
  }).join('')}
      </div>

      <!-- Navigation Arrows (only show if > 1 slide) -->
      ${events.length > 1 ? `
        <button class="carousel-btn prev" style="position: absolute; top: 50%; left: 20px; transform: translateY(-50%); z-index: 10; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; width: 50px; height: 50px; color: white; cursor: pointer; transition: background 0.3s; display: flex; justify-content: center; align-items: center;">
          <i data-lucide="chevron-left" style="width: 24px; height: 24px;"></i>
        </button>
        <button class="carousel-btn next" style="position: absolute; top: 50%; right: 20px; transform: translateY(-50%); z-index: 10; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; width: 50px; height: 50px; color: white; cursor: pointer; transition: background 0.3s; display: flex; justify-content: center; align-items: center;">
          <i data-lucide="chevron-right" style="width: 24px; height: 24px;"></i>
        </button>
        
        <!-- Dots -->
        <div class="carousel-dots" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 10;">
          ${events.map((_, i) => `
            <div class="dot ${i === 0 ? 'active' : ''}" data-index="${i}" style="width: 12px; height: 12px; border-radius: 50%; background: ${i === 0 ? 'var(--color-gold)' : 'rgba(255,255,255,0.5)'}; cursor: pointer; transition: background 0.3s;"></div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // Store event image in sessionStorage when Register is clicked
  container.querySelectorAll('.hero-register-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const eventImage = btn.getAttribute('data-event-image');
      if (eventImage) {
        sessionStorage.setItem('eventHeroImage', eventImage);
      }
    });
  });

  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Setup carousel logic if more than 1 slide
  if (events.length > 1) {
    const track = container.querySelector('.carousel-track');
    const dots = container.querySelectorAll('.dot');
    const prevBtn = container.querySelector('.carousel-btn.prev');
    const nextBtn = container.querySelector('.carousel-btn.next');

    let currentIndex = 0;
    let autoPlayInterval;

    const goToSlide = (index) => {
      currentIndex = index;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      dots.forEach((dot, i) => {
        dot.style.background = i === currentIndex ? 'var(--color-gold)' : 'rgba(255,255,255,0.5)';
      });
    };

    const nextSlide = () => {
      currentIndex = (currentIndex + 1) % events.length;
      goToSlide(currentIndex);
    };

    const prevSlide = () => {
      currentIndex = (currentIndex - 1 + events.length) % events.length;
      goToSlide(currentIndex);
    };

    const startAutoPlay = () => {
      stopAutoPlay();
      autoPlayInterval = setInterval(nextSlide, 5000);
    };

    const stopAutoPlay = () => {
      clearInterval(autoPlayInterval);
    };

    // Event Listeners
    prevBtn.addEventListener('click', () => {
      prevSlide();
      startAutoPlay();
    });

    nextBtn.addEventListener('click', () => {
      nextSlide();
      startAutoPlay();
    });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.index, 10));
        startAutoPlay();
      });
    });

    // Pause on hover
    container.querySelector('.hero-carousel').addEventListener('mouseenter', stopAutoPlay);
    container.querySelector('.hero-carousel').addEventListener('mouseleave', startAutoPlay);

    // Start auto-play
    startAutoPlay();
  }
}
