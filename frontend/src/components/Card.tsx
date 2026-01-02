import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    glass?: boolean;
    noAnimate?: boolean;
    onClick?: (e: any) => void;
}

export const Card: React.FC<CardProps> = ({ children, className, glass = true, noAnimate = false, onClick }) => {
    return (
        <div
            className={cn(
                "rounded-3xl p-5 transition-all duration-300",
                glass && "glass",
                !glass && "bg-secondary/50",
                onClick && "cursor-pointer",
                onClick && !noAnimate && "active:scale-[0.98] hover:shadow-xl hover:shadow-primary/5",
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
};
