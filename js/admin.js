/* Tree Hoppers Admin Dashboard */

const API = '/api/admin';
let apiKey = '';

// ── Tiny Markdown renderer ────────────────────────────────────────────────────
function renderMarkdown(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, '')
    .replace(/^(.+)$/gm, (line) => line.startsWith('<') ? line : `<p>${line}</p>`);
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'x-api-key': apiKey, ...(options.headers || {}) },
  });
  return res;
}

async function apiJson(url, options = {}) {
  const res = await apiFetch(url, options);
  return { ok: res.ok, status: res.status, data: await res.json() };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadLeads();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = document.getElementById('api-key-input').value.trim();
  const err = document.getElementById('login-error');

  // Verify key against a protected endpoint
  apiKey = key;
  const { ok } = await apiJson(`${API}/leads`);

  if (ok) {
    localStorage.setItem('th_admin_key', key);
    err.classList.add('hidden');
    showDashboard();
  } else {
    apiKey = '';
    err.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('th_admin_key');
  apiKey = '';
  showLogin();
});

// ── Tab navigation ────────────────────────────────────────────────────────────
const tabLoaders = { leads: loadLeads, appointments: loadAppointments, blog: loadBlog, reviews: loadReviews };

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    tabLoaders[tab]?.();
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function badge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

const SERVICE_LABELS = {
  pruning: 'Tree Pruning', removal: 'Tree Removal', fire: 'Fire Mitigation',
  storm: 'Storm Damage', consultation: 'Consultation', other: 'Other',
};

