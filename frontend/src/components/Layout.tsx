import React from 'react';
import { useTelegram } from '../hooks/useTelegram';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isReady, isMobile } = useTelegram();

    if (!isReady) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-background text-text">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-hint font-medium animate-pulse">Завантаження...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text transition-colors duration-300 relative overflow-x-hidden">
            <div className="bg-glow" />
            <main
                className="container mx-auto px-4 py-8 pb-24 max-w-2xl relative z-10"
                style={{
                    paddingTop: isMobile
                        ? `calc(env(safe-area-inset-top, 0px) + 80px)`
                        : '1.5rem',
                    paddingBottom: isMobile
                        ? `calc(env(safe-area-inset-bottom, 0px) + 5rem)`
                        : '5rem'
                }}
            >
                {children}
            </main>
        </div>
    );
};
