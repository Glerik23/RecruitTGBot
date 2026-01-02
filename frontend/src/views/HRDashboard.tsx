import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ApplicationCard } from '../components/ApplicationCard';
import { ApplicationDetail } from '../components/ApplicationDetail';

const TABS = [
    { label: 'Вхідні', value: 'pending', icon: '📥' },
    { label: 'В роботі', value: 'processing', icon: '⚙️' },
    { label: 'Запрошення', value: 'interviews', icon: '📩' },
    { label: 'Заплановано', value: 'planned', icon: '🗓️' },
    { label: 'Тех-етап', value: 'tech', icon: '👨‍💻' },
    { label: 'Архів', value: 'archive', icon: '🗄️' },
];

export const HRDashboard: React.FC = () => {
    const [filter, setFilter] = useState('pending');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const fetchApplications = async (newTab?: string) => {
        setLoading(true);
        if (newTab) setFilter(newTab);
        try {
            const currentFilter = newTab || filter;
            const queryParams = currentFilter === 'all' ? '?status=all' : `?status=${currentFilter}`;
            const response = await api.get(`/hr/applications${queryParams}`);
            setData(response);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [filter]);


    const handleView = (id: number) => {
        setSelectedId(id);
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-24">
            <header className="text-center space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight flex items-center justify-center gap-2">
                        <span>📋</span> Панель HR
                    </h1>
                    <p className="text-[10px] text-hint uppercase tracking-[0.2em] font-bold opacity-60">
                        Керування кандидатами
                    </p>
                </div>

                <div className="flex p-1 bg-secondary/40 backdrop-blur-md rounded-2xl mx-auto w-fit border border-white/5 shadow-2xl overflow-x-auto no-scrollbar max-w-full">
                    {TABS.map((t) => {
                        const count = data?.counts?.[t.value] || 0;
                        const isActive = filter === t.value;
                        return (
                            <button
                                key={t.value}
                                onClick={() => setFilter(t.value)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-500 flex items-center gap-2 whitespace-nowrap ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                    : 'text-hint hover:text-text'
                                    }`}
                            >
                                <span className="text-sm">{t.icon}</span>
                                <span>{t.label}</span>
                                {count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[18px] flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {data?.applications?.length > 0 ? (
                        data.applications.map((app: any) => (
                            <ApplicationCard
                                key={app.id}
                                application={app}
                                onView={handleView}
                            />
                        ))
                    ) : (
                        <div className="text-center py-24 px-6 bg-secondary/20 backdrop-blur-sm rounded-[32px] border border-white/5 animate-fadeIn space-y-4">
                            <div className="text-7xl animate-bounce duration-[2000ms] opacity-80">📭</div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-text/80">Поки що тут порожньо</h2>
                                <p className="text-sm text-hint max-w-[200px] mx-auto opacity-70">
                                    Кандидатів у цій категорії наразі немає
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedId && (
                <ApplicationDetail
                    id={selectedId}
                    onClose={() => setSelectedId(null)}
                    onUpdate={fetchApplications}
                    role="hr"
                />
            )}
        </div>
    );
};
