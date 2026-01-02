import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { useTelegram } from '../hooks/useTelegram';
import { DateTimePicker } from './DateTimePicker';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from './ConfirmDialog';
import { cn } from '../utils/cn';

interface ApplicationDetailProps {
    id: number;
    onClose: () => void;
    onUpdate: (newTab?: string) => void;
    role?: 'hr' | 'interviewer';
}

export const ApplicationDetail: React.FC<ApplicationDetailProps> = ({ id, onClose, onUpdate, role = 'hr' }) => {
    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSlotPicker, setShowSlotPicker] = useState(false);
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);

    // Finalization state
    const [showFinalize, setShowFinalize] = useState(false);
    const [locationType, setLocationType] = useState<'online' | 'office'>('online');
    const [details, setDetails] = useState({ meet_link: '', address: '' });

    // Tech move state
    const [showTechMove, setShowTechMove] = useState(false);
    const [interviewers, setInterviewers] = useState<any[]>([]);

    // Reject state
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);

    // Feedback state
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedback, setFeedback] = useState({
        score: 5,
        pros: '',
        cons: '',
        summary: ''
    });

    const rejectFormRef = useRef<HTMLDivElement>(null);
    const slotPickerRef = useRef<HTMLDivElement>(null);
    const finalizeRef = useRef<HTMLDivElement>(null);
    const techMoveRef = useRef<HTMLDivElement>(null);
    const feedbackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showRejectForm && rejectFormRef.current) {
            setTimeout(() => {
                rejectFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [showRejectForm]);

    useEffect(() => {
        if (showSlotPicker && slotPickerRef.current) {
            setTimeout(() => {
                slotPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [showSlotPicker]);

    useEffect(() => {
        if (showFinalize && finalizeRef.current) {
            setTimeout(() => {
                finalizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [showFinalize]);

    useEffect(() => {
        if (showTechMove && techMoveRef.current) {
            setTimeout(() => {
                techMoveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [showTechMove]);

    useEffect(() => {
        const fetchFeedback = async () => {
            if (showFeedbackForm && role === 'interviewer') {
                try {
                    const data = await api.get(`/interviewer/applications/${id}/feedback`);
                    if (data.feedback) {
                        setFeedback({
                            score: data.feedback.score || 5,
                            pros: data.feedback.pros || '',
                            cons: data.feedback.cons || '',
                            summary: data.feedback.summary || ''
                        });
                    }
                    setTimeout(() => {
                        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                } catch (e) {
                    console.error("Failed to fetch feedback", e);
                }
            }
        };
        fetchFeedback();
    }, [showFeedbackForm, id, role]);

    const { tg } = useTelegram();
    const { showToast } = useToast();

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const endpoint = role === 'interviewer' ? `/interviewer/applications/${id}` : `/hr/applications/${id}`;
            const data = await api.get(endpoint);
            setApplication(data);
        } catch (e) {
            console.error(e);
            showToast('Помилка завантаження деталей', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const handleAction = async (action: 'accept' | 'reject') => {
        if (action === 'reject') {
            if (!showRejectForm) {
                setShowRejectForm(true);
                return;
            }
            if (!rejectReason.trim()) {
                showToast('Вкажіть причину відмови', 'error');
                return;
            }
            try {
                await api.post(`/hr/applications/${id}/reject`, { reason: rejectReason });
                showToast('Заявку відхилено', 'info');
                onUpdate('archive');
                onClose();
            } catch (e) {
                showToast('Помилка при відхиленні', 'error');
            }
            return;
        }

        if (action === 'accept') {
            setShowAcceptConfirm(true);
        }
    };

    const confirmAccept = async () => {
        setShowAcceptConfirm(false);
        try {
            await api.post(`/hr/applications/${id}/accept`);
            showToast('Заявку прийнято! Вона тепер у вкладці "В роботі".', 'success');
            onUpdate('processing');
            onClose();
        } catch (e) {
            showToast('Помилка при прийнятті', 'error');
        }
    };

    const handleStartInterview = async (slots: any[]) => {
        try {
            const endpoint = role === 'interviewer'
                ? `/interviewer/applications/${id}/interview/schedule`
                : `/hr/applications/${id}/screening/start`;

            await api.post(endpoint, {
                slots,
                location_type: locationType,
                details
            });
            showToast('Запрошення надіслано кандидату', 'success');
            onUpdate();
            onClose();
        } catch (e) {
            showToast('Помилка при створенні запиту', 'error');
        }
    };

    const handleFinalizeInterview = async (data: any) => {
        try {
            const endpoint = role === 'interviewer'
                ? `/interviewer/applications/${id}/interview/finalize`
                : `/hr/applications/${id}/screening/finalize`;

            await api.post(endpoint, data);
            showToast('Співбесіду успішно сплановано', 'success');
            onUpdate();
            onClose();
        } catch (e) {
            showToast('Помилка при фіналізації', 'error');
        }
    };

    const handleMoveToTech = async (data: any) => {
        try {
            await api.post(`/hr/applications/${id}/tech/move`, data);
            showToast('Заявку переведено на технічний етап', 'success');
            onUpdate();
            fetchDetail();
        } catch (e) {
            showToast('Помилка при переводі', 'error');
        }
    };

    const handleClaim = async () => {
        try {
            await api.post(`/interviewer/applications/${id}/claim`);
            showToast('Кандидата успішно закріплено за вами', 'success');
            onUpdate();
            onClose();
        } catch (e) {
            showToast('Помилка при взятті в роботу', 'error');
        }
    };

    const handleSubmitFeedback = async () => {
        if (!feedback.summary.trim()) {
            showToast('Будь ласка, напишіть короткий висновок', 'error');
            return;
        }
        try {
            await api.post(`/interviewer/applications/${id}/feedback`, feedback);
            showToast('Відгук надіслано', 'success');
            onUpdate();
            onClose();
        } catch (e) {
            showToast('Помилка при відправці відгуку', 'error');
        }
    };

    const handleFinalDecision = async (decision: 'hire' | 'reject') => {
        if (decision === 'reject') {
            setShowRejectForm(true);
            return;
        }
        try {
            await api.post(`/hr/applications/${id}/hire`);
            showToast('Кандидата успішно найнято!', 'success');
            onUpdate('archive');
            onClose();
        } catch (e) {
            showToast('Помилка при зміні статусу', 'error');
        }
    };

    if (loading) {
        return createPortal(
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>,
            document.body
        );
    }

    if (!application) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={onClose}>
            <Card
                className="w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[#121416] border-t sm:border border-white/10 shadow-2xl rounded-t-[32px] sm:rounded-[32px] animate-slideUp sm:animate-scaleIn cursor-default"
                glass={false}
                noAnimate
                onClick={(e) => e.stopPropagation()}
            >
                {/* ... existing header ... */}
                <header className="flex justify-between items-center px-6 py-5 border-b border-white/10 bg-[#121416] z-20">
                    <div className="space-y-0.5">
                        <h2 className="text-lg font-extrabold text-white leading-tight">{application.candidate_name}</h2>
                        <p className="text-primary font-bold tracking-widest uppercase text-[9px] opacity-80">{application.position}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-hint hover:text-white hover:bg-white/10 transition-all text-xl"
                    >
                        &times;
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10">

                    <section className="space-y-4">
                        <div className="grid grid-cols-2 gap-6 pb-6">
                            <div className="space-y-1">
                                <span className="text-[10px] text-hint uppercase font-bold tracking-wider">Досвід</span>
                                <span className="font-semibold text-white block">{application.experience_years || 0} років</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-hint uppercase font-bold tracking-wider">Email</span>
                                <div
                                    className="flex items-center gap-2 group cursor-pointer"
                                    onClick={() => {
                                        if (application.email) {
                                            navigator.clipboard.writeText(application.email);
                                            showToast('Email скопійовано', 'success');
                                        }
                                    }}
                                >
                                    <span className="text-white font-semibold break-all block hover:text-primary transition-colors">{application.email}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-all text-xs" title="Копіювати">📋</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-hint uppercase font-bold tracking-wider">Телефон</span>
                                <div
                                    className="flex items-center gap-2 group cursor-pointer"
                                    onClick={() => {
                                        if (application.phone) {
                                            const cleanPhone = application.phone.replace(/[^\d+]/g, '');
                                            navigator.clipboard.writeText(cleanPhone);
                                            showToast('Номер телефону скопійовано', 'success');
                                        }
                                    }}
                                >
                                    <span className="font-semibold text-white block hover:text-primary transition-colors">{application.phone || '—'}</span>
                                    {application.phone && <span className="opacity-0 group-hover:opacity-100 transition-all text-xs" title="Копіювати">📋</span>}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-hint uppercase font-bold tracking-wider">Дата подачі</span>
                                <span className="font-semibold text-white block">
                                    {new Date(application.created_at).toLocaleString('uk-UA', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }).replace(',', '')}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-hint uppercase font-bold tracking-wider">Англійська</span>
                                <span className="font-semibold text-white block">{application.english_level || '—'}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <span className="text-hint text-sm block">Технічні навички (деталі)</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {application.skills_details?.map((skill: any) => (
                                    <div key={skill.name} className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-xl border border-white/5">
                                        <span className="text-sm font-medium text-white/90">{skill.name}</span>
                                        <Badge variant="blue" className="text-[10px]">
                                            {skill.exp > 0 ? `${skill.exp} р.` : '< 1 р.'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                            {!application.skills_details?.length && (
                                <div className="flex flex-wrap gap-2">
                                    {application.skills?.map((skill: string) => (
                                        <Badge key={skill} variant="blue">{skill}</Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {['education', 'previous_work', 'additional_info'].map((key) => {
                            const labels: any = {
                                education: 'Освіта',
                                previous_work: 'Попередній досвід',
                                additional_info: 'Додаткова інформація'
                            };
                            return (
                                <div key={key} className="space-y-2 pt-6 border-t border-white/5">
                                    <h3 className="text-[10px] text-hint uppercase font-bold tracking-wider">{labels[key]}</h3>
                                    <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                                        {application[key] || <span className="italic opacity-50">Не вказано</span>}
                                    </p>
                                </div>
                            );
                        })}

                        {application.feedbacks?.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="font-bold text-lg">Відгуки інтерв'юерів</h3>
                                {application.feedbacks.map((f: any, i: number) => (
                                    <div key={i} className="bg-white/5 p-4 rounded-2xl space-y-2 border border-white/5">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-sm">{f.interviewer_name}</span>
                                            <Badge variant={f.score >= 8 ? 'green' : f.score >= 5 ? 'yellow' : 'red'}>
                                                Оцінка: {f.score}/10
                                            </Badge>
                                        </div>
                                        <p className="text-sm italic">"{f.summary}"</p>
                                        <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                                            {f.pros && (
                                                <div>
                                                    <span className="text-green-400 block font-bold">Плюси:</span>
                                                    <p className="opacity-70">{f.pros}</p>
                                                </div>
                                            )}
                                            {f.cons && (
                                                <div>
                                                    <span className="text-red-400 block font-bold">Мінуси:</span>
                                                    <p className="opacity-70">{f.cons}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {showSlotPicker && (
                        <div ref={slotPickerRef} className="space-y-4 pt-4 border-t border-white/10 animate-scaleIn">
                            <div className="space-y-4 px-1">
                                <h3 className="font-bold">📍 Деталі зустрічі</h3>

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

                                <div className="space-y-2 animate-scaleIn">
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
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="font-bold">🗓️ Оберіть слоти</h3>
                                    {slots.length > 0 && (
                                        <button
                                            onClick={() => setSlots([])}
                                            className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-wider transition-colors"
                                        >
                                            🗑️ Очистити все
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 px-1">
                                    {slots.map((s, idx) => (
                                        <Badge key={idx} variant="blue" className="pr-1 py-1 px-3 rounded-lg">
                                            {new Date(s.start).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            <button className="ml-2 hover:text-red-400" onClick={() => setSlots(slots.filter((_, i) => i !== idx))}>&times;</button>
                                        </Badge>
                                    ))}
                                </div>

                                <div className="space-y-4 px-1">
                                    <Button
                                        variant="secondary"
                                        className="w-full h-10 px-3 text-xs font-bold border-dashed border-primary/40 text-primary bg-primary/5 flex items-center justify-center gap-2"
                                        onClick={() => setShowDateTimePicker(true)}
                                    >
                                        <span>➕ Додати час</span>
                                    </Button>

                                    {slots.length > 0 && (
                                        <Button className="w-full py-4 shadow-lg shadow-primary/20" onClick={() => handleStartInterview(slots)}>
                                            🚀 Відправити запрошення
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {showDateTimePicker && (() => {
                                const lastSlot = slots[slots.length - 1];
                                const initialDate = lastSlot ? new Date(lastSlot.start) : null;
                                const initialTimes = initialDate
                                    ? slots
                                        .filter(s => new Date(s.start).toDateString() === initialDate.toDateString())
                                        .map(s => {
                                            const d = new Date(s.start);
                                            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                        })
                                    : [];

                                return (
                                    <DateTimePicker
                                        mode="datetime"
                                        initialDate={initialDate}
                                        initialTimes={initialTimes}
                                        getExistingTimes={(date: Date) =>
                                            slots
                                                .filter(s => new Date(s.start).toDateString() === date.toDateString())
                                                .map(s => {
                                                    const d = new Date(s.start);
                                                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                                })
                                        }
                                        onSelect={(date: Date | null, times: string[]) => {
                                            if (date && times.length > 0) {
                                                const newSlotsForDate = times.map((time: string) => {
                                                    const [h, m] = time.split(':');
                                                    const start = new Date(date);
                                                    start.setHours(parseInt(h), parseInt(m), 0, 0);
                                                    const end = new Date(start.getTime() + 3600000);
                                                    return { start: start.toISOString(), end: end.toISOString() };
                                                });

                                                // Filter out old slots for this date and add new ones
                                                const otherSlots = slots.filter(s => new Date(s.start).toDateString() !== date.toDateString());
                                                const updatedSlots = [...otherSlots, ...newSlotsForDate].sort((a, b) =>
                                                    new Date(a.start).getTime() - new Date(b.start).getTime()
                                                );
                                                setSlots(updatedSlots);
                                            }
                                            setShowDateTimePicker(false);
                                            setTimeout(() => {
                                                slotPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }, 100);
                                        }}
                                        onCancel={() => setShowDateTimePicker(false)}
                                    />
                                );
                            })()}
                        </div>
                    )}

                    {showFinalize && (() => {
                        const isConfirmed = application.interviews?.some((i: any) => i.type === 'hr_screening' && i.confirmed);
                        return (
                            <div ref={finalizeRef} className="space-y-4 pt-4 border-t border-white/10 animate-scaleIn">
                                <h3 className="font-bold text-center">
                                    {isConfirmed ? '✏️ Оновлення деталей' : '📍 Підтвердження зустрічі'}
                                </h3>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                                    <button
                                        className={`py-2 text-xs font-bold rounded-lg transition-all ${locationType === 'online' ? 'bg-primary text-white shadow-lg' : 'text-hint'}`}
                                        onClick={() => setLocationType('online')}
                                    >
                                        🌐 Online
                                    </button>
                                    <button
                                        className={`py-2 text-xs font-bold rounded-lg transition-all ${locationType === 'office' ? 'bg-primary text-white shadow-lg' : 'text-hint'}`}
                                        onClick={() => setLocationType('office')}
                                    >
                                        🏢 Office
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-hint uppercase font-bold ml-1">{locationType === 'online' ? 'Meet Link' : 'Адреса'}</label>
                                    <input
                                        className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none"
                                        placeholder={locationType === 'online' ? 'https://meet.google.com/...' : 'вул. Прикладна, 1'}
                                        value={locationType === 'online' ? details.meet_link : details.address}
                                        onChange={(e) => setDetails({ ...details, [locationType === 'online' ? 'meet_link' : 'address']: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button className="w-full py-4 shadow-lg shadow-primary/20" onClick={() => handleFinalizeInterview({
                                        interview_id: application.active_interview?.id || application.interviews?.find((i: any) => i.type === (role === 'interviewer' ? 'technical' : 'hr_screening'))?.id,
                                        location_type: locationType,
                                        details
                                    })}>
                                        {isConfirmed ? '💾 Зберегти зміни' : '✅ Підтвердити зустріч'}
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}

                    {application.tech_interviewer_name && (
                        <section className="space-y-2 pt-4 border-t border-white/5 animate-fadeIn">
                            <h3 className="text-[10px] text-hint uppercase font-bold tracking-wider">Закріплений тех-експерт</h3>
                            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">👨‍💻</div>
                                <span className="font-bold text-white text-sm">{application.tech_interviewer_name}</span>
                            </div>
                        </section>
                    )}

                    {showTechMove && (
                        <div ref={techMoveRef} className="space-y-4 pt-4 border-t border-white/10 animate-scaleIn">
                            <h3 className="font-bold text-center">👨‍💻 Технічне інтерв'ю</h3>
                            <div className="space-y-2">
                                <p className="text-[10px] text-hint uppercase font-bold text-center">Оберіть експерта</p>
                                <div className="grid gap-2 max-h-40 overflow-y-auto">
                                    {interviewers.length === 0 && (
                                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center space-y-2">
                                            <p className="text-xs font-bold text-orange-400">⚠️ Немає доступних експертів</p>
                                            <p className="text-[10px] opacity-70 text-white/80 leading-relaxed">
                                                Наразі в системі немає жодного технічного інтерв'юера. Ви можете додати заявку до загального пулу, щоб будь-який вільний експерт міг її взяти пізніше.
                                            </p>
                                        </div>
                                    )}
                                    {interviewers.map(i => (
                                        <button
                                            key={i.id}
                                            className="w-full glass p-3 rounded-xl border border-white/5 hover:border-primary/40 text-left transition-all flex justify-between items-center group"
                                            onClick={() => handleMoveToTech({ mode: 'assign', interviewer_id: i.id })}
                                        >
                                            <span className="text-sm font-medium">{i.full_name}</span>
                                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Призначити</span>
                                        </button>
                                    ))}
                                    <button
                                        className="w-full glass p-3 rounded-xl border border-dashed border-white/10 hover:border-primary/40 text-center transition-all bg-white/5"
                                        onClick={() => handleMoveToTech({ mode: 'pool' })}
                                    >
                                        <span className="text-xs font-bold text-primary">Додати в загальний пул</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showRejectForm && (
                        <div ref={rejectFormRef} className="space-y-4 pt-4 border-t border-red-500/20 animate-scaleIn">
                            <h3 className="font-bold text-center text-red-500">❌ Відхилення заявки</h3>
                            <div className="space-y-2">
                                <label className="text-[10px] text-hint uppercase font-bold ml-1">Причина відмови</label>
                                <textarea
                                    className="w-full glass border border-red-500/20 rounded-xl px-4 py-3 text-sm focus:border-red-500/50 outline-none min-h-[100px] resize-none"
                                    placeholder="Наприклад: Недостатній рівень англійської мови..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="w-full py-4 bg-red-600 border-none shadow-lg shadow-red-500/20 font-bold"
                                    onClick={() => handleAction('reject')}
                                >
                                    🛑 ПІДТВЕРДИТИ ВІДХИЛЕННЯ
                                </Button>
                            </div>
                        </div>
                    )}

                    {showFeedbackForm && (
                        <div ref={feedbackRef} className="space-y-4 pt-4 border-t border-primary/20 animate-scaleIn">
                            <h3 className="font-bold text-center text-primary">📝 Технічний фідбек</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-hint uppercase font-bold ml-1">Загальна оцінка (1-10)</label>
                                    <div className="flex justify-between items-center gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setFeedback({ ...feedback, score: s })}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-xs font-bold transition-all border",
                                                    feedback.score === s
                                                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110"
                                                        : "bg-white/5 border-white/10 text-hint hover:border-white/20"
                                                )}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-green-400 uppercase font-bold ml-1">Плюси</label>
                                        <textarea
                                            className="w-full glass border border-green-500/20 rounded-xl px-3 py-2 text-sm focus:border-green-500/50 outline-none min-h-[80px] resize-none"
                                            placeholder="Що сподобалось..."
                                            value={feedback.pros}
                                            onChange={(e) => setFeedback({ ...feedback, pros: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-red-400 uppercase font-bold ml-1">Мінуси</label>
                                        <textarea
                                            className="w-full glass border border-red-500/20 rounded-xl px-3 py-2 text-sm focus:border-red-500/50 outline-none min-h-[80px] resize-none"
                                            placeholder="Чого не вистачає..."
                                            value={feedback.cons}
                                            onChange={(e) => setFeedback({ ...feedback, cons: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] text-hint uppercase font-bold ml-1">Загальний висновок</label>
                                    <textarea
                                        className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none min-h-[100px] resize-none"
                                        placeholder="Ваше враження про кандидата..."
                                        value={feedback.summary}
                                        onChange={(e) => setFeedback({ ...feedback, summary: e.target.value })}
                                    />
                                </div>

                                <Button
                                    className="w-full py-4 shadow-lg shadow-primary/20 font-bold"
                                    onClick={handleSubmitFeedback}
                                >
                                    🚀 ВІДПРАВИТИ ФІДБЕК
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="px-6 py-6 border-t border-white/10 bg-[#121416] z-20 flex flex-col gap-4 pb-safe sm:pb-6">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] text-hint uppercase font-bold tracking-widest">Керування заявкою</span>
                        <Badge variant={(() => {
                            const s = application.status.toLowerCase();
                            if (s === 'pending') return 'info';
                            if (['accepted', 'screening_pending', 'screening_scheduled', 'tech_pending', 'tech_scheduled', 'processing'].includes(s)) return 'pending';
                            if (s === 'hired' || s === 'completed') return 'success';
                            if (s === 'rejected' || s === 'cancelled') return 'danger';
                            return 'info';
                        })()} className="text-[9px] px-2 py-0.5 uppercase">
                            {(() => {
                                const s = application.status.toLowerCase();
                                const map: any = {
                                    'pending': 'Нова',
                                    'accepted': 'Прийнята',
                                    'screening_pending': 'Запрошено',
                                    'screening_scheduled': 'Заплановано',
                                    'tech_pending': 'Тех. етап (пул)',
                                    'tech_scheduled': 'Тех. етап (сплановано)',
                                    'tech_completed': 'Тех. завершено',
                                    'processing': 'В обробці',
                                    'rejected': 'Відхилено',
                                    'declined': 'Відхилено',
                                    'hired': 'Найнято',
                                    'cancelled': 'Скасовано',
                                    'completed': 'Завершено',
                                };
                                return map[s] || s;
                            })()}
                        </Badge>
                    </div>

                    {(() => {
                        const s = application.status.toLowerCase();
                        // Hide screening info if already at tech stage or beyond,
                        // UNLESS we are an interviewer and there is a technical interview to show
                        const isInterviewer = role === 'interviewer';

                        if (!isInterviewer && ['tech_pending', 'tech_scheduled', 'tech_completed', 'hired', 'rejected', 'cancelled', 'completed'].includes(s)) {
                            return null;
                        }

                        // Determine which interview to show
                        let selectedInterview = null;
                        if (isInterviewer) {
                            selectedInterview = application.active_interview;
                        } else {
                            selectedInterview = application.interviews?.find((i: any) => i.type === 'hr_screening' && i.selected_time);
                        }

                        if (!selectedInterview || !selectedInterview.selected_time) return null;

                        const isConfirmed = selectedInterview.is_confirmed || selectedInterview.confirmed;

                        return (
                            <div className="space-y-2 animate-scaleIn">
                                <div className="px-1 flex justify-between items-center">
                                    <span className="text-[10px] text-white/60 uppercase font-black tracking-[0.2em]">
                                        {isConfirmed ? '✅ Підтверджена зустріч' : '⌛ Кандидат обрав час'}
                                    </span>
                                </div>
                                <div className={`glass p-4 rounded-2xl border-white/10 ${isConfirmed ? 'bg-primary/10 border-primary/20' : 'bg-white/5'} flex flex-col gap-3`}>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="text-xl font-black text-white leading-none">
                                                {new Date(selectedInterview.selected_time).toLocaleString('uk-UA', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            {(selectedInterview.link || selectedInterview.meet_link || selectedInterview.address) && (
                                                <div className="flex items-center gap-1.5 pt-1.5">
                                                    {(selectedInterview.link || selectedInterview.meet_link) ? (
                                                        <a
                                                            href={selectedInterview.link || selectedInterview.meet_link}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-sm text-primary font-bold hover:underline flex items-center gap-1.5"
                                                        >
                                                            <span className="opacity-70 text-base">🔗</span> {selectedInterview.link || selectedInterview.meet_link}
                                                        </a>
                                                    ) : (
                                                        <span className="text-sm text-white/70 flex items-center gap-1.5 font-medium">
                                                            <span className="opacity-70 text-base">📍</span> {selectedInterview.address}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`text-2xl ${!isConfirmed ? 'animate-pulse' : ''}`}>🕒</div>
                                    </div>

                                </div>
                            </div>
                        );
                    })()}

                    {(() => {
                        const s = application.status.toLowerCase();
                        const isAnyFormOpen = showRejectForm || showSlotPicker || showFinalize || showTechMove || showFeedbackForm;
                        const isInterviewer = role === 'interviewer';

                        // Helper for already assigned users (HR/Interviewer)
                        const renderActionButtons = (primaryAction?: React.ReactNode, secondaryLabel: string = 'Відхилити кандидата', hideSecondary: boolean = false) => (
                            <div className="flex flex-col gap-2">
                                {isAnyFormOpen ? (
                                    <Button
                                        variant="secondary"
                                        className="w-full py-4 text-sm font-bold animate-fadeIn"
                                        onClick={() => {
                                            setShowRejectForm(false);
                                            setShowSlotPicker(false);
                                            setSlots([]);
                                            setShowFinalize(false);
                                            setShowTechMove(false);
                                            setShowFeedbackForm(false);
                                        }}
                                    >
                                        🔙 Скасувати
                                    </Button>
                                ) : (
                                    <>
                                        {primaryAction}
                                        {!isInterviewer && !hideSecondary && (
                                            <Button
                                                variant="danger"
                                                className="w-full py-3 text-xs opacity-60 hover:opacity-100"
                                                onClick={() => setShowRejectForm(true)}
                                            >
                                                ❌ {secondaryLabel}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        );

                        // Interviewer Workflow
                        if (isInterviewer) {
                            // 1. Leave feedback for tech_scheduled or tech_completed
                            if (['tech_scheduled', 'tech_completed'].includes(s)) {
                                return renderActionButtons(
                                    <Button
                                        className="w-full py-4 text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-600 border-none shadow-lg shadow-primary/20"
                                        onClick={() => setShowFeedbackForm(true)}
                                    >
                                        {application.feedbacks?.some((f: any) => f.interviewer_name === application.tech_interviewer_name)
                                            ? '✏️ Змінити тех-фідбек'
                                            : '📝 Залишити тех-фідбек'}
                                    </Button>
                                );
                            }

                            // 2. Claim application from pool (tech_pending and unassigned)
                            if (s === 'tech_pending' && !application.tech_interviewer_id) {
                                return renderActionButtons(
                                    <Button className="w-full py-4 text-sm font-bold shadow-lg shadow-primary/20" onClick={handleClaim}>
                                        📥 Взяти в роботу
                                    </Button>
                                );
                            }

                            // 3. Assigned Interviewer: Confirm/Update meeting for tech_pending or tech_scheduled
                            if (['tech_pending', 'tech_scheduled'].includes(s) && application.tech_interviewer_id) {
                                const hasSelectedTime = application.active_interview?.selected_time;
                                const isConfirmed = application.active_interview?.is_confirmed;

                                if (isConfirmed) {
                                    return renderActionButtons(
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="secondary"
                                                className="w-full py-4 text-sm font-bold opacity-80"
                                                onClick={() => {
                                                    const interview = application.active_interview;
                                                    if (interview) {
                                                        setLocationType(interview.location_type || 'online');
                                                        setDetails({
                                                            meet_link: interview.meet_link || '',
                                                            address: interview.address || ''
                                                        });
                                                    }
                                                    setShowFinalize(true);
                                                }}
                                            >
                                                ✏️ Оновити деталі зустрічі
                                            </Button>
                                        </div>
                                    );
                                }

                                if (hasSelectedTime) {
                                    return renderActionButtons(
                                        <Button
                                            className="w-full py-4 text-sm font-bold shadow-lg shadow-primary/20"
                                            onClick={() => {
                                                const interview = application.active_interview;
                                                if (interview) {
                                                    setLocationType(interview.location_type || 'online');
                                                    setDetails({
                                                        meet_link: interview.meet_link || '',
                                                        address: interview.address || ''
                                                    });
                                                }
                                                setShowFinalize(true);
                                            }}
                                        >
                                            📍 Підтвердити зустріч
                                        </Button>
                                    );
                                }

                                return renderActionButtons(
                                    <Button
                                        className="w-full py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                        onClick={() => setShowSlotPicker(true)}
                                    >
                                        🗓️ Запросити на тех-інтерв'ю
                                    </Button>
                                );
                            }
                        }

                        // HR Workflow
                        if (s === 'pending' && role === 'hr') {
                            return renderActionButtons(
                                <Button className="w-full py-4 text-sm font-bold shadow-lg shadow-primary/20" onClick={() => handleAction('accept')}>
                                    ✅ Прийняти
                                </Button>,
                                'Відхилити'
                            );
                        }

                        if (s === 'accepted' && role === 'hr') {
                            return renderActionButtons(
                                <Button
                                    className="w-full py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                    onClick={() => setShowSlotPicker(true)}
                                >
                                    🗓️ Запросити на скрінінг
                                </Button>
                            );
                        }

                        if (['screening_pending', 'screening_scheduled'].includes(s) && role === 'hr') {
                            const hasSelectedTime = application.interviews?.some((i: any) => i.type === 'hr_screening' && i.selected_time);
                            const isConfirmed = application.interviews?.some((i: any) => i.type === 'hr_screening' && i.confirmed);

                            if (isConfirmed) {
                                return renderActionButtons(
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full py-4 text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-500/20"
                                            onClick={async () => {
                                                try {
                                                    const { interviewers } = await api.get('/hr/interviewers');
                                                    setInterviewers(interviewers);
                                                    setShowTechMove(true);
                                                } catch (e) {
                                                    tg.showAlert('Помилка завантаження списку експертів');
                                                }
                                            }}
                                        >
                                            👨‍💻 Перейти на технічний етап
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="w-full py-2 text-xs font-bold opacity-80"
                                            onClick={() => {
                                                const hrInterview = application.interviews?.find((i: any) => i.type === 'hr_screening');
                                                if (hrInterview) {
                                                    setLocationType(hrInterview.location || 'online');
                                                    setDetails({
                                                        meet_link: hrInterview.link || '',
                                                        address: hrInterview.address || ''
                                                    });
                                                }
                                                setShowFinalize(true);
                                            }}
                                        >
                                            ✏️ Оновити деталі зустрічі
                                        </Button>
                                    </div>
                                );
                            }

                            return renderActionButtons(
                                hasSelectedTime ? (
                                    <Button
                                        className="w-full py-4 text-sm font-bold shadow-lg shadow-primary/20"
                                        onClick={() => {
                                            const hrInterview = application.interviews?.find((i: any) => i.type === 'hr_screening');
                                            if (hrInterview) {
                                                setLocationType(hrInterview.location || 'online');
                                                setDetails({
                                                    meet_link: hrInterview.link || '',
                                                    address: hrInterview.address || ''
                                                });
                                            }
                                            setShowFinalize(true);
                                        }}
                                    >
                                        📍 Підтвердити зустріч
                                    </Button>
                                ) : (
                                    <div className="glass p-4 rounded-2xl text-center space-y-1">
                                        <p className="text-sm font-bold text-hint">⏳ Очікуємо вибору часу</p>
                                        <p className="text-[10px] opacity-60">Кандидат отримав посилання на вибір слотів</p>
                                    </div>
                                )
                            );
                        }

                        if (['processing'].includes(s) && role === 'hr') {
                            return renderActionButtons(
                                <Button
                                    className="w-full py-4 text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-500/20"
                                    onClick={async () => {
                                        try {
                                            const { interviewers } = await api.get('/hr/interviewers');
                                            setInterviewers(interviewers);
                                            setShowTechMove(true);
                                        } catch (e) {
                                            tg.showAlert('Помилка завантаження списку експертів');
                                        }
                                    }}
                                >
                                    👨‍💻 Перейти на технічний етап
                                </Button>
                            );
                        }

                        if (['tech_completed'].includes(s) && role === 'hr') {
                            return renderActionButtons(
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        className="py-4 bg-green-600 border-none shadow-lg shadow-green-500/20 font-bold"
                                        onClick={() => handleFinalDecision('hire')}
                                    >
                                        ✅ НАЙНЯТИ
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="py-4 bg-red-600/10 text-red-500 border-red-500/20 font-bold"
                                        onClick={() => handleFinalDecision('reject')}
                                    >
                                        ❌ ВІДМОВИТИ
                                    </Button>
                                </div>,
                                'Відхилити',
                                true
                            );
                        }


                        return null;
                    })()}
                </footer>
            </Card>

            <ConfirmDialog
                isOpen={showAcceptConfirm}
                title="Прийняти в роботу?"
                message="Ви збираєтеся прийняти цю заявку. Вона перейде до списку обробки."
                confirmLabel="Так, прийняти"
                cancelLabel="Скасувати"
                onConfirm={confirmAccept}
                onCancel={() => setShowAcceptConfirm(false)}
            />
        </div>,
        document.body
    );
};
