import { escapeHtml, escapeAttrUrl } from '../utils/helpers.js';

export function renderHero(options) {
  const {
    title,
    subtitle,
    bgImage = '/images/Keepers.webp',
    mobileBgImage,
    height = 'auto; aspect-ratio: 16 / 9',
    mobileHeight,
    mobileBgPosition,
    overlayOpacity = 0.6,
    alignment = 'center',
    breadcrumbs = [],
    extraHTML = ''
  } = options;
  const fullImage = options.fullImage || false;

  const safeSrc = (s) => encodeURI(String(s || '').replace(/['"\\\s)<>]/g, ''));
  const safeBg = safeSrc(bgImage);
  const safeMobileBg = mobileBgImage ? safeSrc(mobileBgImage) : '';

  let breadcrumbsHTML = '';
  if (breadcrumbs.length > 0) {
    breadcrumbsHTML = `
      <div class="breadcrumbs text-small text-gold-light mb-2">
        ${breadcrumbs.map((crumb, idx) => `
          ${idx > 0 ? '<span class="mx-1 opacity-50">/</span>' : ''}
          ${crumb.link ? `<a href="${escapeAttrUrl(crumb.link)}" class="text-white hover-gold">${escapeHtml(crumb.label)}</a>` : `<span>${escapeHtml(crumb.label)}</span>`}
        `).join('')}
      </div>
    `;
  }

  const alignClass = alignment === 'center' ? 'items-center text-center' : 'items-start text-left';
  const styleId = `hero-style-${Math.random().toString(36).substr(2, 9)}`;
  const heightValue = fullImage ? 'auto' : height;

  // Derive type attribute for WebP sources so non-WebP browsers skip the hint.
  const mimeType = (url) => url && url.endsWith('.webp') ? 'image/webp'
    : url && url.endsWith('.jpg') || url && url.endsWith('.jpeg') ? 'image/jpeg'
    : url && url.endsWith('.png') ? 'image/png' : '';

  // Mobile override: translate mobileBgPosition to CSS object-position on the <img>.
  // Any value like "center center" or "top left" works directly as object-position.
  const mobileObjPos = mobileBgPosition
    ? `@media (max-width: 767px) { #${styleId} .hero-bg img { object-position: ${mobileBgPosition}; } }`
    : '';

  // mobileHeight override — already handled by index.css .page-hero rule for
  // max-width:768px; only emit an override when a non-standard value is given.
  const mobileHeightCSS = mobileHeight
    ? `@media (max-width: 768px) { #${styleId} { height: ${mobileHeight} !important; aspect-ratio: auto !important; } }`
    : '';

  const inlineStyle = mobileObjPos || mobileHeightCSS
    ? `<style>${mobileObjPos}${mobileHeightCSS}</style>`
    : '';

  // Build the hero background element.
  // Using <picture><img fetchpriority="high"> instead of CSS background-image so
  // the browser connects the <link rel="preload"> hint in <head> to the actual
  // download, discovers the resource during HTML parse (not after CSS + JS), and
  // can mark it as the LCP candidate immediately. CSS background-images are opaque
  // to the preload scanner and consistently produce Poor LCP on mobile.
  let heroBgHTML;
  if (fullImage) {
    heroBgHTML = `
      <div class="hero-bg" style="position: relative; height: auto;" id="hero-parallax-bg">
        <img id="${styleId}-img" src="${safeBg}" alt="${escapeHtml(title || 'Hero')}"
             fetchpriority="high" decoding="async" loading="eager"
             style="width:100%;height:auto;display:block;" />
      </div>`;
  } else {
    const mobileSrcEl = safeMobileBg && safeMobileBg !== safeBg
      ? `<source media="(max-width: 767px)" srcset="${safeMobileBg}"${mimeType(mobileBgImage) ? ` type="${mimeType(mobileBgImage)}"` : ''} />`
      : '';
    const desktopType = mimeType(bgImage) ? ` type="${mimeType(bgImage)}"` : '';
    heroBgHTML = `
      <div class="hero-bg" id="hero-parallax-bg">
        <picture>
          ${mobileSrcEl}
          <source srcset="${safeBg}"${desktopType} />
          <img src="${safeBg}" alt="" fetchpriority="high" decoding="async" loading="eager"
               style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;" />
        </picture>
      </div>`;
  }

  return `
    ${inlineStyle}
    <section id="${styleId}" class="page-hero" style="height: ${heightValue};">
      ${heroBgHTML}

      <div class="hero-overlay"
           style="background: linear-gradient(to bottom, rgba(0,0,0,${overlayOpacity - 0.2}), rgba(0,0,0,${overlayOpacity + 0.2}));">
      </div>

      <div class="container h-full flex flex-col justify-center ${alignClass}">
        ${breadcrumbsHTML}
        ${title ? `<h1 class="display text-white shimmer-text mb-1" data-reveal="true" data-reveal-direction="up">${escapeHtml(title)}</h1>` : ''}
        ${subtitle ? `<p class="hero-subtitle text-white opacity-90 mb-0" data-reveal="true" data-reveal-direction="up" data-reveal-delay="0.2" style="font-size: 1.25rem; max-width: 600px;">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      ${extraHTML}
    ${fullImage ? `<script>(function(){ var sec=document.getElementById('${styleId}'); var img=document.getElementById('${styleId}-img'); function setH(){ if(img && sec){ sec.style.height=img.clientHeight+'px'; }} if(img){ if(img.complete) setH(); else img.addEventListener('load',setH); window.addEventListener('resize',setH); } })();</script>` : ''}
    </section>
  `;
}
