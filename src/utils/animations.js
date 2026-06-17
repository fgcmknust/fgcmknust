/**
 * GSAP Animation Presets
 */

// Register ScrollTrigger globally once loaded
if (typeof window !== 'undefined' && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

// Mobile / touch viewports get NO ScrollTrigger-driven reveals. The remaining
// trigger source of the scroll-up blink was iOS Safari's address-bar resize:
// when the bar slides back in, the viewport height shrinks, which fires a
// ScrollTrigger.refresh(). Each trigger re-computes its start position, and
// because GSAP's fromTo() owns the element's `opacity`/`transform` style, a
// re-evaluated trigger can flash the element through its "from" state for a
// frame. Even with `once: true` and `toggleActions: "play none none none"`,
// refresh() can re-init the timeline. The cheapest fix that's bulletproof
// across iOS Safari versions: don't attach ScrollTrigger on small viewports at
// all. The data-reveal markup stays — elements just appear at their final
// state immediately, which is fine for stacked mobile layouts.
function disableScrollRevealsOnMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia
    ? window.matchMedia('(max-width: 768px), (pointer: coarse)').matches
    : window.innerWidth < 769;
}

export const Animations = {
  /**
   * Initializes scroll reveals for elements with data-reveal attribute
   */
  initScrollReveals(container = document) {
    if (!window.gsap) return;
    if (disableScrollRevealsOnMobile()) return;

    const elements = container.querySelectorAll('[data-reveal]');
    
    elements.forEach(el => {
      const delay = el.dataset.revealDelay || 0;
      const direction = el.dataset.revealDirection || 'up'; // up, down, left, right
      
      let y = 0, x = 0;
      if (direction === 'up') y = 40;
      if (direction === 'down') y = -40;
      if (direction === 'left') x = 40;
      if (direction === 'right') x = -40;

      gsap.fromTo(el,
        {
          y: y,
          x: x,
          opacity: 0
        },
        {
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            // Play once and STAY. The previous "play none none reverse" reversed
            // the animation each time the element scrolled back above the
            // viewport, then replayed on re-entry. On mobile this caused a
            // visible blink when scrolling up from the footer (iOS Safari's
            // address-bar resize made ScrollTrigger re-evaluate the boundary
            // mid-scroll). Locking the state with "none" removes the blink and
            // also avoids unnecessary GPU work.
            toggleActions: "play none none none",
            once: true
          },
          y: 0,
          x: 0,
          opacity: 1,
          duration: 0.8,
          delay: delay,
          ease: "power3.out"
        }
      );
    });
  },

  /**
   * Staggered card entrance animation
   */
  staggerCards(cards, triggerElement) {
    if (!window.gsap || !cards.length) return;
    // Same mobile-blink reason as initScrollReveals — skip ScrollTrigger on
    // touch / small viewports so an iOS address-bar refresh can't snap cards
    // back through their opacity-0 state.
    if (disableScrollRevealsOnMobile()) return;

    gsap.fromTo(cards,
      { y: 50, opacity: 0 },
      {
        scrollTrigger: {
          trigger: triggerElement || cards[0].parentElement,
          start: "top 80%",
        },
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out"
      }
    );
  },

  /**
   * Premium Hero Animation (Ken Burns + Fade)
   */
  premiumHero(bgElement, contentElements) {
    if (!window.gsap) return;

    const tl = gsap.timeline();

    // 1. Hero section entrance: Fast zoom out with blur
    tl.fromTo(bgElement, 
      { scale: 1.3, filter: "blur(15px)" }, 
      { scale: 1, filter: "blur(0px)", duration: 0.9, ease: "power3.out" }
    );

    // 2. Then buttons stylishly appear
    if (contentElements && contentElements.length) {
      tl.fromTo(contentElements, 
        { y: 30, opacity: 0, scale: 0.9 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)" },
        "-=0.4" // Start before the zoom completely finishes
      );
    }
  },

  /**
   * Page transition hooks
   */
  async pageExit(container) {
    if (!window.gsap) return Promise.resolve();
    
    return new Promise(resolve => {
      gsap.to(container, {
        opacity: 0,
        y: -10,
        duration: 0.3,
        ease: "power2.in",
        onComplete: resolve
      });
    });
  },

  pageEnter(container) {
    if (!window.gsap) {
      container.style.opacity = 1;
      return;
    }
    
    gsap.fromTo(container,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
    
    // Re-initialize scroll triggers after page content changes
    setTimeout(() => {
      ScrollTrigger.refresh();
      this.initScrollReveals(container);
    }, 100);
  },

  /**
   * Golden shimmer effect on text
   */
  shimmerText(element) {
    if (!window.gsap) return;
    
    // Assumes element has .shimmer-text class with CSS background size 200%
    gsap.to(element, {
      backgroundPositionX: "200%",
      duration: 3,
      repeat: -1,
      ease: "none"
    });
  }
};
