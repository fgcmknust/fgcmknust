/**
 * GSAP Animation Presets
 */

// Register ScrollTrigger globally once loaded
if (typeof window !== 'undefined' && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

export const Animations = {
  /**
   * Initializes scroll reveals for elements with data-reveal attribute
   */
  initScrollReveals(container = document) {
    if (!window.gsap) return;
    
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
            start: "top 85%", // Trigger when top of element hits 85% of viewport
            toggleActions: "play none none reverse" // Play on enter, reverse on leave back
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
