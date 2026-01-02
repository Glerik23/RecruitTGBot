import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Textarea } from '../components/Textarea';
import { DateTimePicker } from '../components/DateTimePicker';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

interface Interview {
    id: number;
    slots: string[];
    selected_time?: string;
    is_confirmed: boolean;
}

interface ApplicationDetail {
    id: number;
    candidate_name: string;
    position: string;
    status: string;
    created_at: string;
    email: string;
    phone?: string;
    experience_years?: number;
    skills: string[];
    skills_details?: Array<{ name: string, exp: string }>;
    english_level?: string;
    portfolio_url?: string;
    additional_info?: string;
    active_interview?: Interview;
}

interface Feedback {
    score: number;
    pros: string;
    cons: string;
    summary: string;
}

export const InterviewerDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [app, setApp] = useState<ApplicationDetail | null>(null);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Feedback form state
    const [score, setScore] = useState(5);
    const [pros, setPros] = useState('');
    const [cons, setCons] = useState('');
    const [summary, setSummary] = useState('');

    // Scheduling state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [locationType, setLocationType] = useState<'online' | 'office'>('online');
    const [details, setDetails] = useState({ meet_link: '', address: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [appRes, fbRes] = await Promise.all([
                    api.get(`/interviewer/applications/${id}`),
                    api.get(`/interviewer/applications/${id}/feedback`).catch(() => ({ feedback: null }))
                ]);
                setApp(appRes);
                if (fbRes.feedback) {
                    setFeedback(fbRes.feedback);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post(`/interviewer/applications/${id}/feedback`, {
                score, pros, cons, summary
            });
            // Refresh
            const fbRes = await api.get(`/interviewer/applications/${id}/feedback`);
            setFeedback(fbRes.feedback);
            showToast('Відгук успішно збережено', 'success');
        } catch (e) {
            showToast('Помилка при відправці фідбеку', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddSlot = (date: Date | null, times: string[]) => {
        if (!date) return;

        const newSlots = times.map(time => {
            const [hours, minutes] = time.split(':').map(Number);
            const start = new Date(date);
            start.setHours(hours, minutes, 0, 0);

            const end = new Date(start);
            end.setHours(end.getHours() + 1);

            return `${start.toISOString()}|${end.toISOString()}`;
        });

        // Filter out old slots for this date and add new ones
        const otherSlots = selectedSlots.filter(s => new Date(s.split('|')[0]).toDateString() !== date.toDateString());

        const updated = [...otherSlots, ...newSlots].sort((a, b) => {
            const timeA = new Date(a.split('|')[0]).getTime();
            const timeB = new Date(b.split('|')[0]).getTime();
            return timeA - timeB;
        });

        setSelectedSlots(updated);
        if (newSlots.length > 0) {
            showToast(`Оновлено слоти для {date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}`, 'info');
        }
        setShowDatePicker(false);
    };

    const handleSendSlots = async () => {
        if (selectedSlots.length === 0) return;
        try {
            await api.post(`/interviewer/applications/${id}/schedule`, {
                slots: selectedSlots,
                location_type: locationType,
                details: details
            });
            showToast('Слоти надіслано кандидату', 'success');
            navigate('/interviewer');
        } catch (e) {
            showToast('Помилка при відправці слотів', 'error');
        }
    };

    const handleFinalize = async () => {
        const link = prompt('Введіть посилання на зустріч (Google Meet/Zoom):');
        if (!link) return;
        try {
            await api.post(`/interviewer/applications/${id}/finalize`, { meeting_link: link });
            showToast('Інтерв’ю фіналізовано, посилання надіслано', 'success');
            navigate('/interviewer');
        } catch (e) {
            showToast('Помилка при фіналізації', 'error');
        }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    if (!app) return <div className="text-center py-20 font-bold">Заявку не знайдено</div>;

    const status = app.status.toLowerCase();

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            <button onClick={() => navigate('/interviewer')} className="flex items-center gap-2 text-hint hover:text-white transition-colors">
                <span>←</span> Назад до списку
            </button>

            <Card className="space-y-6">
                <div className="border-b border-white/5 pb-4 space-y-2">
                    <div className="flex justify-between items-start">
                        <h1 className="text-2xl font-bold">{app.candidate_name}</h1>
                        <Badge variant={status === 'rejected' ? 'red' : status.includes('tech') ? 'blue' : 'secondary'}>
                            {app.status}
                        </Badge>
                    </div>
                    <p className="text-primary font-medium">{app.position}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <InfoItem icon="📧" label="Email" value={app.email} copyValue={app.email} title="Email скопійовано" />
                    <InfoItem icon="📱" label="Телефон" value={app.phone || '-'} copyValue={app.phone} title="Номер телефону скопійовано" />
                    <InfoItem icon="💼" label="Досвід" value={`${app.experience_years || 0} років`} />
                    <InfoItem icon="🇬🇧" label="Англійська" value={app.english_level || '—'} />
                    <InfoItem icon="📅" label="Дата подачі" value={new Date(app.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')} />
                    {app.portfolio_url && <InfoItem icon="🔗" label="Портфоліо" value="Відкрити" copyValue={app.portfolio_url} title="Посилання скопійовано" isLink linkUrl={app.portfolio_url} />}
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] text-hint uppercase font-bold tracking-wider">Навички</label>
                    <div className="flex flex-wrap gap-2">
                        {app.skills_details?.length ? (
                            app.skills_details.map(s => (
                                <div key={s.name} className="flex items-center gap-2 bg-white/5 pl-3 pr-1.5 py-1 rounded-xl border border-white/5">
                                    <span className="text-sm font-medium text-white/90">{s.name}</span>
                                    <Badge variant="blue" className="text-[10px] scale-90">
                                        {parseFloat(s.exp) > 0 ? `${s.exp} р.` : '< 1 р.'}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            app.skills.map(s => <Badge key={s} variant="secondary" className="bg-white/5">{s}</Badge>)
                        )}
                    </div>
                </div>

                {app.additional_info && (
                    <div className="space-y-2 p-3 bg-black/20 rounded-xl">
                        <label className="text-[10px] text-hint uppercase font-bold tracking-wider">Додаткова інформація</label>
                        <p className="text-sm opacity-80 whitespace-pre-wrap">{app.additional_info}</p>
                    </div>
                )}
            </Card>

            {/* Scheduling Section */}
            <Card className="border-primary/30 bg-primary/5 space-y-6">
                <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2">📍 Деталі зустрічі</h3>

                    <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                        <button
                            className={`py-2 text-xs font-bold rounded-lg transition-all ${locationType === 'online' ? 'bg-primary text-white shadow-lg' : 'text-hint'}`}
                            onClick={() => setLocationType('online')}
                        >
                            🌐 Онлайн
                        </button>
                        <button
                            className={`py-2 text-xs font-bold rounded-lg transition-all ${locationType === 'office' ? 'bg-primary text-white shadow-lg' : 'text-hint'}`}
                            onClick={() => setLocationType('office')}
                        >
                            🏢 Офіс
                        </button>
                    </div>

                    <div className="space-y-2">
                        {locationType === 'online' ? (
                            <div className="space-y-1">
                                <span className="text-[10px] text-hint uppercase ml-1">Посилання (Meet/Zoom)</span>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
                                    placeholder="https://meet.google.com/..."
                                    value={details.meet_link}
                                    onChange={(e) => setDetails({ ...details, meet_link: e.target.value })}
                                />
                                <p className="text-[9px] text-hint ml-1">Порожньо = надіслати пізніше</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <span className="text-[10px] text-hint uppercase ml-1">Адреса офісу</span>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
                                    placeholder="м. Київ, вул..."
                                    value={details.address}
                                    onChange={(e) => setDetails({ ...details, address: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold flex items-center gap-2">🗓️ Оберіть слоти</h2>
                        {selectedSlots.length > 0 && (
                            <button
                                onClick={() => setSelectedSlots([])}
                                className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-wider transition-colors"
                            >
                                🗑️ Очистити все
                            </button>
                        )}
                    </div>

                    {selectedSlots.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                                {selectedSlots.map((slot, idx) => {
                                    const [start] = slot.split('|');
                                    return (
                                        <Badge key={idx} variant="blue" className="pr-1 py-1.5">
                                            {new Date(start).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            <button onClick={() => setSelectedSlots(selectedSlots.filter((_, i) => i !== idx))} className="ml-2 hover:text-red-400">×</button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <Button
                            variant="secondary"
                            className="w-full h-10 text-xs font-bold border-dashed border-primary/40 text-primary bg-primary/5 flex items-center justify-center gap-2"
                            onClick={() => setShowDatePicker(true)}
                        >
                            <span>➕ Додати слот</span>
                        </Button>

                        {selectedSlots.length > 0 && (
                            <Button className="w-full py-4 shadow-lg shadow-primary/20" variant="primary" onClick={handleSendSlots}>
                                Надіслати слоти кандидату
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {status === 'tech_scheduled' && app.active_interview?.selected_time && (
                <Card className="border-green-500/30 bg-green-500/5 space-y-4">
                    <h2 className="font-bold flex items-center gap-2 text-green-500">✅ Час обрано</h2>
                    <p className="text-sm">Кандидат обрав час: <b>{new Date(app.active_interview.selected_time).toLocaleString('uk-UA')}</b></p>
                    <Button className="w-full" variant="primary" onClick={handleFinalize}>Надіслати посилання на зустріч</Button>
                </Card>
            )}

            {/* Feedback Section */}
            {(feedback || (app.active_interview?.is_confirmed)) && (
                <Card className="border-primary/20 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">📝 Технічний фідбек</h2>

                    {feedback ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-xl">
                                <span className="text-hint text-sm">Оцінка:</span>
                                <span className="text-2xl font-black text-primary">{feedback.score}/10</span>
                            </div>
                            <FeedbackDisplay label="✅ Плюси" value={feedback.pros} color="text-green-500" />
                            <FeedbackDisplay label="❌ Мінуси" value={feedback.cons} color="text-red-500" />
                            <FeedbackDisplay label="ℹ️ Резюме" value={feedback.summary} italic />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitFeedback} className="space-y-4 animate-fadeIn">
                            <div className="space-y-2 p-4 bg-black/20 rounded-xl">
                                <div className="flex justify-between text-sm">
                                    <label className="font-bold">Оцінка: {score}/10</label>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="1"
                                    value={score} onChange={(e) => setScore(Number(e.target.value))}
                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <Textarea label="Що сподобалось (Pros)" value={pros} onChange={(e) => setPros(e.target.value)} placeholder="Сильні сторони..." />
                            <Textarea label="Що не сподобалось (Cons)" value={cons} onChange={(e) => setCons(e.target.value)} placeholder="Слабкі сторони..." />
                            <Textarea label="Загальне резюме (Summary)" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Висновок..." required />

                            <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>Відправити фідбек</Button>
                        </form>
                    )}
                </Card>
            )}

            {showDatePicker && (() => {
                const lastSlotStr = selectedSlots[selectedSlots.length - 1];
                const initialDate = lastSlotStr ? new Date(lastSlotStr.split('|')[0]) : null;
                const initialTimes = initialDate
                    ? selectedSlots
                        .filter(s => new Date(s.split('|')[0]).toDateString() === initialDate.toDateString())
                        .map(s => {
                            const d = new Date(s.split('|')[0]);
                            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                        })
                    : [];

                return (
                    <DateTimePicker
                        mode="datetime"
                        initialDate={initialDate}
                        initialTimes={initialTimes}
                        getExistingTimes={(date: Date) =>
                            selectedSlots
                                .filter(s => new Date(s.split('|')[0]).toDateString() === date.toDateString())
                                .map(s => {
                                    const d = new Date(s.split('|')[0]);
                                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                })
                        }
                        onSelect={handleAddSlot}
                        onCancel={() => setShowDatePicker(false)}
                    />
                );
            })()}
        </div>
    );
};

const InfoItem = ({ icon, label, value, copyValue, title, isLink, linkUrl }: any) => {
    const { showToast } = useToast();
    const handleAction = () => {
        if (isLink && linkUrl) {
            window.open(linkUrl, '_blank');
            return;
        }
        if (copyValue) {
            const textToCopy = label === 'Телефон' ? copyValue.replace(/[^\d+]/g, '') : copyValue;
            navigator.clipboard.writeText(textToCopy);
            showToast(title || 'Скопійовано', 'success');
        }
    };

    return (
        <div
            className={cn(
                "space-y-1 group transition-all duration-300",
                (copyValue || isLink) && "cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-xl"
            )}
            onClick={handleAction}
        >
            <div className="flex justify-between items-center">
                <label className="text-[10px] text-hint uppercase font-black tracking-tighter opacity-70 group-hover:text-primary transition-colors">
                    {label}
                </label>
                {(copyValue || isLink) && (
                    <span className="opacity-0 group-hover:opacity-100 text-xs transition-opacity duration-300 translate-y-0.5">
                        {isLink ? '🔗' : '📋'}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <span className={cn(
                    "font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-colors text-white",
                    (copyValue || isLink) && "group-hover:text-primary",
                    isLink && "text-primary decoration-primary/30 group-hover:underline"
                )}>
                    {value}
                </span>
            </div>
        </div>
    );
};

const FeedbackDisplay = ({ label, value, color, italic }: any) => (
    <div className="space-y-1">
        <strong className={cn("block text-xs uppercase tracking-wider", color)}>{label}:</strong>
        <p className={cn("text-sm opacity-90 whitespace-pre-wrap", italic && "italic")}>{value || '-'}</p>
    </div>
);
