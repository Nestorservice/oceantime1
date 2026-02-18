/**
 * TimeMaster App v3 — Auth + Blue theme
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[TimeMaster] Init v3');

  // ── Auth Guard ── (skip on login/register pages)
  const path = window.location.pathname;
  const isAuthPage = path.includes('login.html') || path.includes('register.html');
  if (!isAuthPage && !API.isLoggedIn()) {
    window.location.href = '/login.html';
    return;
  }

  // ── PerfectScrollbar fix — add dummy elements for template ──
  ['dlab-demo-content', 'chatbox-msg-area'].forEach(cls => {
    if (!document.querySelector('.' + cls)) {
      const el = document.createElement('div');
      el.className = cls;
      el.style.cssText = 'display:none;position:absolute;left:-9999px';
      document.body.appendChild(el);
    }
  });

  // ── Show user name + logout ──
  if (!isAuthPage) {
    const user = API.getUser();
    const greetEl = document.getElementById('greeting-text');
    if (greetEl && user) {
      const h = new Date().getHours();
      const icon = h < 12 ? 'fa-sun' : h < 18 ? 'fa-cloud-sun' : 'fa-moon';
      const text = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
      greetEl.innerHTML = `<i class="fas ${icon} me-2"></i>${text}, ${user.name} !`;
    }
    // Add logout button to sidebar
    const sidebar = document.querySelector('.metismenu');
    if (sidebar && user) {
      const logoutLi = document.createElement('li');
      logoutLi.style.marginTop = '1rem';
      logoutLi.innerHTML = `<a href="#" onclick="API.logout();return false" style="color:rgba(255,255,255,.7)">
        <i class="fas fa-sign-out-alt" style="color:rgba(255,255,255,.5)"></i>
        <span class="nav-text">Déconnexion</span>
      </a>`;
      sidebar.appendChild(logoutLi);
    }
  }

  // ── Hide template floating widgets ──
  const hideStyle = document.createElement('style');
  hideStyle.textContent = `
    .chatbox,.bell-box,.wallet-bar,.support-toggle,.dz-theme-mode,.dz-demo-panel,
    .btn-buy,.purchase-popup,[class*="chatbox"],[class*="support"],[class*="wallet-bar"],
    body>.btn.btn-primary.btn-rounded,body>a.btn.btn-primary,
    #main-wrapper~.btn,#main-wrapper~a.btn,#main-wrapper~div:not(script):not(#preloader){
      display:none!important;visibility:hidden!important;width:0!important;height:0!important;
      position:absolute!important;left:-9999px!important;pointer-events:none!important;
    }`;
  document.head.appendChild(hideStyle);

  // Actively remove dynamically injected template elements
  function killFloatingWidgets() {
    document.querySelectorAll('.chatbox,.support-toggle,.bell-box,.wallet-bar,.dz-theme-mode,.dz-demo-panel,.purchase-popup').forEach(el => el.remove());
    // Remove any fixed-position buttons/links outside main-wrapper
    const mainWrapper = document.getElementById('main-wrapper');
    if (mainWrapper) {
      let sibling = mainWrapper.nextElementSibling;
      while (sibling) {
        const next = sibling.nextElementSibling;
        const tag = sibling.tagName.toLowerCase();
        if (tag !== 'script' && sibling.id !== 'preloader') {
          sibling.remove();
        }
        sibling = next;
      }
    }
  }
  // Run immediately and watch for new additions
  killFloatingWidgets();
  setTimeout(killFloatingWidgets, 500);
  setTimeout(killFloatingWidgets, 1500);
  new MutationObserver(killFloatingWidgets).observe(document.body, { childList: true, subtree: false });

  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Service Worker enregistré');
    } catch (e) {
      console.warn('[SW] Erreur:', e.message);
    }
  }

  // 2. Notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      console.log('[Notification] Permission:', perm);
    });
  }

  // 3. Init TTS
  if (typeof TTS !== 'undefined') TTS.init();

  // 4. Start alarm
  if (typeof AlarmService !== 'undefined') AlarmService.start();

  // 5. SW messages
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SNOOZE') {
        console.log('[SW] Snooze reçu:', event.data.minutes, 'min');
      }
    });
  }

  // 6. Init current page
  if (!isAuthPage) initCurrentPage();
});

function initCurrentPage() {
  const path = window.location.pathname;
  if (path === '/' || path.includes('index.html')) initDashboard();
  else if (path.includes('tasks.html')) initTasksPage();
  else if (path.includes('calendar.html')) initCalendarPage();
  else if (path.includes('pomodoro.html')) initPomodoroPage();
  else if (path.includes('statistics.html')) initStatsPage();
  else if (path.includes('settings.html')) initSettingsPage();
}

// ═══════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════
async function initDashboard() {
  console.log('[Page] Dashboard');
  await Promise.all([
    loadTodayTasks(),
    loadNextAlarm(),
    loadQuickStats(),
    loadPomodoroWidget(),
  ]);
}

async function loadTodayTasks() {
  const container = document.getElementById('today-tasks');
  if (!container) return;

  try {
    const tasks = await API.getTasksToday();
    if (tasks.length === 0) {
      container.innerHTML = `<div class="text-center text-muted p-4">
                <i class="fas fa-check-circle fa-3x mb-3" style="color:#4DA8DA"></i>
                <p>Aucune tâche aujourd'hui</p>
            </div>`;
      return;
    }

    container.innerHTML = tasks.map(task => `
            <div class="task-item d-flex align-items-center p-3 border-bottom" data-id="${task.id}">
                <div class="task-check me-3">
                    <input type="checkbox" class="form-check-input" ${task.status === 'completed' ? 'checked' : ''}
                           onchange="toggleTaskStatus(${task.id}, this.checked)" style="cursor:pointer">
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0 ${task.status === 'completed' ? 'text-decoration-line-through text-muted' : ''}">
                        ${task.title}
                    </h6>
                    <small class="text-muted">
                        ${task.due_time || ''}
                        <span class="badge ms-1" style="background:${task.category_color || '#64748b'};font-size:0.7rem">${task.category_name || ''}</span>
                    </small>
                </div>
                <div class="task-priority">
                    ${priorityBadge(task.priority)}
                </div>
                ${task.voice_reminder ? '<i class="fas fa-volume-up text-primary ms-2" title="Rappel vocal actif"></i>' : ''}
            </div>
        `).join('');
  } catch (e) {
    container.innerHTML = '<p class="text-danger p-3">Erreur de chargement</p>';
  }
}

async function loadNextAlarm() {
  const container = document.getElementById('next-alarm');
  if (!container) return;

  try {
    const tasks = await API.getUpcomingTasks();
    if (tasks.length === 0) {
      container.innerHTML = `
                <div class="text-center p-3">
                    <i class="fas fa-bell-slash fa-2x text-muted mb-2"></i>
                    <p class="text-muted mb-0">Aucune alarme à venir</p>
                </div>`;
      return;
    }

    const next = tasks[0];
    const taskTime = new Date(`${next.due_date}T${next.due_time}`);
    const diff = taskTime - Date.now();
    const mins = Math.max(0, Math.floor(diff / 60000));
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;

    container.innerHTML = `
            <div class="text-center p-3">
                <div class="alarm-countdown mb-2">
                    <span class="display-4 fw-bold" style="color:#1E3A5F">${hrs > 0 ? hrs + 'h ' : ''}${remainMins}min</span>
                </div>
                <h5 class="mb-1">${next.title}</h5>
                <p class="text-muted mb-0">
                    <i class="fas fa-clock"></i> ${next.due_time}
                    <span class="badge ms-1" style="background:${next.category_color || '#64748b'}">${next.category_name || ''}</span>
                </p>
            </div>`;

    setInterval(() => loadNextAlarm(), 60000);
  } catch (e) {
    container.innerHTML = '<p class="text-muted p-3">—</p>';
  }
}

async function loadQuickStats() {
  const container = document.getElementById('quick-stats');
  if (!container) return;

  try {
    const stats = await API.getStatsDaily();
    const total = stats.total || 0;
    const completed = stats.completed || 0;
    const pending = stats.pending || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    container.innerHTML = `
            <div class="row text-center">
                <div class="col-4">
                    <h3 class="mb-0" style="color:#1E3A5F">${total}</h3>
                    <small class="text-muted">Total</small>
                </div>
                <div class="col-4">
                    <h3 class="mb-0" style="color:#4DA8DA">${completed}</h3>
                    <small class="text-muted">Terminées</small>
                </div>
                <div class="col-4">
                    <h3 class="mb-0" style="color:#F39C12">${pending}</h3>
                    <small class="text-muted">En attente</small>
                </div>
            </div>
            <div class="progress mt-3" style="height:8px;border-radius:4px">
                <div class="progress-bar" style="width:${pct}%;background:linear-gradient(90deg,#1E3A5F,#4DA8DA)"></div>
            </div>
            <small class="text-muted d-block text-center mt-1">${pct}% accompli</small>
        `;
  } catch (e) {
    container.innerHTML = '<p class="text-muted p-3">—</p>';
  }
}

async function loadPomodoroWidget() {
  const container = document.getElementById('pomodoro-widget');
  if (!container) return;

  try {
    const stats = await API.getPomodoroStats();
    const today = stats.today || {};
    container.innerHTML = `
            <div class="text-center p-3">
                <div class="pomodoro-circle mb-3" id="mini-pomodoro-circle">
                    <span class="pomodoro-time">25:00</span>
                </div>
                <button class="btn btn-sm" style="background:#1E3A5F;color:#fff;border-radius:2rem;padding:.4rem 1.2rem" onclick="window.location.href='/pomodoro.html'">
                    <i class="fas fa-play"></i> Lancer
                </button>
                <p class="text-muted mt-2 mb-0">
                    <strong>${today.completed || 0}</strong> sessions
                    (${today.total_minutes || 0} min)
                </p>
            </div>
        `;
  } catch (e) {
    container.innerHTML = '<p class="text-muted p-3">—</p>';
  }
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function priorityBadge(priority) {
  const map = {
    3: '<span class="badge bg-danger">Urgent</span>',
    2: '<span class="badge bg-warning text-dark">Normal</span>',
    1: '<span class="badge bg-info">Basse</span>',
  };
  return map[priority] || map[2];
}

async function toggleTaskStatus(id, completed) {
  await API.updateTask(id, { status: completed ? 'completed' : 'pending' });
  loadTodayTasks();
  loadQuickStats();
}
