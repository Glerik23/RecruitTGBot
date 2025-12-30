import { initRouter } from './router.js';

const tg = window.Telegram?.WebApp;

async function initApp() {
    console.log('Initializing RecruitTG App...');

    // Ініціалізація Telegram WebApp
    // Ініціалізація Telegram WebApp
    const tg = window.Telegram?.WebApp;

    if (tg) {
        tg.ready();

        // Максимальне розширення (стандартне)
        try {
            tg.expand();
        } catch (e) {
            console.warn('Expand error:', e);
        }

        // Спроба увімкнути повноекранний режим (Bot API 8.0+)
        if (typeof tg.requestFullscreen === 'function') {
            try {
                tg.requestFullscreen();
            } catch (e) {
                console.warn('Fullscreen error:', e);
            }
        }

        // Налаштування теми
        document.documentElement.className = tg.colorScheme;

        // Обробка події зміни теми
        tg.onEvent('themeChanged', () => {
            document.documentElement.className = tg.colorScheme;
        });
    }

    // Ініціалізація роутера
    await initRouter();
}

// Запуск додатку
initApp().catch(console.error);
