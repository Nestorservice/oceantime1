/**
 * TimeMaster Alarm Service v2
 * Melodic chime alarm + WhatsApp-style toast notifications + bell badge
 */
const AlarmService = {
    checkInterval: null,
    activeAlarms: new Set(),
    snoozedTasks: {},
    isRunning: false,
    notificationCount: 0,

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[Alarm] Service démarré');
        this.check();
        this.checkInterval = setInterval(() => this.check(), 30000);
    },

    stop() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.isRunning = false;
    },

    async check() {
        try {
            const tasks = await API.getUpcomingTasks();
            const now = Date.now();

            for (const task of tasks) {
                if (this.activeAlarms.has(task.id)) continue;
                if (this.snoozedTasks[task.id] && now < this.snoozedTasks[task.id]) continue;
                if (!task.due_date || !task.due_time) continue;

                const taskTime = new Date(`${task.due_date}T${task.due_time}`).getTime();
                const reminderTime = taskTime - (task.reminder_minutes_before || 10) * 60000;

                if (now >= reminderTime && now <= taskTime + 60000) {
                    this.triggerAlarm(task);
                    this.activeAlarms.add(task.id);
                }
            }

            if (new Date().getHours() === 0 && new Date().getMinutes() === 0) {
                this.activeAlarms.clear();
                this.snoozedTasks = {};
            }
        } catch (e) {
            console.warn('[Alarm] Erreur:', e.message);
        }
    },

    triggerAlarm(task) {
        console.log('[Alarm] ALARME:', task.title);
        this.playAlarmSound();
        setTimeout(() => TTS.taskReminder(task), 2500);
        this.showNotification(task);
        this.showToast(task);
        this.incrementBell();
    },

    /**
     * Melodic chime — 3-note pleasant sequence instead of harsh beeps
     */
    playAlarmSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;

            // Pleasant 3-note ascending chime (C5 - E5 - G5)
            const notes = [523.25, 659.25, 783.99];
            const noteLen = 0.35;

            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * noteLen);

                // Smooth envelope
                gain.gain.setValueAtTime(0, now + i * noteLen);
                gain.gain.linearRampToValueAtTime(0.25, now + i * noteLen + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * noteLen + noteLen - 0.02);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * noteLen);
                osc.stop(now + i * noteLen + noteLen);
            });

            // Second pass — repeat the chime after a pause
            setTimeout(() => {
                try {
                    const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
                    const now2 = ctx2.currentTime;
                    notes.forEach((freq, i) => {
                        const osc = ctx2.createOscillator();
                        const gain = ctx2.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now2 + i * noteLen);
                        gain.gain.setValueAtTime(0, now2 + i * noteLen);
                        gain.gain.linearRampToValueAtTime(0.2, now2 + i * noteLen + 0.05);
                        gain.gain.exponentialRampToValueAtTime(0.01, now2 + i * noteLen + noteLen - 0.02);
                        osc.connect(gain);
                        gain.connect(ctx2.destination);
                        osc.start(now2 + i * noteLen);
                        osc.stop(now2 + i * noteLen + noteLen);
                    });
                } catch (e) { }
            }, 1500);

        } catch (e) {
            console.warn('[Alarm] Audio non supporté:', e.message);
        }
    },

    showNotification(task) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${task.title}`, {
                body: `${task.due_time} — ${task.category_name || 'Sans catégorie'}`,
                icon: '/images/icon-192.png',
                tag: `task-${task.id}`,
                requireInteraction: true,
            });
        }
    },

    /**
     * WhatsApp-style toast notification (slides in from top-right)
     */
    showToast(task) {
        // Ensure container exists
        let container = document.getElementById('tm-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tm-toast-container';
            container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:380px;width:calc(100% - 40px);pointer-events:none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background:#fff;border-radius:12px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);
            display:flex;align-items:flex-start;gap:12px;transform:translateX(120%);transition:transform .4s cubic-bezier(.22,1,.36,1);
            pointer-events:auto;border-left:4px solid #1E3A5F;cursor:pointer;
        `;
        toast.innerHTML = `
            <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#1E3A5F,#4DA8DA);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas fa-bell" style="color:#fff;font-size:16px"></i>
            </div>
            <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:14px;color:#1E3A5F;margin-bottom:2px">${task.title}</div>
                <div style="font-size:12px;color:#64748b">${task.due_time || ''} ${task.category_name ? '— ' + task.category_name : ''}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
                <button onclick="AlarmService.snooze(${task.id},5);this.closest('[style]').remove()" class="btn btn-sm" style="background:#F39C12;color:#fff;border-radius:8px;font-size:11px;padding:4px 10px">
                    <i class="fas fa-clock"></i> +5min
                </button>
                <button onclick="this.closest('[style]').remove()" class="btn btn-sm" style="background:#1E3A5F;color:#fff;border-radius:8px;font-size:11px;padding:4px 10px">
                    OK
                </button>
            </div>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Auto-dismiss after 15s
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 400);
        }, 15000);
    },

    /**
     * Increment the bell badge counter in the header
     */
    incrementBell() {
        this.notificationCount++;
        const badge = document.getElementById('tm-bell-badge');
        if (badge) {
            badge.textContent = this.notificationCount;
            badge.style.display = 'flex';
            // Shake the bell
            const bell = document.getElementById('tm-bell-icon');
            if (bell) {
                bell.classList.add('tm-bell-shake');
                setTimeout(() => bell.classList.remove('tm-bell-shake'), 1000);
            }
        }
    },

    clearBell() {
        this.notificationCount = 0;
        const badge = document.getElementById('tm-bell-badge');
        if (badge) badge.style.display = 'none';
    },

    snooze(taskId, minutes) {
        this.snoozedTasks[taskId] = Date.now() + minutes * 60000;
        this.activeAlarms.delete(taskId);
        TTS.speak(`Rappel reporté de ${minutes} minutes.`);
    },

    dismiss(taskId) {
        const toasts = document.querySelectorAll('#tm-toast-container > div');
        toasts.forEach(t => t.remove());
    }
};
