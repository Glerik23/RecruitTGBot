import React from 'react';
import { cn } from '../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className, id, ...props }) => {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label htmlFor={id} className="text-sm font-medium text-text ml-1 flex items-center gap-1.5">
                    {icon && <span>{icon}</span>}
                    {label}
                </label>
            )}
            <div className="relative group">
                <input
                    id={id}
                    className={cn(
                        'w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-primary',
                        error && 'border-red-500 focus:border-red-500',
                        className
                    )}
                    {...props}
                />
            </div>
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    );
};
