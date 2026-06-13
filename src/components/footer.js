import { churchInfo } from '../data/church-info.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderFooter(container) {
  const footerHTML = `
    <footer class="footer dark-section py-2">

      <!-- Desktop / tablet: full multi-column footer (hidden on mobile via CSS) -->
      <div class="container footer-full">
        <div class="footer-grid">

          <div class="footer-col about">
            <div class="flex items-center gap-1" style="flex-wrap: wrap; margin-bottom: 0.5rem;">
              <img src="/images/FGCI LOGO.png" alt="FGCM-KNUST Logo" style="height: 30px; width: auto; object-fit: contain;" />
              <span class="font-heading font-bold" style="font-size: 1.25rem; color: var(--color-gold);">${escapeHtml(churchInfo.shortName)}</span>
            </div>
            <p class="text-muted text-small">${escapeHtml(churchInfo.tagline)}</p>
            <p class="text-muted text-small mt-1">${escapeHtml((churchInfo.about || '').substring(0, 100))}...</p>
          </div>

          <div class="footer-col links">
            <h4 class="footer-subtitle mb-1">Quick Links</h4>
            <ul class="footer-links">
              <li><a href="#/" class="text-muted text-small hover-gold">Home</a></li>
              <li><a href="#/events" class="text-muted text-small hover-gold">Upcoming Events</a></li>
              <li><a href="#/store" class="text-muted text-small hover-gold">Merch Store</a></li>
              <li><a href="#/register" class="text-muted text-small hover-gold">Become a Member</a></li>
            </ul>
          </div>

          <div class="footer-col contact">
            <h4 class="footer-subtitle mb-1">Contact Us</h4>
            <ul class="footer-contact text-muted text-small">
              <li class="flex items-center gap-1 mb-1">
                <i data-lucide="map-pin" class="icon-sm"></i>
                <span>${escapeHtml(churchInfo.address)}</span>
              </li>
              <li class="flex items-center gap-1 mb-1">
                <i data-lucide="phone" class="icon-sm"></i>
                <span>${escapeHtml(churchInfo.phone)}</span>
              </li>
              <li class="flex items-center gap-1">
                <i data-lucide="mail" class="icon-sm"></i>
                <span>${escapeHtml(churchInfo.email)}</span>
              </li>
            </ul>
          </div>

          <div class="footer-col social">
            <h4 class="footer-subtitle mb-1">Follow Us</h4>
            <div class="social-icons flex gap-1" style="flex-wrap: wrap;">
              <a href="${escapeHtml(churchInfo.socials.facebook)}" target="_blank" rel="noopener" class="social-btn" aria-label="Facebook">
                <img src="/images/facebook.svg" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" />
              </a>
              <a href="${escapeHtml(churchInfo.socials.instagram)}" target="_blank" rel="noopener" class="social-btn" aria-label="Instagram">
                <img src="/images/instagram.svg" alt="" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" />
              </a>
              <a href="${escapeHtml(churchInfo.socials.twitter)}" target="_blank" rel="noopener" class="social-btn" aria-label="X">
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

        <div class="footer-bottom mt-3 pt-2 border-t flex justify-center items-center flex-wrap gap-1">
          <p class="text-small text-muted">&copy; ${new Date().getFullYear()} ${escapeHtml(churchInfo.name)}. All rights reserved.</p>
        </div>
      </div>

      <!-- Mobile: compact single-row footer (hidden on desktop via CSS) -->
      <div class="container footer-compact">
        <div class="footer-row">
          <div class="footer-brand">
            <img src="/images/FGCI LOGO.png" alt="${escapeHtml(churchInfo.shortName)} Logo" />
            <span class="footer-name">${escapeHtml(churchInfo.shortName)}</span>
          </div>

          <div class="footer-socials" aria-label="Social media">
            <a href="${escapeHtml(churchInfo.socials.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">
              <img src="/images/facebook.svg" alt="" />
            </a>
            <a href="${escapeHtml(churchInfo.socials.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">
              <img src="/images/instagram.svg" alt="" />
            </a>
            <a href="${escapeHtml(churchInfo.socials.twitter)}" target="_blank" rel="noopener" aria-label="X">
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
