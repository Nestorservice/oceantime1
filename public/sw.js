const CACHE_NAME = 'timemaster-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/style.css',
    '/js/app/api-client.js',
    '/js/app/tts-service.js',
    '/js/app/alarm-service.js',
    '/js/app/app.js',
    '/js/app/ios-pwa.js',
    '/manifest.json'
];

// Install — cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — Network First for API, Cache First for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/api/')) {
        // Network only for API
        event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
            headers: { 'Content-Type': 'application/json' }
        })));
    } else {
        // Cache first for assets
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
    }
});

// Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'TimeMaster', body: 'Rappel !' };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/images/icon.svg',
            badge: '/images/icon.svg',
            vibrate: [200, 100, 200],
            tag: 'timemaster-reminder',
            requireInteraction: true,
            actions: [
                { action: 'snooze', title: '+5 min' },
                { action: 'dismiss', title: 'OK' }
            ]
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'snooze') {
        // Snooze for 5 minutes via client message
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                clients.forEach(c => c.postMessage({ type: 'SNOOZE', minutes: 5 }));
            })
        );
    } else {
        event.waitUntil(clients.openWindow('/'));
    }
});
