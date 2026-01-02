import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';
import { Button } from './Button';
import { cn } from '../utils/cn';

interface DateTimePickerProps {
    mode: 'date' | 'time' | 'datetime';
    onSelect: (date: Date | null, times: string[]) => void;
    onCancel: () => void;
    minDate?: Date;
    initialDate?: Date | null;
    initialTimes?: string[];
    getExistingTimes?: (date: Date) => string[];
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ mode, onSelect, onCancel, initialDate, initialTimes = [], getExistingTimes }) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
    const [selectedTimes, setSelectedTimes] = useState<string[]>(initialTimes);
    const [viewDate, setViewDate] = useState(initialDate || new Date());
    const firstAvailableRef = useRef<HTMLButtonElement>(null);


    const timesList: string[] = [];
    for (let h = 8; h <= 20; h++) {
        ['00', '30'].forEach(m => {
            const t = `${h.toString().padStart(2, '0')}:${m}`;
            timesList.push(t);
        });
    }

    const now = new Date();
    const hasAvailableTimeToday = timesList.some(t => {
        const [h, m] = t.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setHours(h, m, 0, 0);
        return timeDate > now;
    });

    useEffect(() => {
        if ((mode === 'time' || mode === 'datetime') && firstAvailableRef.current) {
            firstAvailableRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedDate, mode]);

    useEffect(() => {
        if (!selectedDate && (mode === 'date' || mode === 'datetime')) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (!hasAvailableTimeToday) {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
                setViewDate(tomorrow);
            } else {
                setSelectedDate(today);
            }
        }
    }, [hasAvailableTimeToday, mode, selectedDate]);

    const startDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Monday start
    };

    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);

        if (date.toDateString() !== selectedDate?.toDateString()) {
            if (getExistingTimes) {
                setSelectedTimes(getExistingTimes(date));
            } else {
                setSelectedTimes([]);
            }
        }
    };

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const startDay = startDayOfMonth(year, month);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate the first date to display (might be in previous month)
        const startDate = new Date(year, month, 1);
        startDate.setDate(startDate.getDate() - startDay);

        const days = [];
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.getTime() === today.getTime();
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isDisabled = date < today || (isToday && !hasAvailableTimeToday);

            days.push(
                <button
                    key={date.toISOString()}
                    disabled={isDisabled}
                    onClick={() => handleDateChange(new Date(date))}
                    className={cn(
                        "p-2 text-sm rounded-lg transition-all",
                        isSelected ? "bg-primary text-white font-bold" : "hover:bg-secondary",
                        isToday && !isSelected && "border border-primary/50",
                        isDisabled && "opacity-20 cursor-not-allowed disabled:pointer-events-auto",
                        !isCurrentMonth && "text-hint opacity-30"
                    )}
                >
                    {date.getDate()}
                </button>
            );
        }
        return days;
    };

    const toggleTime = (t: string) => {
        setSelectedTimes(prev =>
            prev.includes(t) ? prev.filter(time => time !== t) : [...prev, t]
        );
    };

    let firstFound = false;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <Card className="w-full max-w-sm overflow-hidden" glass={false}>
                <div className="space-y-4">
                    {(mode === 'date' || mode === 'datetime') && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</h3>
                                <div className="flex gap-1">
                                    <Button variant="secondary" className="p-1 h-8 w-8" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))}>←</Button>
                                    <Button variant="secondary" className="p-1 h-8 w-8" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))}>→</Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                {weekDays.map(d => <div key={d} className="text-[10px] text-hint font-bold">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {renderCalendar()}
                            </div>
                        </div>
                    )}

                    {(mode === 'time' || mode === 'datetime') && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-hint uppercase tracking-wider">Оберіть час</h3>
                            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {timesList.map(t => {
                                    const isToday = selectedDate?.toDateString() === now.toDateString();
                                    let isPastTime = false;

                                    if (isToday) {
                                        const [h, m] = t.split(':').map(Number);
                                        const timeDate = new Date();
                                        timeDate.setHours(h, m, 0, 0);
                                        isPastTime = timeDate < now;
                                    }

                                    const isSelected = selectedTimes.includes(t);
                                    const isFirstAvailable = !isPastTime && !firstFound;
                                    if (isFirstAvailable) firstFound = true;

                                    return (
                                        <button
                                            key={t}
                                            ref={isFirstAvailable ? firstAvailableRef : null}
                                            disabled={isPastTime}
                                            onClick={() => toggleTime(t)}
                                            className={cn(
                                                "p-2 text-xs rounded-lg border transition-all",
                                                isSelected ? "bg-primary border-primary text-white" : "bg-secondary border-white/5 text-secondary-foreground",
                                                isPastTime && "opacity-20 cursor-not-allowed border-transparent disabled:pointer-events-auto"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={onCancel}>Скасувати</Button>
                        <Button
                            variant="primary"
                            className="flex-1"
                            disabled={(mode !== 'time' && !selectedDate) || (mode !== 'date' && selectedTimes.length === 0)}
                            onClick={() => onSelect(selectedDate, selectedTimes)}
                        >
                            Обрати {selectedTimes.length > 0 && `(${selectedTimes.length})`}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};
