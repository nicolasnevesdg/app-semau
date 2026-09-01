(() => {
    const card = document.getElementById('admin-install-card');
    const button = document.getElementById('btn-instalar-admin');
    const buttonText = button?.querySelector('span');
    const help = document.getElementById('admin-install-help');
    if (!card || !button) return;

    let installPrompt = null;
    const userAgent = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(error => console.error('Não foi possível preparar o SEMAU Admin para instalação.', error));
        });
    }

    if (isStandalone) return;

    const showCard = () => { card.hidden = false; };
    if (isIOS || isAndroid) showCard();

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        installPrompt = event;
        showCard();
    });

    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        card.hidden = true;
    });

    button.addEventListener('click', async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const result = await installPrompt.userChoice;
            installPrompt = null;
            if (result.outcome === 'accepted') card.hidden = true;
            return;
        }

        if (isAndroid) {
            help.innerHTML = 'No Chrome, abra o menu <strong>⋮</strong> e toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.';
        }
        help.hidden = false;
        if (buttonText) buttonText.textContent = 'Como instalar';
    });
})();
