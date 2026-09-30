const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
let currentUser = null;
let currentContent = null;
let activeView = 'dashboard';
let toastTimer;

const icons = {
  dashboard: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
  overview: '<path d="M4 19V5m0 14h16"/><path d="m7 15 4-4 3 2 5-6"/><path d="M16 7h3v3"/>',
  profile: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-3.4 3.1-5 7-5s6.5 1.6 7 5"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  settings: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3.1-1.3v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 3.1Z"/>',
  logout: '<path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formattedDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function authMarkup(mode, error = '') {
  const isRegister = mode === 'register';
  return `
    <section class="auth-layout">
      <aside class="auth-visual">
        <a class="wordmark" href="/" aria-label="Orange home"><span class="brand-mark">o.</span> orange</a>
        <div class="visual-copy">
          <p class="visual-kicker">A little more in balance</p>
          <h1>Make room<br>for good<br>work.</h1>
          <p>A considered space for the details that keep your day moving.</p>
        </div>
        <div class="visual-foot"><span></span> Your own corner of the internet</div>
      </aside>
      <section class="auth-panel">
        <div class="auth-box">
          <a class="wordmark mobile-wordmark" href="/" aria-label="Orange home"><span class="brand-mark">o.</span> orange</a>
          <p class="eyebrow">${isRegister ? 'A fresh start' : 'Welcome back'}</p>
          <h2>${isRegister ? 'Create your account' : 'Sign in'}</h2>
          <p class="auth-subtitle">${isRegister ? 'A few details and your workspace is ready.' : 'Your workspace is right where you left it.'}</p>
          <form class="auth-form" id="auth-form" novalidate>
            ${isRegister ? `<div class="field"><label for="display-name">Your name</label><input id="display-name" name="displayName" autocomplete="name" placeholder="Jordan Lee" minlength="2" maxlength="60" required></div>` : ''}
            <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required></div>
            <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="${isRegister ? 'At least 8 characters' : 'Your password'}" minlength="8" maxlength="72" required></div>
            <p class="form-error" id="form-error" role="alert">${escapeHtml(error)}</p>
            <button class="primary-button" type="submit">${isRegister ? 'Create account' : 'Sign in'} ${icon('arrow')}</button>
          </form>
          <p class="auth-switch">${isRegister ? 'Already have an account?' : 'New around here?'} <button class="text-button" id="auth-switch" type="button">${isRegister ? 'Sign in' : 'Create an account'}</button></p>
        </div>
      </section>
    </section>`;
}

function renderAuth(mode = 'login', error = '') {
  app.innerHTML = authMarkup(mode, error);
  document.querySelector('#auth-switch').addEventListener('click', () => renderAuth(mode === 'login' ? 'register' : 'login'));
  document.querySelector('#auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const errorLabel = document.querySelector('#form-error');
    const values = Object.fromEntries(new FormData(form));
    button.disabled = true;
    button.textContent = isWorkingLabel(mode);
    errorLabel.textContent = '';
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const result = await api(endpoint, { method: 'POST', body: JSON.stringify(values) });
      currentUser = result.user;
      currentContent = result.content;
      activeView = 'dashboard';
      renderDashboard();
      showToast(mode === 'register' ? 'Your account is ready.' : 'Welcome back.');
    } catch (error) {
      errorLabel.textContent = error.message;
      button.disabled = false;
      button.innerHTML = `${mode === 'register' ? 'Create account' : 'Sign in'} ${icon('arrow')}`;
    }
  });
}

function isWorkingLabel(mode) {
  return mode === 'register' ? 'Creating your account…' : 'Signing in…';
}

function navigation() {
  const labels = currentContent.navigation;
  const items = [
    ['dashboard', labels.dashboard], ['overview', labels.overview], ['profile', labels.profile],
    ['about', labels.about], ['settings', labels.settings], ['content', labels.content],
  ];
  return items.map(([key, label]) => `
    <button class="nav-link ${activeView === key ? 'active' : ''}" type="button" data-view="${key}" ${activeView === key ? 'aria-current="page"' : ''}>
      ${icon(key)}<span>${label}</span>
    </button>`).join('');
}

function pageHeading(title, subtitle, eyebrow = currentContent.dashboard.eyebrow) {
  return `<header class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${subtitle}</p></div>${activeView === 'dashboard' ? `<span class="date-label">${formattedDate(new Date())}</span>` : ''}</header>`;
}

