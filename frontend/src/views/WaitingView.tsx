import React, { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useToast } from '../context/ToastContext';

export const WaitingView: React.FC = () => {
    const { tg } = useTelegram();
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<{ interviewId: number, slotStart: string } | null>(null);

    const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

    const fetchData = async () => {
        try {
            const [apps, interviews] = await Promise.all([
                api.get('/candidate/applications'),
                api.get('/candidate/interviews')
            ]);
            setData({ applications: apps.applications, interviews: interviews.interviews });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    const selectSlot = async () => {
        if (!selectedSlot) return;
        try {
            await api.post('/candidate/interviews/select-slot', {
                interview_id: selectedSlot.interviewId,
                selected_date: selectedSlot.slotStart
            });
            tg?.HapticFeedback?.notificationOccurred('success');
            setSelectedSlot(null);
            fetchData();
        } catch (e: any) {
            showToast(e.message || 'Помилка при виборі слота', 'error');
        }
    };

    const getStatusVariant = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('rejected') || s.includes('cancelled')) return 'danger';
        if (s.includes('completed') || s.includes('hired')) return 'success';
        if (s.includes('scheduled')) return 'info';
        return 'pending';
    };

    const formatStatus = (status: string) => {
        const map: any = {
            'pending': 'Очікує розгляду',
            'accepted': 'Прийнято в роботу',
            'screening_pending': 'Очікує скрінінгу',
            'screening_scheduled': 'Скрінінг заплановано',
            'tech_pending': 'Очікує тех. інтерв\'ю',
            'tech_scheduled': 'Тех. інтерв\'ю заплановано',
            'rejected': 'Відхилено',
            'hired': 'Найнято!',
            'cancelled': 'Скасовано',
            'completed': 'Завершено',
        };
        const s = status.toLowerCase();
        return map[s] || status;
    };

    const getStatusDescription = (status: string) => {
        const map: any = {
            'pending': 'Ваша заявка успішно отримана і очікує розгляду HR. Ми сконтактуємо з вами найближчим часом.',
            'accepted': 'Ваша заявка прийнята в роботу! HR менеджер вже вивчає ваші дані.',
            'screening_pending': 'Ви запрошені на HR скрінінг. Будь ласка, оберіть зручний час нижче.',
            'screening_scheduled': 'Скрінінг заплановано. Ми чекаємо на зустріч з вами!',
            'tech_pending': 'Ви пройшли перший етап! Наступний крок — технічне інтерв\'ю.',
            'tech_scheduled': 'Технічне інтерв\'ю заплановано. Готуйтеся до цікавих запитань!',
            'rejected': 'На жаль, ми не можемо запропонувати вам позицію на даний момент.',
            'hired': 'Вітаємо! Ви прийняті на роботу. Ласкаво просимо до команди!',
        };
        return map[status.toLowerCase()] || 'Статус вашої заявки оновлено.';
    };

    const getStatusIcon = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('pending')) return '⏳';
        if (s.includes('accepted')) return '✅';
        if (s.includes('screening')) return '📅';
        if (s.includes('tech')) return '💻';
        if (s.includes('hired')) return '🎉';
        if (s.includes('rejected')) return '🚫';
        return '📑';
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    const activeApp = data?.applications?.find((app: any) =>
        !['rejected', 'hired', 'cancelled'].includes(app.status.toLowerCase())
    ) || data?.applications?.[0];

    const isFinalState = ['rejected', 'hired', 'cancelled'].includes(activeApp?.status?.toLowerCase());

    const filteredInterviews = data?.interviews?.filter((interview: any) => {
        // 1. Only interviews for the active application
        if (activeApp && interview.application_id !== activeApp.id) return false;

        // 2. Hide if the stage is already passed
        const s = activeApp?.status?.toLowerCase();

        // If screening passed (reached tech stage), hide screening
        if (interview.interview_type === 'hr_screening' &&
            ['screening_completed', 'tech_pending', 'tech_scheduled', 'tech_completed', 'processing', 'hired', 'rejected'].includes(s)) {
            return false;
        }

        // If tech passed, hide tech interview
        if (interview.interview_type === 'technical' &&
            ['tech_completed', 'processing', 'hired', 'rejected'].includes(s)) {
            return false;
        }

        return true;
    }) || [];

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <header className="text-center space-y-4">
                <h1 className="text-2xl font-bold">👋 Ваш прогрес</h1>

                <div className="flex p-1 bg-secondary/50 rounded-2xl mx-auto w-fit">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'active'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-hint hover:text-text'
                            }`}
                    >
                        Активні
                    </button>
                    <button
                        onClick={() => setActiveTab('archive')}
                        className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'archive'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-hint hover:text-text'
                            }`}
                    >
                        Мій Архів
                    </button>
                </div>
            </header>

            {activeTab === 'active' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* Hero Status Card */}
                    {activeApp && (
                        <section className="px-1">
                            <Card className="flex flex-col items-center text-center space-y-6 py-12 relative overflow-hidden">
                                {/* Subtle Background decoration */}
                                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                                <div className="relative group">
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    <div className="text-7xl drop-shadow-2xl relative z-10 select-none transform transition-transform duration-500 hover:scale-110">
                                        {getStatusIcon(activeApp.status)}
                                    </div>
                                </div>

                                <div className="space-y-3 relative z-10">
                                    <h2 className="text-3xl font-black tracking-tight">{activeApp.position}</h2>
                                    <div className="flex justify-center">
                                        <Badge variant={getStatusVariant(activeApp.status)} className="px-4 py-1 text-xs">
                                            {formatStatus(activeApp.status)}
                                        </Badge>
                                    </div>
                                </div>

                                <p className="text-lg text-hint/80 max-w-[320px] mx-auto leading-relaxed font-medium">
                                    {getStatusDescription(activeApp.status)}
                                </p>

                                <div className="pt-8 border-t border-white/5 w-full flex flex-col items-center gap-1 opacity-60">
                                    <p className="text-xs uppercase tracking-[0.2em] font-mono">
                                        ID: #{activeApp.id} • {new Date(activeApp.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')}
                                    </p>
                                </div>
                            </Card>
                        </section>
                    )}

                    {/* Interviews List */}
                    {filteredInterviews.length > 0 ? (
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold ml-1 flex items-center gap-2">
                                <span>📅</span> Ваші зустрічі
                            </h2>
                            {filteredInterviews.map((interview: any) => (
                                <Card key={interview.id} className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold">{interview.interview_type === 'hr_screening' ? 'HR Скрінінг' : 'Технічне інтерв\'ю'}</h3>
                                        <Badge variant={interview.is_confirmed ? 'success' : 'pending'}>
                                            {interview.is_confirmed ? 'Підтверджено' : 'Очікує'}
                                        </Badge>
                                    </div>

                                    {!interview.selected_time ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-yellow-500 font-medium font-['Inter']">⚠️ Оберіть зручний час:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[...(interview.available_slots || [])].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map((slot: any) => {
                                                    const isSelected = selectedSlot?.interviewId === interview.id && selectedSlot?.slotStart === slot.start;
                                                    return (
                                                        <button
                                                            key={slot.start}
                                                            onClick={() => setSelectedSlot({ interviewId: interview.id, slotStart: slot.start })}
                                                            className={`p-3 text-xs border rounded-xl transition-all duration-300 flex flex-col items-center gap-1 ${isSelected
                                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-[1.05] z-10'
                                                                : 'bg-white/10 text-white/90 border-white/10 hover:border-primary/50 hover:bg-white/15'
                                                                }`}
                                                        >
                                                            <span className="font-black tracking-tight">
                                                                {new Date(slot.start).toLocaleString('uk-UA', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                            <span className="text-[10px] uppercase font-medium opacity-60">
                                                                {new Date(slot.start).toLocaleString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {selectedSlot?.interviewId === interview.id && (
                                                <button
                                                    onClick={selectSlot}
                                                    className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 animate-scaleIn active:scale-95 transition-transform"
                                                >
                                                    🚀 ПІДТВЕРДИТИ ЧАС
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 text-hint">
                                                <span>⏰</span>
                                                <span>{new Date(interview.selected_time).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                            </div>
                                            {interview.meet_link && (
                                                <a href={interview.meet_link} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-2">
                                                    <span>🔗</span> Посилання на зустріч
                                                </a>
                                            )}
                                            {interview.address && (
                                                <div className="flex items-center gap-2">
                                                    <span>📍</span> {interview.address}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </section>
                    ) : (activeApp && !isFinalState) ? (
                        <div className="text-center py-20 animate-fadeIn">
                            <div className="text-4xl mb-4 opacity-20">🍃</div>
                            <p className="text-hint">Ваша заявка обробляється</p>
                        </div>
                    ) : isFinalState ? (
                        <div className="text-center py-10 animate-fadeIn space-y-6">
                            <div className="text-4xl opacity-20">🏁</div>
                            <div className="space-y-2">
                                <p className="text-hint">Процес завершено</p>
                                <p className="text-sm opacity-60 px-10">Тепер ви можете подати нову заявку, якщо бажаєте спробувати інші позиції.</p>
                            </div>
                            <button
                                onClick={() => window.location.href = '/candidate/application'}
                                className="px-8 py-3 bg-primary/10 text-primary border border-primary/20 rounded-2xl font-bold hover:bg-primary/20 transition-all"
                            >
                                ✨ Створити нову заявку
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-20 animate-fadeIn">
                            <div className="text-4xl mb-4 opacity-20">🍃</div>
                            <p className="text-hint">Немає активних заявок</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'archive' && (
                <div className="space-y-6 animate-fadeIn">
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <span>📂</span> Історія заявок
                            </h2>
                            <span className="text-xs text-hint">{data?.applications?.length || 0} всього</span>
                        </div>
                        {data?.applications?.length > 0 ? (
                            <div className="space-y-4">
                                {data.applications.map((app: any) => (
                                    <Card key={app.id} className="space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold">{app.position}</h3>
                                            <Badge variant={getStatusVariant(app.status)}>{formatStatus(app.status)}</Badge>
                                        </div>
                                        {app.rejection_reason && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">
                                                Причина: {app.rejection_reason}
                                            </div>
                                        )}
                                        <div className="text-xs text-hint">
                                            Подано: {new Date(app.created_at).toLocaleDateString('uk-UA')}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-hint">У вас поки немає заявок</p>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
};
