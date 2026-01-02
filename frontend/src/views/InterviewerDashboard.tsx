import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ApplicationCard } from '../components/ApplicationCard';
import { ApplicationDetail } from '../components/ApplicationDetail';
import { cn } from '../utils/cn';

interface InterviewerApp {
    id: number;
    candidate_name: string;
    position: string;
    status: string;
    created_at: string;
}

const TABS = [
    { id: 'my', label: 'Мої кандидати' },
    { id: 'pool', label: 'Загальний пул' },
    { id: 'archive', label: 'Архів' }
] as const;

type TabId = typeof TABS[number]['id'];

export const InterviewerDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('my');
    const [myCandidates, setMyCandidates] = useState<InterviewerApp[]>([]);
    const [pool, setPool] = useState<InterviewerApp[]>([]);
    const [archive, setArchive] = useState<InterviewerApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await api.get('/interviewer/applications');
            setMyCandidates(data.my_candidates || []);
            setPool(data.pool || []);
            setArchive(data.archive || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getBadgeCount = (id: TabId) => {
        if (id === 'my') return myCandidates.length;
        if (id === 'pool') return pool.filter(app => !myCandidates.some(my => my.id === app.id)).length;
        if (id === 'archive') return archive.length;
        return 0;
    };

    if (loading && myCandidates.length === 0 && pool.length === 0 && archive.length === 0) {
        return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    const currentList = activeTab === 'my'
        ? myCandidates
        : (activeTab === 'pool'
            ? pool.filter(app => !myCandidates.some(my => my.id === app.id))
            : archive);

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            <header>
                <h1 className="text-2xl font-bold">👋 Кабінет Інтерв'юера</h1>
                <p className="text-hint text-sm">Управління технічними співбесідами</p>
            </header>

            <div className="flex p-1 bg-secondary rounded-xl gap-1">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                            activeTab === tab.id ? "bg-white text-black shadow-sm" : "text-hint hover:text-white"
                        )}
                    >
                        {tab.label}
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            activeTab === tab.id ? "bg-primary text-white" : "bg-black/20 text-hint"
                        )}>
                            {getBadgeCount(tab.id)}
                        </span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {currentList.length === 0 ? (
                    <div className="text-center py-24 px-6 bg-secondary/20 backdrop-blur-sm rounded-[32px] border border-white/5 animate-fadeIn space-y-4">
                        <div className="text-7xl animate-bounce duration-[2000ms] opacity-80">📭</div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-text/80">Поки що тут порожньо</h2>
                            <p className="text-sm text-hint max-w-[200px] mx-auto opacity-70">
                                {activeTab === 'my'
                                    ? 'У вас немає активних кандидатів у роботі'
                                    : activeTab === 'pool'
                                        ? 'Наразі в загальному пулі немає нових заявок'
                                        : 'Ваш архів порожній'
                                }
                            </p>
                        </div>
                    </div>
                ) : (
                    currentList.map(app => (
                        <ApplicationCard
                            key={app.id}
                            application={app}
                            onView={(id) => setSelectedId(id)}
                        />
                    ))
                )}
            </div>

            {selectedId && (
                <ApplicationDetail
                    id={selectedId}
                    onClose={() => setSelectedId(null)}
                    onUpdate={fetchData}
                    role="interviewer"
                />
            )}
        </div>
    );
};
