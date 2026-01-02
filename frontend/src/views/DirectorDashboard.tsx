import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { useTelegram } from '../hooks/useTelegram';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Select } from '../components/Select';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface Invite {
    id: number;
    role: string;
    invite_url: string;
    is_used: boolean;
    expires_at?: string;
    used_at?: string;
}

type DirectorTab = 'overview' | 'staff';

export const DirectorDashboard: React.FC = () => {
    const { tg } = useTelegram();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<DirectorTab>('overview');
    const [manualId, setManualId] = useState('');
    const [manualRole, setManualRole] = useState('hr');
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const fetchData = async () => {
        try {
            const [rolesData, analyticsData, staffData] = await Promise.all([
                api.get('/director/roles'),
                api.get('/analyst/dashboard'),
                api.get('/director/staff')
            ]);
            setInvites(rolesData.invites || []);
            setAnalytics(analyticsData);
            setStaff(staffData.staff || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateInvite = async (role: string) => {
        try {
            await api.post('/director/invite/create', { role });
            fetchData();
            if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } catch (e) {
            alert('Помилка при створенні запрошення');
        }
    };

    const handleDeleteInvite = async (id: number) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Видалити посилання?',
            message: 'Ви впевнені, що хочете видалити це запрошення? Це посилання більше не працюватиме.',
            onConfirm: async () => {
                try {
                    await api.delete(`/director/invite/${id}`);
                    fetchData();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (e) {
                    alert('Помилка при видаленні');
                }
            }
        });
    };

    const handleResetRole = async (userId: number, name: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Скинути роль?',
            message: `Ви впевнені, що хочете скинути роль для ${name}? Користувач знову стане кандидатом.`,
            onConfirm: async () => {
                try {
                    await api.post(`/director/staff/${userId}/reset`);
                    fetchData();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                } catch (e) {
                    alert('Помилка при скиданні ролі');
                }
            }
        });
    };

    const handleManualAssign = async () => {
        if (!manualId) return alert('Введіть ID!');
        try {
            await api.post('/director/staff/assign', { id: manualId, role: manualRole });
            setManualId('');
            fetchData();
            if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            alert('Роль успішно призначено');
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Помилка при призначенні ролі');
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url).then(() => {
            if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
            alert('Посилання скопійовано!');
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-hint animate-pulse">Завантаження даних...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-fadeIn pb-24 max-w-4xl mx-auto px-1">
            <header className="px-2">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">👑 Director</h1>
                        <p className="text-hint font-medium">Панель управління та KPI</p>
                    </div>
                    <Badge variant="info" className="mb-1 font-mono uppercase text-[10px]">Executive</Badge>
                </div>

                <nav className="flex p-1 bg-secondary/40 rounded-2xl overflow-x-auto scrollbar-hide">
                    <TabButton
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                        label="Огляд"
                        icon="📊"
                    />
                    <TabButton
                        active={activeTab === 'staff'}
                        onClick={() => setActiveTab('staff')}
                        label="Персонал"
                        icon="👥"
                    />
                </nav>
            </header>

            <div className="mt-6 px-2">
                {activeTab === 'overview' && analytics && renderOverview(analytics)}
                {activeTab === 'staff' && (
                    <div className="space-y-8">
                        {/* MANUAL ASSIGN SECTION */}
                        <section className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/90 ml-1">👤 Призначити за ID</h2>
                            <Card className="p-4 bg-secondary/10 border-white/5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        placeholder="Telegram ID"
                                        value={manualId}
                                        onChange={(e) => setManualId(e.target.value)}
                                        className="bg-black/40 border-white/5"
                                    />
                                    <Select
                                        value={manualRole}
                                        onChange={(val) => setManualRole(val)}
                                        options={[
                                            { label: 'HR', value: 'hr' },
                                            { label: 'Інтерв\'юер', value: 'interviewer' },
                                            { label: 'Аналітик', value: 'analyst' },
                                            { label: 'Директор', value: 'director' },
                                            { label: 'Кандидат', value: 'candidate' }
                                        ]}
                                        className="mt-0"
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleManualAssign}
                                    disabled={!manualId}
                                >
                                    Надати доступ
                                </Button>
                            </Card>
                        </section>
                        {renderStaff(invites, staff, handleCreateInvite, handleDeleteInvite, handleResetRole, copyToClipboard)}
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                confirmLabel="Підтвердити"
            />
        </div>
    );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap min-w-fit flex-1 justify-center ${active
            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
            : 'text-hint hover:text-text hover:bg-white/5'
            }`}
    >
        <span className="text-lg">{icon}</span> {label}
    </button>
);

const renderOverview = (data: any) => {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(20, 20, 25, 0.9)',
                padding: 12,
                cornerRadius: 12,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }
        },
        scales: {
            y: {
                display: false,
                grid: { display: false }
            },
            x: {
                ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 9 } },
                grid: { display: false }
            }
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-3">
                <MetricCard
                    icon="🎯"
                    value={data.overview.total_applications}
                    label="Заявки"
                    trend="+12%"
                    labelClassName="text-white/70"
                />
                <MetricCard
                    icon="💼"
                    value={data.overview.hired}
                    label="Найми"
                    color="text-green-500"
                    labelClassName="text-white/70"
                />
                <MetricCard
                    icon="⌛"
                    value={`${data.time_to_review.average_hours}г`}
                    label="Час розгляду"
                    labelClassName="text-white/70"
                />
                <MetricCard
                    icon="📈"
                    value={`${data.conversion_metrics.application_to_hired}%`}
                    label="Конверсія"
                    color="text-primary"
                    labelClassName="text-white/70"
                />
            </div>

            <Card className="p-6 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black italic">ДИНАМІКА ПОДАЧ</h2>
                    <Badge variant="pending" className="text-[10px]">7 днів</Badge>
                </div>
                <div className="h-48">
                    <Line
                        options={chartOptions}
                        data={{
                            labels: data.weekly_dynamics.daily_data.map((d: any) => new Date(d.date).toLocaleDateString('uk-UA', { weekday: 'short' })),
                            datasets: [{
                                label: 'Заявки',
                                data: data.weekly_dynamics.daily_data.map((d: any) => d.count),
                                borderColor: '#3390ec',
                                backgroundColor: (context: any) => {
                                    const bg = context.chart.ctx.createLinearGradient(0, 0, 0, 200);
                                    bg.addColorStop(0, 'rgba(51, 144, 236, 0.3)');
                                    bg.addColorStop(1, 'rgba(51, 144, 236, 0)');
                                    return bg;
                                },
                                fill: true,
                                tension: 0.4,
                                pointRadius: 2,
                                borderWidth: 3
                            }]
                        }}
                    />
                </div>
            </Card>

            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Топ рекрутерів</h3>
                <div className="space-y-2">
                    {data.hr_activity.hr_details.slice(0, 3).map((hr: any, idx: number) => (
                        <div key={hr.hr_id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-white/40">#{idx + 1}</span>
                                <span className="font-bold text-sm text-white">{hr.hr_name}</span>
                            </div>
                            <div className="flex gap-3 items-center">
                                <Badge variant="secondary" className="text-[10px] text-white/90">{hr.reviewed} заявок</Badge>
                                <span className="text-green-500 text-xs font-bold">{hr.acceptance_rate}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const renderStaff = (
    invites: Invite[],
    staff: any[],
    onCreate: (role: string) => void,
    onDelete: (id: number) => void,
    onReset: (userId: number, name: string) => void,
    onCopy: (url: string) => void
) => {
    const activeInvites = invites.filter(i => !i.is_used);
    const usedInvites = invites.filter(i => i.is_used);

    // Group staff by role
    const groupedStaff = staff.reduce((acc: any, member: any) => {
        const role = member.role.toLowerCase();
        if (!acc[role]) acc[role] = [];
        acc[role].push(member);
        return acc;
    }, {});

    const roleConfigs: any = {
        director: { label: 'Директори', icon: '👑', color: 'bg-primary' },
        hr: { label: 'Рекрутери (HR)', icon: '👔', color: 'bg-green-500' },
        analyst: { label: 'Аналітики', icon: '📊', color: 'bg-purple-500' },
        interviewer: { label: 'Інтерв’юери', icon: '👥', color: 'bg-blue-500' }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* NEW INVITE SECTION */}
            <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/90 ml-1">➕ Нове запрошення</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InviteButton icon="👔" label="HR" onClick={() => onCreate('hr')} />
                    <InviteButton icon="👥" label="Інтерв'ю" onClick={() => onCreate('interviewer')} />
                    <InviteButton icon="📊" label="Аналітик" onClick={() => onCreate('analyst')} />
                    <InviteButton icon="👑" label="Директор" onClick={() => onCreate('director')} />
                </div>
            </section>

            {/* CURRENT STAFF SECTION - Grouped */}
            <section className="space-y-6">
                <div className="flex items-center justify-between ml-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">👥 Команда ({staff.length})</h2>
                    <Badge variant="secondary" className="text-[9px] opacity-60">Staff</Badge>
                </div>

                <div className="space-y-6">
                    {Object.keys(roleConfigs).map(roleKey => {
                        const members = groupedStaff[roleKey] || [];
                        if (members.length === 0) return null;
                        const config = roleConfigs[roleKey];

                        return (
                            <div key={roleKey} className="space-y-3">
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <span className="text-sm">{config.icon}</span>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">{config.label}</h3>
                                    <div className="h-[1px] flex-1 bg-white/5 ml-2"></div>
                                </div>
                                <div className="grid gap-2">
                                    {members.map((member: any) => (
                                        <Card key={member.id} className="p-4 flex justify-between items-center bg-secondary/15 border-white/5 hover:bg-secondary/25 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full ${config.color}/10 flex items-center justify-center text-xs font-black ${config.color.replace('bg-', 'text-')}`}>
                                                    {member.full_name?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-white group-hover:text-primary transition-colors">{member.full_name}</span>
                                                    <span className="text-[10px] text-white/40">@{member.username || member.telegram_id}</span>
                                                </div>
                                            </div>
                                            {member.role.toLowerCase() !== 'director' && (
                                                <button
                                                    onClick={() => onReset(member.id, member.full_name)}
                                                    className="w-8 h-8 rounded-lg bg-red-500/5 text-red-500/40 flex items-center justify-center hover:bg-orange-500/20 hover:text-orange-500 transition-all duration-300"
                                                    title="Зняти роль"
                                                >
                                                    ↩️
                                                </button>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ACTIVE LINKS SECTION */}
            <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/90 ml-1">🔗 Активні лінки ({activeInvites.length})</h2>
                <div className="grid gap-3">
                    {activeInvites.map(inv => (
                        <Card key={inv.id} className="p-4 border border-white/5 bg-secondary/10 relative overflow-hidden group">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{roleConfigs[inv.role.toLowerCase()]?.icon || '🔗'}</span>
                                    <Badge variant="info" className="uppercase font-black text-[9px] tracking-tighter px-2">
                                        {inv.role}
                                    </Badge>
                                </div>
                                <button
                                    onClick={() => onDelete(inv.id)}
                                    className="text-[10px] text-red-500/50 hover:text-red-500 font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                                >
                                    <span>видалити</span> 🗑️
                                </button>
                            </div>
                            <div className="flex gap-2 relative">
                                <Input
                                    value={inv.invite_url}
                                    readOnly
                                    className="flex-1 bg-black/40 border-white/5 font-mono text-[10px] pr-12 h-9"
                                    onClick={(e: any) => e.target.select()}
                                />
                                <div className="absolute right-0 top-0 bottom-0 pr-1 flex items-center">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-7 w-7 p-0 min-w-0 rounded-md hover:bg-primary transition-colors shadow-none"
                                        onClick={() => onCopy(inv.invite_url)}
                                    >
                                        📋
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {activeInvites.length === 0 && (
                        <div className="text-center py-8 bg-secondary/5 rounded-3xl border border-dashed border-white/5">
                            <p className="text-hint text-xs">Немає активних запрошень</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ARCHIVE - USED LINKS */}
            {usedInvites.length > 0 && (
                <section className="space-y-4 opacity-60">
                    <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-hint"></span>
                        Архів використаних
                    </h2>
                    <div className="space-y-2">
                        {usedInvites.slice(0, 5).map((inv: any) => (
                            <div key={inv.id} className="flex justify-between items-center bg-secondary/30 p-4 rounded-2xl text-xs border border-white/5">
                                <span className="font-black uppercase tracking-widest opacity-80">{inv.role}</span>
                                <span className="text-[10px] font-mono opacity-40">
                                    {inv.used_at ? new Date(inv.used_at).toLocaleDateString('uk-UA') : 'Давно'}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

const InviteButton = ({ icon, label, onClick }: any) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center p-4 bg-secondary/50 rounded-2xl hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all space-y-2 border border-white/5 shadow-lg group"
    >
        <span className="text-2xl group-hover:animate-bounce">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest mt-1 text-white">{label}</span>
    </button>
);

const MetricCard = ({ icon, value, label, trend, color = '', labelClassName = '' }: any) => (
    <Card className="flex flex-col items-center justify-center p-5 hover:scale-[1.02] transition-transform relative overflow-hidden group text-center min-h-[150px] bg-secondary/10 border-white/5">
        <div className="text-3xl mb-2 drop-shadow-md group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <div className="flex flex-col items-center z-10">
            <div className={`text-3xl font-black font-mono tracking-tighter ${color || 'text-white'}`}>{value}</div>
            <div className={`text-[10px] uppercase font-black tracking-widest leading-tight mt-1 ${labelClassName || 'text-white/70'}`}>
                {label}
            </div>
            {trend && (
                <div className="mt-2 text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                    {trend}
                </div>
            )}
        </div>
    </Card>
);
