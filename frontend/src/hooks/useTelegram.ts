import { useEffect, useState } from 'react';

declare global {
    interface Window {
        Telegram: {
            WebApp: any;
        };
    }
}

export function useTelegram() {
    const [tg, setTg] = useState<any>(null);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const webApp = window.Telegram.WebApp;
            webApp.ready();
            webApp.expand();

            // v7.0+ feature
            if (webApp.requestFullscreen) {
                webApp.requestFullscreen();
            }

            setTg(webApp);

            // Apply theme
            document.documentElement.className = webApp.colorScheme;

            const handleThemeChange = () => {
                document.documentElement.className = webApp.colorScheme;
            };

            webApp.onEvent('themeChanged', handleThemeChange);

            // Set header and background colors to match theme
            if (webApp.setHeaderColor) {
                webApp.setHeaderColor(webApp.themeParams.bg_color || '#ffffff');
            }
            if (webApp.setBackgroundColor) {
                webApp.setBackgroundColor(webApp.themeParams.bg_color || '#ffffff');
            }

            // Listen for viewport changes (useful for safe areas)
            const handleViewportChange = () => {
                // Force re-render or update CSS vars if needed
                console.log('Viewport changed:', webApp.viewportHeight);
            };

            webApp.onEvent('viewportChanged', handleViewportChange);

            return () => {
                webApp.offEvent('themeChanged', handleThemeChange);
                webApp.offEvent('viewportChanged', handleViewportChange);
            };
        } else {
            // Fallback for development outside Telegram
            console.warn('Telegram WebApp is not detected. Using fallback mode.');
            setTg({
                initData: '',
                initDataUnsafe: {},
                ready: () => { },
                expand: () => { },
                close: () => { },
                colorScheme: 'light'
            });
        }
    }, []);

    const expand = () => tg?.expand();
    const close = () => tg?.close();

    const user = tg?.initDataUnsafe?.user;

    const platform = tg?.platform || 'unknown';
    // Telegram platforms: 'android', 'ios', 'tdesktop', 'macos', 'web', 'weba', 'webk', 'unigram'
    // Specifically identifying mobile platforms
    const isMobile = platform === 'android' || platform === 'ios';
    const isDesktop = platform === 'tdesktop' || platform === 'macos' || platform.includes('web');

    // Debug log for troubleshooting
    console.log('[TelegramSDK] Platform:', platform, 'isMobile:', isMobile, 'isDesktop:', isDesktop);

    return {
        tg,
        user,
        expand,
        close,
        isPlatform: platform,
        isMobile: isMobile && !isDesktop, // Double check to avoid web-mobile issues if seen as web
        isReady: !!tg
    };
}
