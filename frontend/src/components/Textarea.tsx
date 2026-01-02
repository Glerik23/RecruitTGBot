import React from 'react';
import { cn } from '../utils/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    icon?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, icon, className, id, ...props }) => {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label htmlFor={id} className="text-sm font-medium text-text ml-1 flex items-center gap-1.5">
                    {icon && <span>{icon}</span>}
                    {label}
                </label>
            )}
            <textarea
                id={id}
                className={cn(
                    'w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-primary resize-none min-h-[100px]',
                    error && 'border-red-500 focus:border-red-500',
                    className
                )}
                {...props}
            />
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    );
};
