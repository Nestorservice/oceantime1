# ⏱️ TimeMaster PWA

> **Gère ton temps, maîtrise ta vie.**

Application Progressive Web App de gestion du temps avec assistant vocal intelligent, conçue pour les étudiants et professionnels atteints de TDAH.

## ✨ Fonctionnalités

- 📋 **Gestion de tâches** — Créer, organiser par catégorie et priorité, rappels vocaux
- 📅 **Calendrier & Time Blocking** — Planification visuelle avec FullCalendar v5
- 🍅 **Pomodoro Timer** — Sessions focus/pause avec sons de notification
- 🗣️ **Assistant vocal TTS** — Briefing matinal, rappels vocaux avec voix naturelle (Microsoft Neural)
- 📊 **Statistiques** — Suivi quotidien/hebdomadaire de productivité
- 🔔 **Alarmes & Notifications Push** — Rappels en temps réel même hors ligne
- 🧠 **Anti-Hyperfocus** — Rappels périodiques pour sortir de l'hyperfocus
- 📱 **PWA installable** — Fonctionne hors ligne, installable sur mobile et desktop

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | HTML5, CSS3, Bootstrap 5, JavaScript ES6+ |
| **Backend** | Node.js, Express.js |
| **Base de données** | LowDB (JSON) |
| **Auth** | JWT (jsonwebtoken), bcrypt |
| **PWA** | Service Worker, Web App Manifest |
| **TTS** | Web Speech API |
| **Calendrier** | FullCalendar v5 |

## 📁 Structure du Projet

```
time/
├── api/            # Routes API REST (auth, tasks, categories, blocks, pomodoro, stats, settings)
├── db/             # Base de données LowDB
├── middleware/      # Middleware auth JWT
├── public/         # Frontend PWA
│   ├── js/app/     # Logique applicative (app.js, api-client.js, tts-service.js, alarm-service.js)
│   ├── vendor/     # Librairies tierces (Bootstrap, FullCalendar, jQuery)
│   ├── sounds/     # Sons de notification
│   └── *.html      # Pages (index, tasks, calendar, pomodoro, statistics, settings)
├── server.js       # Point d'entrée Express
├── package.json
└── Procfile        # Déploiement Railway
```

## 🚀 Installation

```bash
# Cloner le repo
git clone <url-du-repo>
cd time

# Installer les dépendances
npm install

# Lancer en développement
node server.js
```

L'application sera disponible sur `http://localhost:3000`

## 🌐 Déploiement

Configuré pour **Railway** via le `Procfile` :

```
web: node server.js
```

## 👤 Auteur

**Nestor Corneille**

---

*Fait avec ❤️ pour aider à mieux gérer son temps*