function dashboardContent() {
  const copy = currentContent.dashboard;
  const memberSince = formattedDate(currentUser.createdAt);
  return `
    ${pageHeading(escapeHtml(copy.greeting.replaceAll('{name}', currentUser.displayName.split(' ')[0])), escapeHtml(copy.subtitle), escapeHtml(copy.eyebrow))}
    <section class="dashboard-grid" aria-label="${escapeHtml(copy.summaryLabel)}">
      <article class="dash-card">
        <div class="card-top"><span class="card-title">${escapeHtml(copy.profileCard)}</span><span class="card-icon">${icon('profile')}</span></div>
        <p class="card-value">${escapeHtml(currentUser.displayName)}</p>
        <p class="card-detail">${escapeHtml(currentUser.email)}</p>
        <button class="card-link" data-view="profile" type="button">${escapeHtml(copy.profileAction)} ${icon('arrow')}</button>
      </article>
      <article class="dash-card">
        <div class="card-top"><span class="card-title">${escapeHtml(copy.memberCard)}</span><span class="card-icon">${icon('calendar')}</span></div>
        <p class="card-value">${memberSince}</p>
        <p class="card-detail"><span class="status-pill">${escapeHtml(copy.accountActive)}</span></p>
        <button class="card-link" data-view="overview" type="button">${escapeHtml(copy.overviewAction)} ${icon('arrow')}</button>
      </article>
      <article class="dash-card">
        <div class="card-top"><span class="card-title">${escapeHtml(copy.notificationsCard)}</span><span class="card-icon">${icon('bell')}</span></div>
        <p class="card-value">${escapeHtml(currentUser.notificationsEnabled ? copy.notificationsEnabled : copy.notificationsDisabled)}</p>
        <p class="card-detail">${escapeHtml(currentUser.notificationsEnabled ? copy.notificationsEnabledDescription : copy.notificationsDisabledDescription)}</p>
        <div class="preference-row"><span>${escapeHtml(currentUser.notificationsEnabled ? copy.notificationsOn : copy.notificationsOff)}</span><button class="switch" type="button" role="switch" aria-label="${escapeHtml(copy.notificationsCard)}" aria-checked="${currentUser.notificationsEnabled}" data-notifications-toggle></button></div>
      </article>
    </section>`;
}

function contentEditor() {
  const groupedSections = [
    ['navigation', currentContent.cms.sectionNavigation],
    ['dashboard', currentContent.cms.sectionDashboard],
    ['overview', currentContent.cms.sectionOverview],
    ['profile', currentContent.cms.sectionProfile],
    ['about', currentContent.cms.sectionAbout],
    ['settings', currentContent.cms.sectionSettings],
    ['cms', currentContent.cms.sectionCms],
  ];
  const fields = (section) => Object.entries(currentContent[section]).map(([key, value]) => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
    const id = `content-${section}-${key}`;
    const longText = value.length > 90;
    return `<div class="field cms-field"><label for="${id}">${escapeHtml(label)}</label>${longText
      ? `<textarea id="${id}" name="${section}.${key}" maxlength="500" rows="3">${escapeHtml(value)}</textarea>`
      : `<input id="${id}" name="${section}.${key}" value="${escapeHtml(value)}" maxlength="500" required>`}</div>`;
  }).join('');

  return `${pageHeading(escapeHtml(currentContent.cms.title), escapeHtml(currentContent.cms.subtitle), escapeHtml(currentContent.cms.eyebrow))}
    <form class="cms-form" id="cms-form">
      <section class="cms-group"><h2>${escapeHtml(currentContent.cms.sectionBrand)}</h2><div class="cms-fields"><div class="field cms-field"><label for="content-brand-name">Brand name</label><input id="content-brand-name" name="brand.name" value="${escapeHtml(currentContent.brand.name)}" maxlength="500" required></div></div></section>
      ${groupedSections.map(([section, title]) => `<section class="cms-group"><h2>${escapeHtml(title)}</h2><div class="cms-fields">${fields(section)}</div></section>`).join('')}
      <p class="form-error" id="cms-error" role="alert"></p>
      <button class="primary-button" type="submit">${escapeHtml(currentContent.cms.saveButton)}</button>
    </form>`;
}

