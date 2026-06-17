import { churchInfo } from '../data/church-info.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderFooter(container) {
  const footerHTML = `
    <footer class="footer dark-section py-2">

      <!-- Desktop / tablet: compact, centered, single-column footer -->
      <div class="container footer-full footer-narrow">
        <div class="footer-stack">

          <div class="footer-col about footer-centered">
            <div class="flex items-center justify-center gap-1" style="margin-bottom: 0.4rem;">
              <img src="/images/FGCI LOGO.png" alt="FGCM-KNUST Logo" width="30" height="30" decoding="async" loading="lazy" style="height: 30px; width: auto; object-fit: contain;" />
              <span class="font-heading font-bold" style="font-size: 1.25rem; color: var(--color-gold);">${escapeHtml(churchInfo.shortName)}</span>
            </div>
            <p class="text-muted text-small mb-0">${escapeHtml(churchInfo.tagline)}</p>
          </div>

          <div class="footer-col social footer-centered">
            <h4 class="footer-subtitle mb-1">Follow Us</h4>
            <div class="social-icons flex gap-1 justify-center" style="flex-wrap: wrap;">
              <a href="${escapeHtml(churchInfo.socials.facebook)}" target="_blank" rel="noopener" class="social-btn" aria-label="Facebook">
                <img src="/images/facebook.svg" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" />
              </a>
              <a href="${escapeHtml(churchInfo.socials.instagram)}" target="_blank" rel="noopener" class="social-btn" aria-label="Instagram">
                <img src="/images/instagram.svg" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" />
              </a>
              <a href="${escapeHtml(churchInfo.socials.twitter)}" target="_blank" rel="noopener" class="social-btn" aria-label="X (Twitter)">
                <img src="/images/x.svg" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" />
              </a>
              <a href="${escapeHtml(churchInfo.socials.youtube)}" target="_blank" rel="noopener" class="social-btn" aria-label="YouTube">
                <img src="/images/youtube.svg" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" />
              </a>
              <a href="${escapeHtml(churchInfo.socials.tiktok)}" target="_blank" rel="noopener" class="social-btn" aria-label="TikTok">
                <img src="/images/tiktok.svg" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" />
              </a>
              <a href="${escapeHtml(churchInfo.socials.threads)}" target="_blank" rel="noopener" class="social-btn" aria-label="Threads">
                <img src="/images/threads.svg" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" />
              </a>
            </div>
          </div>

        </div>

        <div class="footer-bottom mt-2 pt-1 flex justify-center items-center flex-wrap gap-1">
          <p class="text-small text-muted mb-0">&copy; ${new Date().getFullYear()} ${escapeHtml(churchInfo.name)}. All rights reserved.</p>
        </div>
      </div>

      <!-- Mobile: compact single-row footer (hidden on desktop via CSS) -->
      <div class="container footer-compact">
        <div class="footer-row">
          <div class="footer-brand">
            <img src="/images/FGCI LOGO.png" alt="${escapeHtml(churchInfo.shortName)} Logo" width="30" height="30" decoding="async" loading="lazy" />
            <span class="footer-name">${escapeHtml(churchInfo.shortName)}</span>
          </div>

          <div class="footer-socials" aria-label="Social media">
            <a href="${escapeHtml(churchInfo.socials.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">
              <img src="/images/facebook.svg" alt="" />
            </a>
            <a href="${escapeHtml(churchInfo.socials.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">
              <img src="/images/instagram.svg" alt="" />
            </a>
            <a href="${escapeHtml(churchInfo.socials.twitter)}" target="_blank" rel="noopener" aria-label="X (Twitter)">
              <img src="/images/x.svg" alt="" />
            </a>
            <a href="${escapeHtml(churchInfo.socials.youtube)}" target="_blank" rel="noopener" aria-label="YouTube">
              <img src="/images/youtube.svg" alt="" />
            </a>
            <a href="${escapeHtml(churchInfo.socials.tiktok)}" target="_blank" rel="noopener" aria-label="TikTok">
              <img src="/images/tiktok.svg" alt="" />
            </a>
          </div>

          <p class="footer-copy">&copy; ${new Date().getFullYear()} ${escapeHtml(churchInfo.shortName)}</p>
        </div>
      </div>
    </footer>
  `;

  container.innerHTML = footerHTML;

  if (window.lucide) {
    lucide.createIcons({ root: container });
  }
}
