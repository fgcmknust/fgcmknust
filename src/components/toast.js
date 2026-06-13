export function showToast(message, type = 'success') {
  // Create container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed flex flex-col gap-1';
    container.style.cssText = 'bottom: 2rem; right: 2rem; z-index: 9999;';
    document.body.appendChild(container);
  }

  // Determine styles based on type
  let icon = 'check-circle';
  let bgColor = 'var(--color-surface)';
  let textColor = 'var(--color-text)';
  let borderLeft = '4px solid var(--color-success)';

  if (type === 'error') {
    icon = 'alert-circle';
    borderLeft = '4px solid var(--color-error)';
  } else if (type === 'info') {
    icon = 'info';
    borderLeft = '4px solid var(--color-gold)';
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast flex items-center gap-1 p-2 rounded shadow-lg';
  toast.style.cssText = `background: ${bgColor}; color: ${textColor}; border-left: ${borderLeft}; min-width: 250px; transform: translateX(120%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;`;

  const iconEl = document.createElement('i');
  iconEl.setAttribute('data-lucide', icon);
  iconEl.style.cssText = 'width: 20px; height: 20px; ' + (type === 'success' ? 'color: var(--color-success)' : type === 'error' ? 'color: var(--color-error)' : 'color: var(--color-gold)');

  const msgSpan = document.createElement('span');
  msgSpan.className = 'text-small font-medium flex-1';
  msgSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close text-muted';
  closeBtn.style.cssText = 'background:none; border:none; cursor:pointer;';
  closeBtn.innerHTML = '<i data-lucide="x" style="width: 16px; height: 16px;"></i>';

  toast.appendChild(iconEl);
  toast.appendChild(msgSpan);
  toast.appendChild(closeBtn);

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ root: toast });

  // Animate in (small delay to allow DOM render)
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);

  // Close logic
  const close = () => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', close);

  // Auto-close after 3 seconds
  setTimeout(close, 3000);
}
