(() => {
    const card = document.getElementById('app-install-card');
    const button = document.getElementById('btn-instalar-app');
    const buttonText = button?.querySelector('span');
    const iosHelp = document.getElementById('app-install-ios');
    if (!card || !button) return;

    let installPrompt = null;
    const userAgent = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (isStandalone) return;

    const showCard = () => { card.hidden = false; };
    if (isIOS || isAndroid) showCard();

    window.addEventListener('beforeinstallprompt', (event) => {
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
        if (isIOS || isAndroid) {
            if (isAndroid) {
                iosHelp.innerHTML = 'No Chrome, abra o menu <strong>⋮</strong> e toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.';
            }
            iosHelp.hidden = false;
            button.classList.add('orientacao-ativa');
            if (buttonText) buttonText.textContent = 'Como instalar';
        }
    });
})();