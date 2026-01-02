import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useTelegram } from '../hooks/useTelegram';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(true);
    const { isMobile } = useTelegram();

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-400" />,
        error: <XCircle className="w-5 h-5 text-red-400" />,
        warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
        info: <Info className="w-5 h-5 text-blue-400" />
    };

    const colors = {
        success: "border-green-500/20 bg-green-500/10",
        error: "border-red-500/20 bg-red-500/10",
        warning: "border-yellow-500/20 bg-yellow-500/10",
        info: "border-blue-500/20 bg-blue-500/10"
    };

    return (
        <div
            className={cn(
                "fixed left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300",
                colors[type],
                isVisible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95"
            )}
            style={{
                top: isMobile
                    ? `calc(env(safe-area-inset-top, 0px) + 100px)`
                    : '1.5rem'
            }}
        >
            {icons[type]}
            <p className="text-sm font-medium text-white whitespace-nowrap">{message}</p>
            <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