// ── LEADS ─────────────────────────────────────────────────────────────────────
async function loadLeads() {
  const list = document.getElementById('leads-list');
  list.innerHTML = '<div class="loading">Loading...</div>';

  const { ok, data } = await apiJson(`${API}/leads`);
  if (!ok) { list.innerHTML = '<div class="empty">Failed to load leads.</div>'; return; }

  const filter = document.getElementById('leads-filter').value;
  const filtered = filter === 'all' ? data : data.filter(l => l.status === filter);

  // Update badge
  const newCount = data.filter(l => l.status === 'new').length;
  const badge = document.getElementById('leads-badge');
  badge.textContent = newCount > 0 ? newCount : '';
  badge.style.display = newCount > 0 ? '' : 'none';

  if (filtered.length === 0) { list.innerHTML = '<div class="empty">No leads found.</div>'; return; }

  list.innerHTML = filtered.map(lead => `
    <div class="lead-card" id="lead-${lead.id}">
      <div class="card-top">
        <div>
          <div class="card-name">${lead.first_name} ${lead.last_name}</div>
          <div class="card-date">${formatDate(lead.created_at)}</div>
        </div>
        ${badge(lead.status)}
      </div>
      <div class="card-meta">
        <span class="meta-tag service">${SERVICE_LABELS[lead.service] || lead.service}</span>
        <span class="meta-tag">${lead.city}</span>
      </div>
      ${lead.message ? `<div class="card-message">${lead.message}</div>` : ''}
      <div class="card-actions">
        <a href="tel:${lead.phone}">${lead.phone}</a>
        <a href="mailto:${lead.email}">${lead.email}</a>
        <select class="status-select" onchange="updateLeadStatus(${lead.id}, this.value)">
          ${['new','contacted','quoted','closed'].map(s =>
            `<option value="${s}" ${lead.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
          ).join('')}
        </select>
        <input class="notes-input" placeholder="Add notes..." value="${lead.notes || ''}"
          onblur="updateLeadNotes(${lead.id}, this.value)">
      </div>
    </div>
  `).join('');
}

document.getElementById('leads-filter').addEventListener('change', loadLeads);

async function updateLeadStatus(id, status) {
  await apiJson(`${API}/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

async function updateLeadNotes(id, notes) {
  await apiJson(`${API}/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

// ── APPOINTMENTS ──────────────────────────────────────────────────────────────
async function loadAppointments() {
  const list = document.getElementById('appts-list');
  list.innerHTML = '<div class="loading">Loading...</div>';

  const { ok, data } = await apiJson(`${API}/appointments`);
  if (!ok) { list.innerHTML = '<div class="empty">Failed to load appointments.</div>'; return; }

  const filter = document.getElementById('appts-filter').value;
  const filtered = filter === 'all' ? data : data.filter(a => a.status === filter);

  if (filtered.length === 0) { list.innerHTML = '<div class="empty">No appointments found.</div>'; return; }

  list.innerHTML = filtered.map(a => `
    <div class="appt-card">
      <div class="card-top">
        <div>
          <div class="card-name">${a.first_name} ${a.last_name}</div>
          <div class="card-date">📅 ${a.preferred_date} at ${a.preferred_time}</div>
        </div>
        ${badge(a.status)}
      </div>
      <div class="card-meta">
        <span class="meta-tag service">${SERVICE_LABELS[a.service] || a.service}</span>
        <span class="meta-tag">${a.city}</span>
      </div>
      ${a.message ? `<div class="card-message">${a.message}</div>` : ''}
      <div class="card-actions">
        <a href="tel:${a.phone}">${a.phone}</a>
        <a href="mailto:${a.email}">${a.email}</a>
        <select class="status-select" onchange="updateApptStatus(${a.id}, this.value)">
          ${['pending','confirmed','completed','cancelled'].map(s =>
            `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
          ).join('')}
        </select>
      </div>
    </div>
  `).join('');
}

document.getElementById('appts-filter').addEventListener('change', loadAppointments);

async function updateApptStatus(id, status) {
  await apiJson(`${API}/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

// ── BLOG ──────────────────────────────────────────────────────────────────────
let editingPostId = null;

async function loadBlog() {
  const list = document.getElementById('blog-list');
  list.innerHTML = '<div class="loading">Loading...</div>';

  const { ok, data } = await apiJson(`${API}/blog`);
  if (!ok) { list.innerHTML = '<div class="empty">Failed to load posts.</div>'; return; }
  if (data.length === 0) { list.innerHTML = '<div class="empty">No posts yet. Create your first post!</div>'; return; }

  list.innerHTML = data.map(post => `
    <div class="blog-card-admin">
      <div class="blog-card-info">
        <h4>${post.title}</h4>
        <p>${formatDate(post.created_at)}</p>
      </div>
      <div class="blog-card-actions">
        <button class="toggle-published ${post.published ? 'published' : ''}"
          onclick="togglePublished(${post.id}, ${post.published})">
          ${post.published ? '✓ Published' : 'Draft'}
        </button>
        <button class="btn-ghost" onclick="editPost(${post.id})">Edit</button>
        <button class="btn-danger" onclick="deletePost(${post.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('new-post-btn').addEventListener('click', () => {
  editingPostId = null;
  document.getElementById('editor-title').textContent = 'New Post';
  document.getElementById('post-form').reset();
  document.getElementById('post-preview').innerHTML = '';
  document.getElementById('post-editor').classList.remove('hidden');
  document.getElementById('new-post-btn').classList.add('hidden');
});

document.getElementById('cancel-post-btn').addEventListener('click', () => {
  document.getElementById('post-editor').classList.add('hidden');
  document.getElementById('new-post-btn').classList.remove('hidden');
  editingPostId = null;
});

document.getElementById('post-content').addEventListener('input', function() {
  document.getElementById('post-preview').innerHTML = renderMarkdown(this.value);
});

document.getElementById('post-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.append('title', document.getElementById('post-title').value);
  fd.append('excerpt', document.getElementById('post-excerpt').value);
  fd.append('content', document.getElementById('post-content').value);
  fd.append('published', document.getElementById('post-published').checked);
  const img = document.getElementById('post-image').files[0];
  if (img) fd.append('image', img);

  const url = editingPostId ? `${API}/blog/${editingPostId}` : `${API}/blog`;
  const method = editingPostId ? 'PATCH' : 'POST';

  const res = await apiFetch(url, { method, body: fd });
  if (res.ok) {
    document.getElementById('post-editor').classList.add('hidden');
    document.getElementById('new-post-btn').classList.remove('hidden');
    editingPostId = null;
    loadBlog();
  } else {
    const data = await res.json();
    alert(data.errors?.join('\n') || data.error || 'Failed to save post.');
  }
});

async function editPost(id) {
  const { ok, data: posts } = await apiJson(`${API}/blog`);
  const post = posts?.find(p => p.id === id);
  if (!post) return;

  editingPostId = id;
  document.getElementById('editor-title').textContent = 'Edit Post';
  document.getElementById('post-title').value = post.title;
  document.getElementById('post-excerpt').value = post.excerpt;

  // Fetch full content
  const { data: full } = await apiJson(`/api/blog/${post.slug}`);
  if (full?.content) {
    document.getElementById('post-content').value = full.content;
    document.getElementById('post-preview').innerHTML = renderMarkdown(full.content);
  }
  document.getElementById('post-published').checked = !!post.published;
  document.getElementById('post-editor').classList.remove('hidden');
  document.getElementById('new-post-btn').classList.add('hidden');
}

async function togglePublished(id, current) {
  await apiJson(`${API}/blog/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ published: !current }),
  });
  loadBlog();
}

async function deletePost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  const { ok } = await apiJson(`${API}/blog/${id}`, { method: 'DELETE' });
  if (ok) loadBlog();
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────
async function loadReviews() {
  const list = document.getElementById('reviews-list');
  list.innerHTML = '<div class="loading">Loading...</div>';

  const { ok, data } = await apiJson('/api/reviews', { headers: { 'x-api-key': apiKey } });
  if (!ok) { list.innerHTML = '<div class="empty">Failed to load reviews.</div>'; return; }
  if (data.length === 0) { list.innerHTML = '<div class="empty">No reviews yet.</div>'; return; }

  list.innerHTML = data.map(r => `
    <div class="review-card-admin">
      <div class="review-info">
        <div class="card-name">${r.author} <span style="color:var(--gray-400);font-weight:400;font-size:0.85rem;">via ${r.source}</span></div>
        <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <div class="review-text">${r.text}</div>
      </div>
      <button class="btn-danger" onclick="deleteReview(${r.id})">Delete</button>
    </div>
  `).join('');
}

async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  const { ok } = await apiJson(`/api/reviews/${id}`, { method: 'DELETE' });
  if (ok) loadReviews();
}

// ── Init ──────────────────────────────────────────────────────────────────────
const savedKey = localStorage.getItem('th_admin_key');
if (savedKey) {
  apiKey = savedKey;
  // Verify it still works
  apiJson(`${API}/leads`).then(({ ok }) => {
    if (ok) showDashboard();
    else { localStorage.removeItem('th_admin_key'); showLogin(); }
  });
} else {
  showLogin();
}

// Expose functions called from inline event handlers
window.updateLeadStatus = updateLeadStatus;
window.updateLeadNotes = updateLeadNotes;
window.updateApptStatus = updateApptStatus;
window.togglePublished = togglePublished;
window.editPost = editPost;
window.deletePost = deletePost;
window.deleteReview = deleteReview;
