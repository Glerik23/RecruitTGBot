import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    RadialLinearScale
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

type DashboardTab = 'summary' | 'funnel' | 'hr' | 'candidates';

export const AnalystDashboard: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<DashboardTab>('summary');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/analyst/dashboard');
                setData(response);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-hint animate-pulse">Завантаження аналітики...</p>
        </div>
    );

    if (!data) return (
        <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed border-white/10 m-4">
            <div className="text-4xl mb-4 opacity-20">📭</div>
            <p className="text-hint">Не вдалося завантажити дані</p>
        </div>
    );

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: { size: 10, family: 'Inter' },
                    usePointStyle: true,
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(20, 20, 25, 0.9)',
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 12,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }
        },
        scales: {
            y: {
                ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 9 } },
                grid: { color: 'rgba(255, 255, 255, 0.03)' }
            },
            x: {
                ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 9 } },
                grid: { display: false }
            }
        }
    };

    const radarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            r: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
                pointLabels: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10 } },
                ticks: { display: false }
            }
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-24 max-w-4xl mx-auto px-1">
            <header className="px-2">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">📈 Dashboard</h1>
                        <p className="text-hint font-medium">Аналітика рекрутингових процесів</p>
                    </div>
                    <Badge variant="info" className="mb-1 font-mono">LIVE DATA</Badge>
                </div>

                <nav className="flex p-1 bg-secondary/40 rounded-2xl overflow-x-auto scrollbar-hide">
                    <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} label="Огляд" icon="📊" />
                    <TabButton active={activeTab === 'funnel'} onClick={() => setActiveTab('funnel')} label="Воронка" icon="🌪️" />
                    <TabButton active={activeTab === 'hr'} onClick={() => setActiveTab('hr')} label="HR" icon="👥" />
                    <TabButton active={activeTab === 'candidates'} onClick={() => setActiveTab('candidates')} label="Кандидати" icon="🎯" />
                </nav>
            </header>

            {/* TAB CONTENT */}
            <div className="mt-6 px-2">
                {activeTab === 'summary' && renderSummary(data, chartOptions)}
                {activeTab === 'funnel' && renderFunnel(data)}
                {activeTab === 'hr' && renderHRPerformance(data)}
                {activeTab === 'candidates' && renderCandidateProfile(data, chartOptions, radarOptions)}
            </div>
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

