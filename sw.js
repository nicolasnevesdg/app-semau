const CACHE_NAME = 'semau-v1';

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
    './assets/fonts/Tapoca-Regular.otf',
    './assets/fonts/Onest-Regular.ttf',
    './assets/fonts/Onest-SemiBold.ttf',
    './assets/fonts/Onest-ExtraBold.ttf'
];

// Instala o Service Worker e salva os arquivos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assetsToCache);
        })
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