export function showLoader(containerId = 'page-content') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col justify-center items-center w-full';
  wrapper.style.minHeight = '50vh';

  const spinner = document.createElement('div');
  spinner.className = 'loader-spinner';
  spinner.style.cssText = 'width: 40px; height: 40px; border: 3px solid rgba(197,151,62,0.2); border-top-color: var(--color-gold); border-radius: 50%; animation: spin 1s linear infinite;';

  const p = document.createElement('p');
  p.className = 'text-small text-muted mt-2';
  p.textContent = 'Loading...';

  wrapper.appendChild(spinner);
  wrapper.appendChild(p);
  container.appendChild(wrapper);

  const style = document.createElement('style');
  style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
  container.appendChild(style);
}

export function showModal(title, contentHTML) {
  // Remove existing modal if any
  const existing = document.getElementById('global-modal');
  if (existing) existing.remove();

  // Build DOM to avoid injecting title directly
  const modal = document.createElement('div');
  modal.id = 'global-modal';
  modal.className = 'position-fixed w-full h-full flex justify-center items-center';
  modal.style.cssText = 'top: 0; left: 0; z-index: 1000; padding: 1rem;';

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop position-absolute w-full h-full';
  backdrop.style.cssText = 'background: rgba(0,0,0,0.6); top: 0; left: 0; backdrop-filter: blur(8px);';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content bg-white p-4 rounded shadow-lg position-relative';
  modalContent.style.cssText = 'width: min(1100px, 96%); max-width: 1100px; max-height: calc(100vh - 80px); overflow: auto; box-sizing: border-box; z-index: 1001; transform: scale(0.9); opacity: 0; transition: all 0.3s ease;';

  const header = document.createElement('div');
  header.className = 'flex justify-between items-center mb-2';

  const h3 = document.createElement('h3');
  h3.className = 'mb-0';
  h3.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.id = 'modal-close';
  closeBtn.style.cssText = 'background:none; border:none; cursor:pointer;';
  closeBtn.className = 'text-muted';
  closeBtn.innerHTML = '<i data-lucide="x"></i>';

  header.appendChild(h3);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';
  // contentHTML is allowed to be HTML (already sanitized where used)
  body.innerHTML = contentHTML;

  modalContent.appendChild(header);
  modalContent.appendChild(body);

  modal.appendChild(backdrop);
  modal.appendChild(modalContent);

  document.body.appendChild(modal);
  if (window.lucide) lucide.createIcons({ root: modal });

  document.body.classList.add('no-scroll');

  // Animate in
  setTimeout(() => {
    modalContent.style.transform = 'scale(1)';
    modalContent.style.opacity = '1';
  }, 10);

  // Ensure modal body elements don't cause layout overflow and keep buttons visible
  const modalBody = modal.querySelector('.modal-body');
  if (modalBody) {
    modalBody.style.maxHeight = 'calc(100vh - 220px)';
    modalBody.style.overflow = 'auto';
  }

  const close = () => {
    modalContent.style.transform = 'scale(0.9)';
    modalContent.style.opacity = '0';
    document.body.classList.remove('no-scroll');
    setTimeout(() => modal.remove(), 300);
  };

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  
  // Attach close function to window so inner buttons can call it
  window.closeModal = close;
}