const renderSummary = (data: any, options: any) => (
    <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-2 gap-3">
            <MetricCard
                icon="🎯"
                value={data.overview.total_applications}
                label="Всього заявок"
                trend="+12% за міс."
                labelClassName="text-white/70"
            />
            <MetricCard
                icon="⏳"
                value={data.overview.pending}
                label="В обробці"
                color="text-yellow-500"
                labelClassName="text-white/70"
            />
            <MetricCard
                icon="✅"
                value={data.overview.accepted}
                label="Прийнято"
                color="text-blue-500"
                labelClassName="text-white/70"
            />
            <MetricCard
                icon="💼"
                value={data.overview.hired}
                label="Найнято"
                color="text-green-500"
                labelClassName="text-white/70"
            />
        </div>

        <Card className="p-6 relative overflow-hidden group border-white/5 bg-secondary/10">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black italic uppercase tracking-tight">ДИНАМІКА ПОДАЧ</h2>
                <Badge variant="pending" className="text-[10px]">7 днів</Badge>
            </div>
            <div className="h-56">
                <Line
                    options={options}
                    data={{
                        labels: data.weekly_dynamics.daily_data.map((d: any) => new Date(d.date).toLocaleDateString('uk-UA', { weekday: 'short' })),
                        datasets: [{
                            label: 'Заявки',
                            data: data.weekly_dynamics.daily_data.map((d: any) => d.count),
                            borderColor: '#3390ec',
                            backgroundColor: (context: any) => {
                                const bg = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 bg-secondary/10 border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> РОЗПОДІЛ СТАТУСІВ
                </h3>
                <div className="h-56">
                    <Doughnut
                        options={{ ...options, cutout: '75%', plugins: { ...options.plugins, legend: { display: true, position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 9 } } } } }}
                        data={{
                            labels: Object.keys(data.by_status).map(s => s.replace('_', ' ').toUpperCase()),
                            datasets: [{
                                data: Object.values(data.by_status),
                                backgroundColor: ['#ffa500', '#2196f3', '#4caf50', '#f44336', '#9c27b0', '#607d8b'],
                                borderWidth: 2,
                                borderColor: 'rgba(0,0,0,0.5)',
                                hoverOffset: 15
                            }]
                        }}
                    />
                </div>
            </Card>

            <Card className="p-5 bg-secondary/10 border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> АКТИВНІ ПОЗИЦІЇ
                </h3>
                <div className="h-56">
                    <Bar
                        options={{ ...options, indexAxis: 'y' as const, scales: { ...options.scales, x: { display: false } } }}
                        data={{
                            labels: Object.keys(data.by_position),
                            datasets: [{
                                label: 'Кількість',
                                data: Object.values(data.by_position),
                                backgroundColor: 'rgba(51, 144, 236, 0.6)',
                                hoverBackgroundColor: 'rgba(51, 144, 236, 0.9)',
                                borderRadius: 4,
                                barThickness: 12
                            }]
                        }}
                    />
                </div>
            </Card>
        </div>
    </div>
);

const renderFunnel = (data: any) => (
    <div className="space-y-6 animate-fadeIn">
        <Card className="p-6 bg-secondary/10 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <span className="text-9xl">🌪️</span>
            </div>
            <h2 className="text-lg font-black italic uppercase tracking-tight mb-8">ВОРОНКА РЕКРУТИНГУ</h2>
            <div className="space-y-8 relative">
                <FunnelStep
                    label="Всього заявок"
                    count={data.conversion_metrics.total_applications}
                    percentage={100}
                    textColor="text-primary"
                    icon="🎯"
                />
                <FunnelStep
                    label="Прийнято в роботу"
                    count={data.conversion_metrics.accepted}
                    percentage={data.conversion_metrics.application_to_accepted}
                    textColor="text-blue-500"
                    icon="📂"
                />
                <FunnelStep
                    label="Призначено співбесід"
                    count={data.conversion_metrics.interviews}
                    percentage={data.conversion_metrics.application_to_interview}
                    textColor="text-purple-500"
                    icon="👥"
                />
                <FunnelStep
                    label="Найнято кандидатів"
                    count={data.conversion_metrics.hired}
                    percentage={data.conversion_metrics.application_to_hired}
                    textColor="text-green-500"
                    icon="🎉"
                    isLast
                />
            </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/20 p-5 rounded-3xl space-y-2 border border-white/5 hover:bg-white/5 transition-colors">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Ефективність інтерв'ю</p>
                <div className="text-2xl font-black text-primary font-mono">{data.conversion_metrics.interview_to_hired}%</div>
                <p className="text-[10px] leading-tight text-white/40">Кандидатів отримує офер після підтвердження зустрічі</p>
            </div>
            <div className="bg-secondary/20 p-5 rounded-3xl space-y-2 border border-white/5 hover:bg-white/5 transition-colors">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Час на розгляд</p>
                <div className="text-2xl font-black text-primary font-mono">{data.time_to_review.average_hours}г</div>
                <p className="text-[10px] leading-tight text-white/40">Середній час від подачі до першої зміни статусу</p>
            </div>
        </div>

        {data.rejection_reasons && (
            <Card className="p-6 bg-secondary/10 border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-60 flex items-center gap-2">
                    <span className="text-red-500">🚫</span> ПРИЧИНИ ВІДМОВ
                </h3>
                <div className="space-y-4">
                    {Object.entries(data.rejection_reasons).map(([reason, count]: any) => (
                        <div key={reason} className="flex items-center gap-4 group">
                            <div className="flex-1 text-xs font-bold text-white/70 group-hover:text-white transition-colors capitalize">{reason}</div>
                            <div className="w-32 bg-secondary/40 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500/50 rounded-full group-hover:bg-red-500 transition-all duration-500"
                                    style={{ width: `${(count / (Object.values(data.rejection_reasons).reduce((a: any, b: any) => a + (b as number), 0) as number) || 1) * 100}%` }}
                                />
                            </div>
                            <div className="text-[10px] font-black font-mono w-6 text-right text-white/40 group-hover:text-red-500 transition-colors">{count}</div>
                        </div>
                    ))}
                </div>
            </Card>
        )}
    </div>
);

const FunnelStep = ({ label, count, percentage, textColor, icon, isLast }: any) => (
    <div className="relative">
        <div className={`p-5 rounded-2xl border border-white/5 flex justify-between items-center transition-all hover:bg-white/5 group relative z-10 bg-black/20 backdrop-blur-sm shadow-xl`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-black opacity-30 tracking-[0.1em] font-mono">{label}</p>
                    <p className="text-2xl font-black font-mono">{count}</p>
                </div>
            </div>
            <div className={`text-right ${textColor}`}>
                <p className="text-2xl font-black font-mono tracking-tighter">{percentage}%</p>
                <div className="flex items-center justify-end gap-1 opacity-40">
                    <span className="text-[8px] uppercase font-black tracking-widest">Conversion</span>
                </div>
            </div>
        </div>
        {!isLast && (
            <div className="flex justify-center -my-4 relative z-20">
                <div className="w-8 h-8 rounded-full bg-secondary border-4 border-[#0c0c0e] flex items-center justify-center text-xs shadow-2xl">
                    <span className="opacity-40 font-black">↓</span>
                </div>
            </div>
        )}
    </div>
);

const renderHRPerformance = (data: any) => (
    <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 text-center hover:bg-primary/10 transition-colors">
                <p className="text-2xl font-black text-primary font-mono">{data.hr_activity.total_reviewed}</p>
                <p className="text-[8px] uppercase font-black tracking-widest opacity-40 mt-1">Опрацьовано</p>
            </div>
            <div className="bg-green-500/5 p-5 rounded-3xl border border-green-500/10 text-center hover:bg-green-500/10 transition-colors">
                <p className="text-2xl font-black text-green-500 font-mono">{data.hr_activity.overall_acceptance_rate}%</p>
                <p className="text-[8px] uppercase font-black tracking-widest opacity-40 mt-1">Accept Rate</p>
            </div>
            <div className="bg-purple-500/5 p-5 rounded-3xl border border-purple-500/10 text-center hover:bg-purple-500/10 transition-colors">
                <p className="text-2xl font-black text-purple-500 font-mono">{data.hr_activity.total_hr_count}</p>
                <p className="text-[8px] uppercase font-black tracking-widest opacity-40 mt-1">Recruiters</p>
            </div>
        </div>

        <Card className="overflow-hidden border-white/5 bg-secondary/10 shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Рейтинг активності HR</h3>
                <Badge variant="secondary" className="text-[8px] opacity-40">KPI Ranking</Badge>
            </div>
            <div className="divide-y divide-white/5">
                {data.hr_activity.hr_details.map((hr: any, idx: number) => (
                    <div key={hr.hr_id} className="p-5 flex items-center gap-4 hover:bg-white/[0.03] transition-all group">
                        <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center font-black text-xs border border-white/5 text-white/40 group-hover:text-primary group-hover:border-primary/20 transition-all shadow-inner">
                            {idx + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                            <h4 className="font-black text-sm text-white/90 group-hover:text-white transition-colors">{hr.hr_name}</h4>
                            <div className="flex gap-3 text-[10px] font-bold opacity-40 tracking-tight">
                                <span className="text-green-500/60">✅ {hr.accepted}</span>
                                <span className="text-red-500/60">🚫 {hr.rejected}</span>
                                <span className="font-mono">⏱️ {hr.avg_review_time_hours}г</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black font-mono tracking-tighter group-hover:text-primary transition-colors">{hr.reviewed}</p>
                            <p className="text-[8px] uppercase font-black tracking-widest opacity-30">Reviewed</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    </div>
);

const renderCandidateProfile = (data: any, options: any, radarOptions: any) => (
    <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 bg-secondary/10 border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-50 italic">ТЕХНОЛОГІЧНИЙ СТЕК</h3>
                <div className="h-80">
                    <Bar
                        options={{ ...options, indexAxis: 'y' as const, scales: { ...options.scales, x: { display: false } } }}
                        data={{
                            labels: Object.entries(data.skills_distribution).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10).map(s => s[0].toUpperCase()),
                            datasets: [{
                                label: 'Популярність',
                                data: Object.entries(data.skills_distribution).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10).map(s => s[1]),
                                backgroundColor: 'rgba(51, 144, 236, 0.4)',
                                hoverBackgroundColor: '#3390ec',
                                borderRadius: 4,
                                barThickness: 10
                            }]
                        }}
                    />
                </div>
            </Card>

            <Card className="p-6 bg-secondary/10 border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-50 italic">РІВЕНЬ АНГЛІЙСЬКОЇ</h3>
                <div className="h-80 relative">
                    <Radar
                        options={{ ...radarOptions, scales: { r: { ...radarOptions.scales.r, pointLabels: { font: { weight: 'bold', size: 10 }, color: 'rgba(255,255,255,0.4)' } } } }}
                        data={{
                            labels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'N/A'],
                            datasets: [{
                                label: 'Число кандидатів',
                                data: [
                                    data.english_level['A1'] || 0,
                                    data.english_level['A2'] || 0,
                                    data.english_level['B1'] || 0,
                                    data.english_level['B2'] || 0,
                                    data.english_level['C1'] || 0,
                                    data.english_level['C2'] || 0,
                                    data.english_level['Не вказано'] || 0,
                                ],
                                backgroundColor: 'rgba(51, 144, 236, 0.1)',
                                borderColor: 'rgba(51, 144, 236, 0.8)',
                                borderWidth: 3,
                                pointBackgroundColor: '#3390ec',
                                pointBorderColor: '#fff',
                                pointHoverRadius: 5
                            }]
                        }}
                    />
                </div>
            </Card>
        </div>

        <Card className="p-6 bg-secondary/10 border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-50 italic">ДОСВІД РОБОТИ</h3>
            <div className="h-64">
                <Bar
                    options={{ ...options, scales: { ...options.scales, y: { display: false } } }}
                    data={{
                        labels: ['0-1Р', '1-3Р', '3-5Р', '5-7Р', '7+Р', 'N/A'],
                        datasets: [{
                            label: 'Кількість',
                            data: [
                                data.experience_distribution['0-1 років'] || 0,
                                data.experience_distribution['1-3 роки'] || 0,
                                data.experience_distribution['3-5 років'] || 0,
                                data.experience_distribution['5-7 років'] || 0,
                                data.experience_distribution['7+ років'] || 0,
                                data.experience_distribution['Не вказано'] || 0,
                            ],
                            backgroundColor: (context: any) => {
                                const colors = ['#607d8b', '#4caf50', '#2196f3', '#3390ec', '#9c27b0', '#546e7a'].map(c => c + '99');
                                return colors[context.dataIndex];
                            },
                            borderRadius: 12,
                            barThickness: 40
                        }]
                    }}
                />
            </div>
        </Card>
    </div>
);

const MetricCard = ({ icon, value, label, trend, color = '', labelClassName = '' }: any) => (
    <Card className="flex flex-col items-center justify-center p-5 hover:scale-[1.02] transition-transform relative overflow-hidden group text-center min-h-[150px] bg-secondary/10 border-white/5 shadow-inner">
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
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
    </Card>
);