function viewContent() {
  const copy = currentContent;
  if (activeView === 'dashboard') return dashboardContent();
  if (activeView === 'overview') {
    return `${pageHeading(escapeHtml(copy.overview.title), escapeHtml(copy.overview.subtitle), escapeHtml(copy.overview.eyebrow))}
      <section class="detail-panel" aria-label="${escapeHtml(copy.overview.accountDetailsLabel)}">
        <div class="detail-row"><span class="detail-label">${escapeHtml(copy.overview.statusLabel)}</span><span class="detail-value status-pill">${escapeHtml(copy.overview.statusValue)}</span></div>
        <div class="detail-row"><span class="detail-label">${escapeHtml(copy.overview.nameLabel)}</span><span class="detail-value">${escapeHtml(currentUser.displayName)}</span></div>
        <div class="detail-row"><span class="detail-label">${escapeHtml(copy.overview.emailLabel)}</span><span class="detail-value">${escapeHtml(currentUser.email)}</span></div>
        <div class="detail-row"><span class="detail-label">${escapeHtml(copy.overview.memberSinceLabel)}</span><span class="detail-value">${formattedDate(currentUser.createdAt)}</span></div>
        <div class="detail-row"><span class="detail-label">${escapeHtml(copy.overview.notificationsLabel)}</span><span class="detail-value">${escapeHtml(currentUser.notificationsEnabled ? copy.overview.notificationsEnabled : copy.overview.notificationsDisabled)}</span></div>
      </section>`;
  }
  if (activeView === 'profile') {
    return `${pageHeading(escapeHtml(copy.profile.title), escapeHtml(copy.profile.subtitle), escapeHtml(copy.profile.eyebrow))}
      <section class="detail-panel profile-panel"><h2 class="panel-title">${escapeHtml(copy.profile.panelTitle)}</h2>
        <form class="profile-form" id="profile-form">
          <div class="field"><label for="profile-name">${escapeHtml(copy.profile.nameLabel)}</label><input id="profile-name" name="displayName" value="${escapeHtml(currentUser.displayName)}" minlength="2" maxlength="60" required></div>
          <div class="field"><label for="profile-email">${escapeHtml(copy.profile.emailLabel)}</label><input id="profile-email" type="email" value="${escapeHtml(currentUser.email)}" disabled></div>
          <p class="form-error" id="profile-error" role="alert"></p>
          <button class="primary-button" type="submit">${escapeHtml(copy.profile.saveButton)}</button>
        </form>
      </section>`;
  }
  if (activeView === 'settings') {
    return `${pageHeading(escapeHtml(copy.settings.title), escapeHtml(copy.settings.subtitle), escapeHtml(copy.settings.eyebrow))}
      <section class="detail-panel settings-panel">
        <div class="setting-item"><div class="setting-copy"><strong>${escapeHtml(copy.settings.notificationsTitle)}</strong><span>${escapeHtml(copy.settings.notificationsDescription)}</span></div><button class="switch" type="button" role="switch" aria-label="${escapeHtml(copy.settings.notificationsTitle)}" aria-checked="${currentUser.notificationsEnabled}" data-notifications-toggle></button></div>
        <div class="setting-item"><div class="setting-copy"><strong>${escapeHtml(copy.settings.emailTitle)}</strong><span>${escapeHtml(currentUser.email)}</span></div><span class="detail-value">${escapeHtml(copy.settings.emailDescription)}</span></div>
      </section>`;
  }
  if (activeView === 'about') {
    return `${pageHeading(escapeHtml(copy.about.title), escapeHtml(copy.about.subtitle), escapeHtml(copy.about.eyebrow))}
      <p class="about-copy">${escapeHtml(copy.about.paragraph)}</p>
      <div class="about-note">${escapeHtml(copy.about.securityNote)}</div>`;
  }
  return contentEditor();
}

