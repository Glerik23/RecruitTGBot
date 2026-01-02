import React from 'react';
import { cn } from '../utils/cn';

export type BadgeVariant = 'pending' | 'success' | 'danger' | 'info' | 'neutral' | 'primary' | 'secondary' | 'blue' | 'yellow' | 'green' | 'red';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className }) => {
    const variants: Record<BadgeVariant, string> = {
        pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30',
        success: 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30',
        danger: 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30',
        info: 'bg-primary/20 text-primary border border-primary/30',
        neutral: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30',
        primary: 'bg-primary text-white',
        secondary: 'bg-secondary text-secondary-foreground border border-white/5',
        blue: 'bg-blue-500/20 text-blue-500 border border-blue-500/30',
        yellow: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30',
        green: 'bg-green-500/20 text-green-500 border border-green-500/30',
        red: 'bg-red-500/20 text-red-500 border border-red-500/30'
    };

    return (
        <span className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
};
