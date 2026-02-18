/**
 * TimeMaster TTS Service v3
 * Strongly prefers Microsoft Online (Natural) voices for human-like speech
 */
const TTS = {
    synth: window.speechSynthesis,
    voice: null,
    lang: 'fr-FR',
    rate: 0.92,   // Slightly slower = more natural
    pitch: 1.0,   // Natural pitch
    volume: 1.0,

    init() {
        const loadVoices = () => {
            const voices = this.synth.getVoices();
            if (!voices.length) return;

            // Rank French voices by naturalness
            const frVoices = voices.filter(v => v.lang.startsWith('fr'));

            this.voice = this._pickBest(frVoices) || this._pickBest(voices) || voices[0] || null;

            if (this.voice) {
                this.lang = this.voice.lang;
                // Adjust rate based on voice type
                const name = this.voice.name.toLowerCase();
                if (name.includes('natural') || name.includes('neural')) {
                    this.rate = 0.95; // Natural voices sound good at near-normal speed
                    this.pitch = 1.0;
                } else {
                    this.rate = 0.88; // Slow down robotic voices a bit
                    this.pitch = 1.05;
                }
            }

            console.log('[TTS] Voix sélectionnée:', this.voice?.name || 'aucune',
                '| lang:', this.voice?.lang || '-',
                '| rate:', this.rate);
        };

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }
        loadVoices();
    },

    /** Pick the highest-quality voice from a list — strongly prefers Natural/Neural */
    _pickBest(voices) {
        if (!voices.length) return null;

        const scored = voices.map(v => {
            let score = 0;
            const name = v.name.toLowerCase();

            // Tier 1: Microsoft Online (Natural) — best quality available in browsers
            if (name.includes('online') && name.includes('natural')) score += 100;
            // Tier 2: Neural voices (Google, Microsoft)
            else if (name.includes('neural')) score += 80;
            // Tier 3: Google premium voices
            else if (name.includes('google') && !name.includes('compact')) score += 60;
            // Tier 4: Microsoft non-natural
            else if (name.includes('microsoft') && !name.includes('compact')) score += 40;
            // Tier 5: Other premium keywords
            else if (name.includes('premium') || name.includes('enhanced') || name.includes('wavenet')) score += 50;

            // Penalty for compact/espeak/low-quality
            if (name.includes('compact')) score -= 20;
            if (name.includes('espeak')) score -= 30;

            // Remote voices are usually higher quality than local
            if (!v.localService) score += 5;

            // Prefer fr-FR over other French locales
            if (v.lang === 'fr-FR') score += 3;

            return { voice: v, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].voice;
    },

    speak(text, options = {}) {
        if (!this.synth) {
            console.warn('[TTS] SpeechSynthesis non supporté');
            return;
        }
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.lang;
        utterance.rate = options.rate || this.rate;
        utterance.pitch = options.pitch || this.pitch;
        utterance.volume = options.volume || this.volume;

        if (this.voice) utterance.voice = this.voice;
        if (options.onEnd) utterance.onend = options.onEnd;

        this.synth.speak(utterance);
        console.log('[TTS]', text);
    },

    morningBriefing(tasks) {
        const now = new Date();
        const hour = now.getHours();
        let greeting;
        if (hour < 12) greeting = 'Bonjour';
        else if (hour < 18) greeting = 'Bon après-midi';
        else greeting = 'Bonsoir';

        let text = `${greeting}! ... Voici ton programme pour aujourd'hui. ... `;

        if (tasks.length === 0) {
            text += 'Tu n\'as aucune tâche planifiée. ... Profites-en pour avancer sur tes projets.';
        } else {
            const completed = tasks.filter(t => t.status === 'completed');
            const remaining = tasks.filter(t => t.status !== 'completed');

            text += `Tu as ${tasks.length} tâche${tasks.length > 1 ? 's' : ''} aujourd'hui. ... `;

            if (completed.length > 0) {
                text += `Tu as déjà terminé ${completed.length} tâche${completed.length > 1 ? 's' : ''}. Bravo, continue comme ça! ... `;
            }

            if (remaining.length > 0) {
                text += `Il te reste ${remaining.length} tâche${remaining.length > 1 ? 's' : ''} à faire. ... `;

                const urgent = remaining.filter(t => t.priority === 3);
                if (urgent.length > 0) {
                    text += `Attention, ... ${urgent.length} tâche${urgent.length > 1 ? 's sont urgentes' : ' est urgente'}: ... `;
                    text += urgent.map(t => t.title).join(', ... ') + '. ... ';
                }

                const withTime = remaining.filter(t => t.due_time);
                if (withTime.length > 0) {
                    text += 'Voici ton planning restant: ... ';
                    withTime.forEach(t => {
                        text += `À ${t.due_time.replace(':', 'h')}, ... ${t.title}. ... `;
                    });
                }
            } else {
                text += 'Tu as tout terminé! ... Excellent travail. ';
            }
        }
        text += '... Bonne continuation, et reste concentré.';
        this.speak(text);
    },

    taskReminder(task) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        let priority = task.priority === 3 ? 'Urgent. ' : '';
        const categoryName = task.category_name ? `, catégorie ${task.category_name}` : '';
        const text = `${priority}Il est ${timeStr}. Rappel : ${task.title}${categoryName}. ${task.description || ''}`;
        this.speak(text);
    },

    pomodoroEnd(isBreak) {
        if (isBreak) {
            this.speak('La pause est terminée. C\'est reparti, concentre-toi.');
        } else {
            this.speak('Bravo. Session Pomodoro terminée. Prends une pause, tu l\'as bien mérité.');
        }
    },

    getVoices() {
        return this.synth.getVoices();
    },

    setVoice(voiceName) {
        const voices = this.synth.getVoices();
        const found = voices.find(v => v.name === voiceName);
        if (found) {
            this.voice = found;
            this.lang = found.lang;
        }
    },

    stop() {
        this.synth.cancel();
    }
};
