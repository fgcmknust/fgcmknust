import { renderHero } from '../components/hero.js';
import { leadersData } from '../data/leaders.js';
import { escapeHtml } from '../utils/helpers.js';

function sortedLeaders() {
  return [...leadersData].sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 999;
    const bo = Number.isFinite(b.order) ? b.order : 999;
    return ao - bo;
  });
}

function renderLeader(leader) {
  // Per-leader image controls (all optional, set in src/data/leaders.js):
  //   objectPosition  CSS object-position (e.g. "center 30%")
  //                   Defaults to "center top" so heads stay in frame.
  //   objectScale     numeric zoom (e.g. 1.4 = 140%). Useful for landscape
  //                   source photos where the face is small inside the circle
  //                   after the cover-crop. The CSS transform-origin pins the
  //                   zoom to the same focal point as object-position, so the
  //                   face stays centred while it grows.
  const objectPosition = escapeHtml(leader.objectPosition || 'center top');
  const scale = Number.isFinite(leader.objectScale) ? leader.objectScale : 1;
  const scaleStyle = scale !== 1
    ? ` transform: scale(${scale}); transform-origin: ${objectPosition};`
    : '';

  return `
    <figure class="leader" data-reveal="true" data-reveal-direction="up">
      <div class="leader-circle">
        <img src="${escapeHtml(leader.image)}"
             alt="${escapeHtml(leader.name + ' — ' + leader.role)}"
             loading="lazy" decoding="async"
             style="object-position: ${objectPosition};${scaleStyle}">
      </div>
      <figcaption class="leader-caption">
        <h3 class="leader-name">${escapeHtml(leader.name)}</h3>
        <p class="leader-role">${escapeHtml(leader.role)}</p>
        ${leader.program ? `<p class="leader-program">${escapeHtml(leader.program)}</p>` : ''}
      </figcaption>
    </figure>
  `;
}

export async function Leaders(container) {
  const leaders = sortedLeaders();

  const heroHTML = renderHero({
    title: 'Our Leadership',
    subtitle: 'Serving the family of God at FGCM-KNUST.',
    bgImage: '/images/leaders.webp',
    mobileBgImage: '/images/leaders.webp',
    // Match the home page's cinematic 16:9 hero on desktop. Mobile keeps a
    // shorter banner so the leader portraits below stay close to the fold.
    height: 'auto; aspect-ratio: 16 / 9',
    mobileHeight: '55vh',
    mobileBgSize: 'cover',
    mobileBgPosition: 'center center',
    overlayOpacity: 0.65,
    alignment: 'center'
  });

  container.innerHTML = `
    ${heroHTML}

    <section class="section bg-bg">
      <div class="container">
        <div class="text-center mb-4" data-reveal="true">
          <span class="text-gold font-bold text-small uppercase tracking-wider" style="display: block; letter-spacing: 0.18em;">FGCM-KNUST</span>
          <h2 class="mb-1 text-gold-dark mt-1">Meet the Team</h2>
          <div style="width: 60px; height: 3px; background: var(--color-gold); margin: 0.75rem auto 1rem;"></div>
          <p class="text-muted" style="max-width: 600px; margin: 0 auto; font-size: 1.05rem; line-height: 1.7;">
            God has blessed FGCM-KNUST with a passionate team of a Reverend, Pastor, Ministers and Students who give of their time, gifts, and prayers to keep the campus altar burning.
          </p>
        </div>

        <div class="leaders-wrap">
          <div class="leaders-top">
            ${leaders.slice(0, 2).map(renderLeader).join('')}
          </div>
          <div class="leaders-grid">
            ${leaders.slice(2).map(renderLeader).join('')}
          </div>
        </div>
      </div>
    </section>

    <style>
      .leaders-wrap {
        max-width: 1100px;
        margin: 0 auto;
      }
      .leaders-top {
        display: flex;
        justify-content: center;
        gap: 2.25rem 1.5rem;
        flex-wrap: wrap;
        margin-bottom: 2.25rem;
      }
      .leaders-grid {
        display: grid;
        gap: 2.25rem 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        justify-items: center;
      }
      @media (min-width: 1024px) {
        .leaders-grid { grid-template-columns: repeat(4, 1fr); }
      }

      .leader {
        margin: 0;
        padding: 0;
        text-align: center;
        max-width: 240px;
      }
      .leader-circle {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        overflow: hidden;
        margin: 0 auto 1rem;
        background: var(--color-bg-alt);
        border: 3px solid var(--color-gold);
        box-shadow:
          0 6px 20px rgba(197, 151, 62, 0.18),
          0 0 0 6px rgba(255, 255, 255, 0.7) inset;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
      }
      .leader:hover .leader-circle {
        transform: translateY(-3px);
        box-shadow:
          0 12px 28px rgba(197, 151, 62, 0.28),
          0 0 0 6px rgba(255, 255, 255, 0.7) inset;
      }
      .leader-circle img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        /* Sharp, retina-friendly rendering. -webkit-optimize-contrast keeps
           Safari/iOS from over-smoothing the portrait; the GPU compositor
           hint (translateZ) prevents subpixel blur on downscale. */
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
        transform: translateZ(0);
        display: block;
      }

      .leader-caption { padding: 0 0.25rem; }
      .leader-name {
        font-family: var(--font-heading);
        font-weight: 700;
        font-size: 1.1rem;
        line-height: 1.25;
        margin: 0 0 0.25rem;
        color: var(--color-text);
      }
      .leader-role {
        color: var(--color-gold);
        font-weight: 700;
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin: 0 0 0.35rem;
      }
      .leader-program {
        color: var(--color-text-muted);
        font-size: 0.85rem;
        font-style: italic;
        line-height: 1.4;
        margin: 0;
      }

      @media (max-width: 768px) {
        .leaders-top {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          justify-items: center;
          gap: 1.75rem 1rem;
          margin-bottom: 1.75rem;
        }
        .leaders-grid {
          gap: 1.75rem 1rem;
          grid-template-columns: repeat(2, 1fr);
        }
        .leader-circle {
          width: 150px;
          height: 150px;
          border-width: 2px;
          box-shadow:
            0 4px 14px rgba(197, 151, 62, 0.18),
            0 0 0 4px rgba(255, 255, 255, 0.65) inset;
        }
        .leader-name { font-size: 1rem; }
      }
    </style>
  `;

  if (window.lucide) lucide.createIcons({ root: container });
}
