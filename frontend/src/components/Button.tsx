import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    disabled,
    ...props
}) => {
    const variants = {
        primary: 'bg-primary text-white hover:opacity-90 active:scale-95',
        secondary: 'bg-secondary text-text hover:opacity-90 active:scale-95',
        outline: 'border border-primary text-primary bg-transparent hover:bg-primary/10 active:scale-95',
        danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-95',
        ghost: 'bg-transparent text-text hover:bg-black/5 active:scale-95',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs rounded-lg',
        md: 'px-4 py-3 rounded-xl text-sm',
        lg: 'px-6 py-4 rounded-2xl text-base',
        icon: 'p-0 w-10 h-10 rounded-full',
    };

    return (
        <button
            className={cn(
                'relative font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100',
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : children}
        </button>
    );
};
