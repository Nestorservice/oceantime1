/**
 * TimeMaster API Client v3 — with Auth
 */
const API = {
    base: '/api',

    // ── Auth Token ──
    getToken() { return localStorage.getItem('tm_token'); },
    setToken(token) { localStorage.setItem('tm_token', token); },
    clearToken() { localStorage.removeItem('tm_token'); localStorage.removeItem('tm_user'); },
    getUser() { try { return JSON.parse(localStorage.getItem('tm_user')); } catch { return null; } },
    setUser(user) { localStorage.setItem('tm_user', JSON.stringify(user)); },
    isLoggedIn() { return !!this.getToken(); },

    async _request(path, options = {}) {
        try {
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            const token = this.getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${this.base}${path}`, { headers, ...options });

            if (res.status === 401) {
                this.clearToken();
                window.location.href = '/login.html';
                return;
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Erreur ${res.status}`);
            }
            return res.json();
        } catch (e) {
            console.error(`[API] ${options.method || 'GET'} ${path}:`, e.message);
            throw e;
        }
    },

    // ── Auth ──
    async register(name, email, password) {
        const data = await this._request('/auth/register', {
            method: 'POST', body: JSON.stringify({ name, email, password })
        });
        this.setToken(data.token);
        this.setUser(data.user);
        return data;
    },

    async login(email, password) {
        const data = await this._request('/auth/login', {
            method: 'POST', body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        this.setUser(data.user);
        return data;
    },

    logout() {
        this.clearToken();
        window.location.href = '/login.html';
    },

    async getMe() { return this._request('/auth/me'); },

    // ── Tasks ──
    getTasks(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this._request(`/tasks${params ? '?' + params : ''}`);
    },
    getTasksToday() { return this._request('/tasks/today'); },
    getUpcomingTasks() { return this._request('/tasks/upcoming'); },
    getTask(id) { return this._request(`/tasks/${id}`); },
    createTask(data) { return this._request('/tasks', { method: 'POST', body: JSON.stringify(data) }); },
    updateTask(id, data) { return this._request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    deleteTask(id) { return this._request(`/tasks/${id}`, { method: 'DELETE' }); },

    // ── Categories ──
    getCategories() { return this._request('/categories'); },
    createCategory(data) { return this._request('/categories', { method: 'POST', body: JSON.stringify(data) }); },
    updateCategory(id, data) { return this._request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    deleteCategory(id) { return this._request(`/categories/${id}`, { method: 'DELETE' }); },

    // ── Time Blocks ──
    getBlocks(start, end) {
        const params = new URLSearchParams();
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        const qs = params.toString();
        return this._request(`/blocks${qs ? '?' + qs : ''}`);
    },
    createBlock(data) { return this._request('/blocks', { method: 'POST', body: JSON.stringify(data) }); },
    updateBlock(id, data) { return this._request(`/blocks/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    deleteBlock(id) { return this._request(`/blocks/${id}`, { method: 'DELETE' }); },

    // ── Pomodoro ──
    startPomodoro(data) { return this._request('/pomodoro/start', { method: 'POST', body: JSON.stringify(data) }); },
    completePomodoro(id) { return this._request(`/pomodoro/${id}/complete`, { method: 'PUT' }); },
    cancelPomodoro(id) { return this._request(`/pomodoro/${id}/cancel`, { method: 'PUT' }); },
    getPomodoroToday() { return this._request('/pomodoro/today'); },
    getPomodoroStats() { return this._request('/pomodoro/stats'); },
    createPomodoroSession(data) { return this._request('/pomodoro', { method: 'POST', body: JSON.stringify(data) }); },

    // ── Stats ──
    getStatsDaily() { return this._request('/stats/daily'); },
    getStatsWeekly() { return this._request('/stats/weekly'); },
    getStatsFocus() { return this._request('/stats/focus'); },

    // ── Settings ──
    getSettings() { return this._request('/settings'); },
    updateSettings(data) { return this._request('/settings', { method: 'PUT', body: JSON.stringify(data) }); },
    exportData() { return this._request('/settings/export', { method: 'POST' }); },
    importData(data) { return this._request('/settings/import', { method: 'POST', body: JSON.stringify(data) }); },
};
