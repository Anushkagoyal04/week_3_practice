const API = 'http://127.0.0.1:8000/api';

// ── Token helpers ──────────────────────────────────────
function getAccess()  { return localStorage.getItem('access'); }
function getRefresh() { return localStorage.getItem('refresh'); }
function saveTokens(access, refresh) {
  localStorage.setItem('access', access);
  localStorage.setItem('refresh', refresh);
}
function clearTokens() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}

// ── Authenticated fetch with auto-refresh ──────────────
async function authFetch(url, options = {}) {
  options.headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAccess()}`
  };

  let res = await fetch(url, options);

  // If access token expired, try refreshing it
  if (res.status === 401) {
    const refreshRes = await fetch(`${API}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: getRefresh() })
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      saveTokens(data.access, getRefresh());
      options.headers['Authorization'] = `Bearer ${data.access}`;
      res = await fetch(url, options);   // retry original request
    } else {
      logout();  // refresh also expired → force re-login
      return null;
    }
  }

  return res;
}

// ── Auth ───────────────────────────────────────────────
async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  const res = await fetch(`${API}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  if (res.ok) {
    showMsg('Registered! Please login.', true);
    showLogin();
  } else {
    const err = await res.json();
    showMsg(JSON.stringify(err), false);
  }
}

async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  const res = await fetch(`${API}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (res.ok) {
    const data = await res.json();
    saveTokens(data.access, data.refresh);
    showTaskSection();
    loadTasks();
  } else {
    showMsg('Login failed. Check credentials.', false);
  }
}

function logout() {
  clearTokens();
  document.getElementById('task-section').classList.add('hidden');
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('task-list').innerHTML = '';
}

// ── Tasks ──────────────────────────────────────────────
async function loadTasks() {
  const res = await authFetch(`${API}/tasks/`);
  if (!res || !res.ok) return;
  const tasks = await res.json();
  renderTasks(tasks);
}

async function createTask() {
  const title       = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const status      = document.getElementById('task-status').value;

  if (!title) return showMsg('Title is required.', false);

  const res = await authFetch(`${API}/tasks/`, {
    method: 'POST',
    body: JSON.stringify({ title, description, status })
  });

  if (res && res.ok) {
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    showMsg('Task created!', true);
    loadTasks();
  }
}

async function updateStatus(id, status) {
  await authFetch(`${API}/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  loadTasks();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await authFetch(`${API}/tasks/${id}/`, { method: 'DELETE' });
  showMsg('Task deleted.', true);
  loadTasks();
}

function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  if (tasks.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#888;margin-top:1rem">No tasks yet. Add one above!</p>';
    return;
  }

  list.innerHTML = tasks.map(t => `
    <div class="task-card">
      <h4>${escHtml(t.title)}</h4>
      <p>${escHtml(t.description || '—')}</p>
      <span class="badge badge-${t.status}">${t.status.replace('_', ' ')}</span>
      <div class="task-actions">
        <select onchange="updateStatus(${t.id}, this.value)">
          <option value="todo"        ${t.status==='todo'        ?'selected':''}>To Do</option>
          <option value="in_progress" ${t.status==='in_progress' ?'selected':''}>In Progress</option>
          <option value="done"        ${t.status==='done'        ?'selected':''}>Done</option>
        </select>
        <button class="btn-danger" onclick="deleteTask(${t.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

// ── UI helpers ─────────────────────────────────────────
function showRegister() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
}
function showLogin() {
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
}
function showTaskSection() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('task-section').classList.remove('hidden');
}
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

let msgTimer;
function showMsg(text, success) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.className = success ? 'msg-success' : 'msg-error';
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => el.className = '', 3000);
}

// ── On page load: auto-restore session ────────────────
window.onload = () => {
  if (getAccess()) {
    showTaskSection();
    loadTasks();
  }
};