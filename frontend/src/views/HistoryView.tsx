import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Badge, type BadgeVariant } from '../components/Badge';

interface Application {
    id: number;
    position: string;
    status: string;
    created_at: string;
    rejection_reason?: string;
}

export const HistoryView: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get('/candidate/applications');
                const apps = response.applications || [];
                apps.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setApplications(apps);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const statusMap: Record<string, { text: string; variant: BadgeVariant; icon: string }> = {
        'pending': { text: 'Очікування', variant: 'yellow', icon: '⏳' },
        'screening_pending': { text: 'Очікує скрінінг', variant: 'info', icon: '📅' },
        'screening_scheduled': { text: 'Скрінінг заплановано', variant: 'info', icon: '⏰' },
        'screening_completed': { text: 'Скрінінг завершено', variant: 'success', icon: '✅' },
        'tech_pending': { text: 'Очікує тех. інтерв\'ю', variant: 'info', icon: '💻' },
        'tech_scheduled': { text: 'Тех. інтерв\'ю заплановано', variant: 'info', icon: '⏰' },
        'tech_completed': { text: 'Тех. інтерв\'ю завершено', variant: 'success', icon: '✅' },
        'reviewed': { text: 'Переглянуто', variant: 'info', icon: '👀' },
        'interview_scheduled': { text: 'Інтерв\'ю', variant: 'info', icon: '📅' },
        'accepted': { text: 'Прийнято', variant: 'success', icon: '✅' },
        'rejected': { text: 'Відхилено', variant: 'red', icon: '❌' },
        'cancelled': { text: 'Скасовано', variant: 'secondary', icon: '🚫' },
        'hired': { text: 'Найнято', variant: 'success', icon: '🎉' },
        'declined': { text: 'Відмовлено', variant: 'secondary', icon: '🚫' }
    };

    const filters = [
        { label: 'Всі', value: 'all' },
        { label: 'Активні', value: 'pending' },
        { label: 'Прийняті', value: 'accepted' },
        { label: 'Відхилені', value: 'rejected' },
        { label: 'Скасовані', value: 'cancelled' }
    ];

    const filteredApps = applications.filter(app => {
        if (filter === 'all') return true;
        return app.status.toLowerCase() === filter;
    });

    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            <header className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/waiting')}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    ⬅️
                </button>
                <h1 className="text-2xl font-bold">Історія заявок</h1>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {filters.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${filter === f.value
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-white/5 text-hint border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredApps.length > 0 ? filteredApps.map(app => {
                    const status = statusMap[app.status.toLowerCase()] || { text: app.status, variant: 'secondary', icon: '❓' };
                    return (
                        <Card key={app.id} className="space-y-3">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg">{app.position}</h3>
                                <Badge variant={status.variant}>{status.text}</Badge>
                            </div>

                            {app.rejection_reason && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-red-400 text-sm font-bold">Причина: {app.rejection_reason}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-hint">
                                <span>{status.icon}</span>
                                <span>{new Date(app.created_at).toLocaleString('uk-UA')}</span>
                            </div>
                        </Card>
                    );
                }) : (
                    <div className="text-center py-20 opacity-50 space-y-2">
                        <div className="text-4xl">📭</div>
                        <p>Нічого не знайдено</p>
                    </div>
                )}
            </div>
        </div>
    );
};
