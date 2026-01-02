import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '../utils/cn';

interface SelectProps {
    label?: string;
    icon?: string;
    value: string;
    onChange: (value: string) => void;
    options: string[] | { label: string; value: string }[];
    placeholder?: string;
    searchable?: boolean;
    className?: string;
    error?: string;
}

export const Select: React.FC<SelectProps> = ({
    label,
    icon,
    value,
    onChange,
    options,
    placeholder = 'Оберіть...',
    searchable = false,
    className,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const normalizedOptions = useMemo(() => {
        return options.map(opt =>
            typeof opt === 'string' ? { label: opt, value: opt } : opt
        );
    }, [options]);

    const filteredOptions = useMemo(() => {
        if (!searchable || !search) return normalizedOptions;
        const lowSearch = search.toLowerCase();
        return normalizedOptions.filter(opt =>
            opt.label.toLowerCase().includes(lowSearch) ||
            opt.value.toLowerCase().includes(lowSearch)
        );
    }, [normalizedOptions, searchable, search]);

    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className={cn("flex flex-col gap-1.5 w-full relative z-10", isOpen && "z-[100]", className)} ref={containerRef}>
            {label && (
                <label className="text-sm font-medium text-text ml-1 flex items-center gap-1.5">
                    {icon && <span>{icon}</span>}
                    {label}
                </label>
            )}

            <div className="relative">
                {/* Trigger */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full bg-secondary border border-transparent rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 flex items-center justify-between",
                        isOpen && "border-primary ring-2 ring-primary/10",
                        error && "border-red-500",
                        !value && "text-hint"
                    )}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <span className={cn("transition-transform duration-200 text-xs opacity-50", isOpen && "rotate-180")}>
                        ▼
                    </span>
                </div>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-[100] left-0 right-0 mt-2 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-scaleIn origin-top backdrop-blur-3xl">
                        {searchable && (
                            <div className="p-2 border-b border-black/5">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Пошук..."
                                    className="w-full bg-black/5 rounded-xl px-3 py-2 outline-none text-sm focus:bg-black/10 transition-colors"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        className={cn(
                                            "px-4 py-3 cursor-pointer text-sm transition-colors hover:bg-primary/10",
                                            value === opt.value && "text-primary font-bold bg-primary/5"
                                        )}
                                    >
                                        {opt.label}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center text-hint text-xs">
                                    Нічого не знайдено
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    );
};
