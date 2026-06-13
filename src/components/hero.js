import { escapeHtml } from '../utils/helpers.js';

export function renderHero(options) {
  const {
    title,
    subtitle,
    bgImage = '/images/Keepers.jpg',
    mobileBgImage,
    height = 'auto; aspect-ratio: 16 / 9',
    mobileHeight,
    mobileBgSize,
    mobileBgPosition,
    overlayOpacity = 0.6,
    alignment = 'center',
    breadcrumbs = [],
    extraHTML = ''
  } = options;
  const fullImage = options.fullImage || false;

  // Sanitize anything that ends up inside a CSS url('...') string.
  const safeCssUrl = (s) => encodeURI(String(s || '').replace(/['"\\\s)<>]/g, ''));
  const safeBg = safeCssUrl(bgImage);
  const safeMobileBg = mobileBgImage ? safeCssUrl(mobileBgImage) : '';

  let breadcrumbsHTML = '';
  if (breadcrumbs.length > 0) {
    breadcrumbsHTML = `
      <div class="breadcrumbs text-small text-gold-light mb-2">
        ${breadcrumbs.map((crumb, idx) => `
          ${idx > 0 ? '<span class="mx-1 opacity-50">/</span>' : ''}
          ${crumb.link ? `<a href="${escapeHtml(crumb.link)}" class="text-white hover-gold">${escapeHtml(crumb.label)}</a>` : `<span>${escapeHtml(crumb.label)}</span>`}
        `).join('')}
      </div>
    `;
  }

  const alignClass = alignment === 'center' ? 'items-center text-center' : 'items-start text-left';
  const styleId = `hero-style-${Math.random().toString(36).substr(2, 9)}`;
  const heightValue = fullImage ? 'auto' : height;

  const mobileBgImageCSS = (safeMobileBg || mobileHeight || mobileBgSize || mobileBgPosition) ? `
    @media (max-width: 768px) {
      ${safeMobileBg ? `#${styleId} .hero-bg { background-image: url('${safeMobileBg}') !important; }` : ''}
      ${mobileHeight ? `#${styleId} { height: ${mobileHeight} !important; aspect-ratio: auto !important; }` : ''}
      ${mobileBgSize ? `#${styleId} .hero-bg { background-size: ${mobileBgSize} !important; }` : ''}
      ${mobileBgPosition ? `#${styleId} .hero-bg { background-position: ${mobileBgPosition} !important; }` : ''}
    }
  ` : '';

  return `
    <style>${mobileBgImageCSS}</style>
    <section id="${styleId}" class="page-hero" style="height: ${heightValue};">
      <div class="hero-bg"
           style="${fullImage ? 'position: relative; height: auto; background-image: none;' : `background-image: url('${safeBg}');`}"
           id="hero-parallax-bg">
        ${fullImage ? `<img id="${styleId}-img" src="${safeBg}" alt="${escapeHtml(title || 'Hero')}" style="width:100%;height:auto;display:block;" />` : ''}
      </div>

      <div class="hero-overlay"
           style="background: linear-gradient(to bottom, rgba(0,0,0,${overlayOpacity - 0.2}), rgba(0,0,0,${overlayOpacity + 0.2}));">
      </div>

      <div class="container h-full flex flex-col justify-center ${alignClass}">
        ${breadcrumbsHTML}
        ${title ? `<h1 class="display text-white shimmer-text mb-1" data-reveal="true" data-reveal-direction="up">${escapeHtml(title)}</h1>` : ''}
        ${subtitle ? `<p class="hero-subtitle text-white opacity-90 mb-0" data-reveal="true" data-reveal-direction="up" data-reveal-delay="0.2" style="font-size: 1.25rem; max-width: 600px;">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      ${extraHTML}
    ${fullImage ? `<script> (function(){ const sec=document.getElementById('${styleId}'); const img=document.getElementById('${styleId}-img'); function setH(){ if(img && sec){ sec.style.height = img.clientHeight + 'px'; }} if(img){ if(img.complete) setH(); else img.addEventListener('load', setH); window.addEventListener('resize', setH); } })();</script>` : ''}
    </section>
  `;
}
