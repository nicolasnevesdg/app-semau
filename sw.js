const CACHE_NAME = 'semau-v2';

// Aqui listamos todos os arquivos que queremos salvar no celular da pessoa
const assetsToCache = [
    './',
    './index.html',
    './manifest.json',
    './css/global.css',
    './css/layout.css',
    './css/components.css',
    './css/views.css',
    './js/main.js',
    './js/navigation.js',
    './js/auth.js',
    './js/quiz.js',
    './js/questions.js',
    './js/ranking.js',
    './assets/fonts/Onest-Regular.ttf',
    './assets/fonts/Onest-SemiBold.ttf',
    './assets/fonts/Onest-ExtraBold.ttf',
    './assets/svg/acesse-seu-ingresso.svg',
    './assets/svg/convidados.svg',
    './assets/svg/cronograma.svg',
    './assets/svg/game-zone.svg',
    './assets/svg/oficinas.svg'
];

// Instala o Service Worker e salva os arquivos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assetsToCache);
        })
    );
});

// Remove versões antigas do cache para descartar arquivos que não fazem mais parte do app.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => cacheName !== CACHE_NAME)
                    .map(cacheName => caches.delete(cacheName))
            );
        }).then(() => self.clients.claim())
    );
});

// Intercepta a internet: se estiver offline, ele puxa os arquivos salvos!
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});