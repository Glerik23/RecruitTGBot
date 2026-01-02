import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { cn } from '../utils/cn';

interface ApplicationCardProps {
    application: any;
    onView?: (id: number) => void;
    onAction?: (id: number) => void;
    actionLabel?: string;
    actionVariant?: 'primary' | 'secondary' | 'outline';
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
    application,
    onView,
    onAction,
    actionLabel = '📊 Керувати заявкою',
    actionVariant = 'secondary'
}) => {
    const getStatusVariant = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('rejected')) return 'danger';
        if (s.includes('accepted') || s.includes('hired')) return 'success';
        if (s.includes('pending') || s.includes('processing')) return 'pending';
        return 'info';
    };

    const status = application.status?.toLowerCase() || 'pending';

    const formatStatus = (status: string) => {
        const map: any = {
            'pending': 'Вхідні',
            'accepted': 'Прийнято',
            'screening_pending': 'Запрошено',
            'screening_scheduled': 'Заплановано',
            'tech_pending': 'Тех. етап (пул)',
            'tech_scheduled': 'Тех. етап (сплановано)',
            'tech_completed': 'Тех. завершено',
            'processing': 'В обробці',
            'rejected': 'Відхилено',
            'hired': 'Найнято',
            'cancelled': 'Скасовано',
            'declined': 'Відхилено',
        };
        return map[status.toLowerCase()] || status;
    };

    return (
        <Card
            className="border border-white/5 animate-fadeIn overflow-hidden"
        >
            <div className="flex justify-between items-start mb-4 -mt-1">
                <div className="flex flex-col gap-5">
                    <div className="flex">
                        <Badge variant={getStatusVariant(status)} className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold">
                            {formatStatus(status)}
                        </Badge>
                    </div>
                    <h3 className="text-xl font-extrabold text-text tracking-tight leading-tight">
                        {application.position}
                    </h3>
                </div>
                <div className="text-[10px] text-white font-black bg-white/10 px-2 py-1.5 rounded-lg mt-1 shadow-lg ring-1 ring-white/20">
                    {new Date(application.created_at).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg shadow-inner">
                        👤
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white uppercase tracking-widest font-black opacity-90 mb-0.5">
                            Кандидат
                        </p>
                        <h4 className="text-lg font-bold text-text truncate">
                            {application.candidate_name || application.full_name || application.candidate?.name || 'Кандидат'}
                        </h4>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
                <Button
                    variant={actionVariant}
                    className={cn(
                        "w-full py-4 text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group",
                        actionVariant === 'secondary' && "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20",
                        "active:scale-[0.98]"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onAction) {
                            onAction(application.id);
                        } else if (onView) {
                            onView(application.id);
                        }
                    }}
                >
                    <span>{actionLabel}</span>
                    <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                </Button>
            </div>
        </Card>
    );
};

