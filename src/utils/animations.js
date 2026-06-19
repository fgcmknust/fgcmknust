/**
 * GSAP Animation Presets
 *
 * GSAP core is bundled at load time (needed for page-enter/exit transitions on
 * every navigation). ScrollTrigger is loaded lazily: on mobile it never loads
 * at all (initScrollReveals returns early), saving ~35KB of parse work on the
 * devices that need it most. This was a direct response to P75 Processing time
 * of 2,716ms on Android Chrome measured in Cloudflare Web Analytics.
 */
import { gsap } from 'gsap';

// Expose on window so legacy call sites that reach window.gsap keep working.
if (typeof window !== 'undefined') {
  window.gsap = window.gsap || gsap;
}

function isMobileOrTouch() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia
    ? window.matchMedia('(max-width: 768px), (pointer: coarse)').matches
    : window.innerWidth < 769;
}

// ScrollTrigger loaded once on first desktop use; null on mobile (never loads).
let _st = null;
async function ensureScrollTrigger() {
  if (_st) return _st;
  const mod = await import('gsap/ScrollTrigger');
  _st = mod.ScrollTrigger;
  gsap.registerPlugin(_st);
  window.ScrollTrigger = _st;
  return _st;
}

export const Animations = {
  async initScrollReveals(container = document) {
    if (!gsap) return;
    if (isMobileOrTouch()) return;

    const ScrollTrigger = await ensureScrollTrigger();
    const elements = container.querySelectorAll('[data-reveal]');

    elements.forEach(el => {
      const delay = el.dataset.revealDelay || 0;
      const direction = el.dataset.revealDirection || 'up';

      let y = 0, x = 0;
      if (direction === 'up') y = 40;
      if (direction === 'down') y = -40;
      if (direction === 'left') x = 40;
      if (direction === 'right') x = -40;

      gsap.fromTo(el,
        { y, x, opacity: 0 },
        {
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
            once: true
          },
          y: 0, x: 0, opacity: 1,
          duration: 0.8, delay,
          ease: 'power3.out'
        }
      );
    });
  },

  staggerCards(cards, triggerElement) {
    if (!gsap || !cards.length) return;
    if (isMobileOrTouch()) return;

    ensureScrollTrigger().then((ScrollTrigger) => {
      gsap.fromTo(cards,
        { y: 50, opacity: 0 },
        {
          scrollTrigger: {
            trigger: triggerElement || cards[0].parentElement,
            start: 'top 80%',
          },
          y: 0, opacity: 1,
          duration: 0.6, stagger: 0.1,
          ease: 'power2.out'
        }
      );
    });
  },

  // Deferred by callers via rAF so it never runs on the first paint frame,
  // preventing the GSAP scale+blur work from blocking user interactions (INP).
  premiumHero(bgElement, contentElements) {
    if (!gsap) return;

    const tl = gsap.timeline();

    tl.fromTo(bgElement,
      { scale: 1.3, filter: 'blur(15px)' },
      { scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' }
    );

    if (contentElements && contentElements.length) {
      tl.fromTo(contentElements,
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.5)' },
        '-=0.4'
      );
    }
  },

  async pageExit(container) {
    if (!gsap) return Promise.resolve();

    return new Promise(resolve => {
      gsap.to(container, {
        opacity: 0, y: -10, duration: 0.3, ease: 'power2.in',
        onComplete: resolve
      });
    });
  },

  pageEnter(container) {
    // Make content visible immediately as a fallback, then animate.
    container.style.opacity = '1';
    if (!gsap) return;

    gsap.fromTo(container,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );

    setTimeout(() => {
      if (_st) _st.refresh();
      this.initScrollReveals(container);
    }, 100);
  },

  shimmerText(element) {
    if (!gsap) return;

    gsap.to(element, {
      backgroundPositionX: '200%',
      duration: 3, repeat: -1, ease: 'none'
    });
  }
};
