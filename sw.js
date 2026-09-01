const CACHE_NAME = 'semau-v165-admin-pwa';

// Aqui listamos todos os arquivos que queremos salvar no celular da pessoa
const assetsToCache = [
    './',
    './index.html',
    './admin.html',
    './sorteio-telao.html',
    './ingressos.html',
    './admin-cronograma.html',
    './compra.html',
    './pagamento-falhou.html',
    './pagamento-pendente.html',
    './pagamento-sucesso.html',
    './manifest.json',
    './manifest-admin.json',
    './css/global.css',
    './css/layout.css',
    './css/components.css',
    './css/views.css',
    './css/sorteio-telao.css',
    './css/compra.css',
    './css/admin-cronograma.css',
    './css/pagamento.css',
    './js/main.js',
    './js/schedule.js',
    './js/install-app.js',
    './js/install-admin-app.js',
    './js/sponsors.js',
    './js/navigation.js',
    './js/store-config.js',
    './js/store-gallery.js',
    './js/sorteio-telao.js',
    './js/ingressos.js',
    './js/ingressos-config.js',
    './js/programacao-ao-vivo-config.js',
    './js/admin-cronograma.js',
    './js/compra.js',
    './js/pagamento-retorno.js',
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
    './assets/svg/lojinha-xvi.svg',
    './assets/svg/oficinas.svg',
    './assets/svg/logo-cn-02.svg',
    './assets/svg/app-icon.svg',
    './assets/svg/admin-app-icon.svg',
    './assets/svg/logo-cn-05.svg',
    './assets/svg/sticker-palmeira.svg',
    './assets/svg/sticker-selo.svg',
    './assets/svg/sticker-cadeira.svg',
    './assets/svg/sticker-olhos-da-pele.svg',
    './assets/svg/sticker-azulejo.svg',
    './assets/svg/sticker-estrela.svg',
    './assets/svg/jean-geal.svg',
    './assets/svg/em-breve.svg',
    './assets/palestrantes/ethel-pinheiro.png',
    './assets/palestrantes/esther-carro.png',
    './assets/palestrantes/case-arquitetura.png',
    './assets/palestrantes/thaysa-malaquias.png',
    './assets/palestrantes/rafael-zamorano.png',
    './assets/palestrantes/roberto-cruz.png',
    './assets/palestrantes/pedro-rajao.png',
    './assets/palestrantes/veronica-natividade.png',
    './assets/img/palestrante-teste.png',
    './assets/img/professor-teste_1.png',
    './assets/img/oficina-levantamento.png',
    './assets/img/J1.png',
    './assets/img/J2.png',
    './assets/img/J3.png',
    './assets/img/chao.png',
    './assets/img/beneficio.png',
    './assets/img/produto-teste_2.png',
    './assets/img/instagram-widget-substituto.png',
    './assets/lojinha-xvi/Camisa_01.png',
    './assets/lojinha-xvi/Camisa_02.png',
    './assets/lojinha-xvi/Camisa_03.png',
    './assets/lojinha-xvi/Camisa_04.png',
    './assets/lojinha-xvi/Camisa_05.png',
    './assets/lojinha-xvi/Camisa_06.png',
    './assets/lojinha-xvi/baralho/baralho-capa.jpg',
    './assets/lojinha-xvi/baralho/baralho-slide-composicao.jpg',
    './assets/lojinha-xvi/baralho/baralho-slide-carta-amor.jpg',
    './assets/lojinha-xvi/baralho/baralho-slide-cartas-internas.jpg',
    './assets/lojinha-xvi/baralho/baralho-slide-cartas.jpg',
    './assets/lojinha-xvi/baralho/baralho-slide-caixa-frente-xvi.jpg',
    './assets/lojinha-xvi/baralho/baralho-slide-caixa-verso-xvi.jpg',
    './assets/lojinha-xvi/ima/ima-capa.jpg',
    './assets/lojinha-xvi/ima/ima-slide-01.jpg',
    './assets/lojinha-xvi/ima/ima-slide-02.jpg',
    './assets/lojinha-xvi/ima/ima-slide-03.jpg',
    './assets/lojinha-xvi/ima/ima-slide-06.jpg',
    './assets/lojinha-xvi/ima/ima-slide-08.jpg',
    './assets/lojinha-xvi/ima/ima-slide-09.jpg',
    './assets/lojinha-xvi/bottons/bottons-capa.jpg',
    './assets/lojinha-xvi/bottons/bottons-slide-01.jpg',
    './assets/lojinha-xvi/bottons/bottons-slide-02.jpg',
    './assets/lojinha-xvi/bottons/bottons-slide-03.jpg',
    './assets/lojinha-xvi/bottons/bottons-slide-04.jpg',
    './assets/lojinha-xvi/bottons/bottons-slide-05.jpg',
    './assets/img/card-anuncio-rasgo-verde-recortado.png',
    './assets/patrocinadores/logifab.png',
    './assets/patrocinadores/voitto.png',
    './assets/patrocinadores/peanuts-bakery.png',
    './assets/patrocinadores/gastrobarr-vo-sacasa-clara.png',
    './assets/patrocinadores/studio3-papelaria.png',
    './assets/patrocinadores/choco-latte.png',
    './assets/patrocinadores/venus-artesa.png',
    './assets/patrocinadores/cura-marca-branco.png',
    './assets/patrocinadores/jardim-de-papel.png',
    './assets/patrocinadores/mare-logo.png',
    './assets/patrocinadores/belas-artes.png',
    './assets/patrocinadores/nut-acessorios.png',
    './assets/patrocinadores/manufatura-atelie.png',
    './assets/patrocinadores/precinho-ruralino.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(assetsToCache))
    );
});

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

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});



