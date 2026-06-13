export async function AdminDashboard(container) {
  const token = sessionStorage.getItem('adminToken');
  if (!token) {
    window.location.hash = '#/admin/login';
    return;
  }

  // Admin layout template
  container.innerHTML = `
    <div class="admin-layout" style="display: flex; min-height: 100vh; background: var(--color-bg-alt);">
      <!-- Sidebar -->
      <aside style="width: 250px; background: white; border-right: 1px solid rgba(0,0,0,0.1); padding: 2rem 1rem; display: flex; flex-direction: column;">
        <div style="margin-bottom: 2rem; text-align: center;">
          <img src="/images/FGCI LOGO.png" alt="Logo" style="height: 50px; margin-bottom: 1rem;">
          <h3 class="font-heading font-bold" style="font-size: 1.2rem;">Admin Portal</h3>
        </div>
        
        <nav class="flex flex-col gap-1">
          <a href="#/admin" class="btn w-full text-left" style="background: var(--color-gold); color: white;">Dashboard</a>
          <a href="#/admin/events" class="btn btn-outline w-full text-left">Manage Events</a>
          <a href="#/admin/products" class="btn btn-outline w-full text-left">Manage Merch</a>
        </nav>
        
        <button id="admin-logout-btn" class="btn btn-outline w-full mt-auto" style="border-color: #dc3545; color: #dc3545;">Logout</button>
      </aside>
      
      <!-- Main Content -->
      <main style="flex: 1; padding: 2rem;">
        <h1 class="display text-gold mb-3" style="font-size: 2.5rem;">Welcome, Admin</h1>
        <p class="text-muted mb-4">Manage your church website content from here. Changes will reflect instantly on the public website.</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
          <div class="card p-3 text-center hover-lift">
            <h3 class="display text-gold" style="font-size: 3rem;" id="stat-events">-</h3>
            <p class="font-semibold text-muted">Total Events</p>
            <a href="#/admin/events" class="btn btn-outline btn-sm mt-2">View Events</a>
          </div>
          
          <div class="card p-3 text-center hover-lift">
            <h3 class="display text-gold" style="font-size: 3rem;" id="stat-products">-</h3>
            <p class="font-semibold text-muted">Total Products</p>
            <a href="#/admin/products" class="btn btn-outline btn-sm mt-2">View Products</a>
          </div>
        </div>
      </main>
    </div>
  `;

  // Logout handler
  document.getElementById('admin-logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('adminToken');
    window.location.hash = '#/';
    window.location.reload(); // Reload to restore navbar/footer
  });

  // Fetch quick stats
  try {
    const [eventsRes, productsRes] = await Promise.all([
      fetch('/api/events'),
      fetch('/api/products')
    ]);
    
    if (eventsRes.ok) {
      const events = await eventsRes.json();
      document.getElementById('stat-events').textContent = events.length;
    }
    
    if (productsRes.ok) {
      const products = await productsRes.json();
      document.getElementById('stat-products').textContent = products.length;
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}