function renderDashboard() {
  const labels = currentContent.navigation;
  const title = labels[activeView];
  app.innerHTML = `
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sidebar-head"><a class="wordmark sidebar-brand" href="#dashboard" data-view="dashboard"><span class="brand-mark">o.</span> ${escapeHtml(currentContent.brand.name)}</a><button class="nav-link logout-button" type="button" data-logout>${icon('logout')}<span>${escapeHtml(labels.logout)}</span></button></div>
        <p class="nav-label">${escapeHtml(labels.workspace)}</p>
        <nav class="sidebar-nav" aria-label="${escapeHtml(labels.navigationLabel)}">${navigation()}</nav>
        <div class="sidebar-bottom"><div class="sidebar-divider"></div><button class="nav-link logout-button" type="button" data-logout>${icon('logout')}<span>${escapeHtml(labels.logout)}</span></button></div>
      </aside>
      <div class="main-column">
        <header class="topbar"><div class="breadcrumb"><span>${escapeHtml(labels.workspace)}</span><span aria-hidden="true">/</span><strong>${escapeHtml(title)}</strong></div><div class="topbar-user"><div class="topbar-meta"><strong>${escapeHtml(currentUser.displayName)}</strong><span>${escapeHtml(currentUser.email)}</span></div><div class="avatar" aria-hidden="true">${escapeHtml(initials(currentUser.displayName))}</div></div></header>
        <main class="content">${viewContent()}</main>
      </div>
    </div>`;

  app.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      activeView = button.dataset.view;
      renderDashboard();
    });
  });
  app.querySelectorAll('[data-logout]').forEach((button) => button.addEventListener('click', logout));
  app.querySelectorAll('[data-notifications-toggle]').forEach((button) => button.addEventListener('click', toggleNotifications));
  const profileForm = document.querySelector('#profile-form');
  if (profileForm) profileForm.addEventListener('submit', saveProfile);
  const cmsForm = document.querySelector('#cms-form');
  if (cmsForm) cmsForm.addEventListener('submit', saveContent);
}

async function toggleNotifications(event) {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const result = await api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ notificationsEnabled: !currentUser.notificationsEnabled }),
    });
    currentUser = result.user;
    renderDashboard();
    showToast(currentUser.notificationsEnabled
      ? currentContent.settings.notificationsEnabledMessage
      : currentContent.settings.notificationsDisabledMessage);
  } catch (error) {
    button.disabled = false;
    showToast(error.message);
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const errorLabel = document.querySelector('#profile-error');
  button.disabled = true;
  button.textContent = 'Saving…';
  errorLabel.textContent = '';
  try {
    const result = await api('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ displayName: new FormData(form).get('displayName') }),
    });
    currentUser = result.user;
    renderDashboard();
    showToast(currentContent.profile.savedMessage);
  } catch (error) {
    errorLabel.textContent = error.message || currentContent.cms.profileError;
    button.disabled = false;
    button.textContent = currentContent.profile.saveButton;
  }
}

async function saveContent(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const errorLabel = document.querySelector('#cms-error');
  const updatedContent = JSON.parse(JSON.stringify(currentContent));
  for (const [path, value] of new FormData(form).entries()) {
    const [section, key] = path.split('.');
    updatedContent[section][key] = value.trim();
  }

  button.disabled = true;
  button.textContent = currentContent.cms.savingButton;
  errorLabel.textContent = '';
  try {
    const result = await api('/api/content', {
      method: 'PUT',
      body: JSON.stringify({ content: updatedContent }),
    });
    currentContent = result.content;
    renderDashboard();
    showToast(currentContent.cms.savedMessage);
  } catch (error) {
    errorLabel.textContent = error.message || currentContent.cms.saveError;
    button.disabled = false;
    button.textContent = currentContent.cms.saveButton;
  }
}

async function logout() {
  const message = currentContent?.navigation.logoutMessage || 'You have been signed out.';
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {
    // Clear the local view even when the network is unavailable.
  }
  currentUser = null;
  currentContent = null;
  renderAuth('login');
  showToast(message);
}

function renderServiceError(message) {
  app.innerHTML = `<section class="service-error"><span class="brand-mark">o.</span><h1>Workspace unavailable</h1><p>${escapeHtml(message)}</p><button class="primary-button" type="button" id="retry-workspace">Try again</button></section>`;
  document.querySelector('#retry-workspace').addEventListener('click', start);
}

async function start() {
  try {
    await api('/api/health');
    const result = await api('/api/auth/me');
    currentUser = result.user;
    currentContent = result.content;
    renderDashboard();
  } catch (error) {
    if (error.status !== 401) {
      renderServiceError(error.message || 'Check the server and database configuration, then try again.');
      return;
    }
    renderAuth('login');
  }
}

start();
