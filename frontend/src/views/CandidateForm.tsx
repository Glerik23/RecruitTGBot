import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { useToast } from '../context/ToastContext';

const POPULAR_TECHS = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js',
    'Java', 'C#', '.NET', 'Go', 'Rust', 'C++', 'PHP', 'Laravel', 'Symfony',
    'Ruby', 'Ruby on Rails', 'Swift', 'Kotlin', 'Flutter', 'Dart',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure',
    'Git', 'CI/CD', 'Linux', 'Terraform', 'Ansible', 'Jenkins',
    'HTML', 'CSS', 'SASS/SCSS', 'TailwindCSS', 'Bootstrap',
    'GraphQL', 'REST API', 'gRPC', 'WebSockets',
    'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
    'Figma', 'Adobe XD', 'Sketch'
].sort();

const ENGLISH_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const formatPhoneNumber = (value: string) => {
    // Strip everything except digits
    const digits = value.replace(/\D/g, '');

    // If we have 3 digits or less (part of 380 prefix), just return the prefix
    if (digits.length <= 3) {
        return '+380';
    }

    // Extract national part (after 380)
    let national = digits;
    if (digits.startsWith('380')) {
        national = digits.substring(3);
    } else if (digits.length > 0) {
        // If it starts with 38 or 3, it's likely a broken prefix, strip it
        if (digits.startsWith('38')) {
            national = digits.substring(2);
        } else if (digits.startsWith('3')) {
            national = digits.substring(1);
        } else if (digits.startsWith('0')) {
            // Handle common mistake of starting with 0 (e.g. 050...)
            national = digits.substring(1);
        }
    }

    // Limit to 9 digits for national part
    national = national.substring(0, 9);

    let formatted = '+380';
    if (national.length > 0) {
        formatted += ' (' + national.substring(0, 2);
    }
    if (national.length > 2) {
        formatted += ') ' + national.substring(2, 5);
    }
    if (national.length > 5) {
        formatted += '-' + national.substring(5, 7);
    }
    if (national.length > 7) {
        formatted += '-' + national.substring(7, 9);
    }

    return formatted;
};

export const CandidateForm: React.FC = () => {
    const { user, tg } = useTelegram();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        middle_name: '',
        email: '',
        phone: '+380',
        position: '',
        experience_years: '',
        english_level: '',
        education: '',
        previous_work: '',
        portfolio_url: '',
        additional_info: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const [currentSkill, setCurrentSkill] = useState({ name: '', exp: '' });
    const [skills, setSkills] = useState<{ name: string, exp: number }[]>([]);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await api.get('/candidate/applications');
                const applications = response.applications || [];

                if (applications.length > 0) {
                    applications.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const latestApp = applications[0];

                    const activeStatuses = [
                        'pending', 'accepted', 'reviewed',
                        'screening_pending', 'screening_scheduled', 'screening_completed',
                        'tech_pending', 'tech_scheduled', 'tech_completed', 'processing'
                    ];

                    if (activeStatuses.includes(latestApp.status?.toLowerCase())) {
                        navigate('/waiting');
                    }
                }
            } catch (e) {
                console.error('Check status error', e);
            } finally {
                setIsChecking(false);
            }
        };

        checkStatus();
    }, [navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        let newValue = value;
        if (name === 'phone') {
            newValue = formatPhoneNumber(value);

            // Critical: if formatted length is exactly prefix and user is backspacing, stay at prefix
            const isDeleting = (e.nativeEvent as any).inputType === 'deleteContentBackward';
            if (isDeleting && newValue === '+380') {
                newValue = '+380';
            }
        } else if (name === 'experience_years') {
            // Allow only digits, dot and comma
            if (value !== '' && !/^[0-9.,]*$/.test(value)) return;
            // Replace comma with dot
            let val = value.replace(',', '.');
            // Prevent multiple dots
            if ((val.match(/\./g) || []).length > 1) return;
            // Limit to 70
            if (val !== '' && parseFloat(val) > 70) return;
            newValue = val;
        }

        setFormData(prev => ({ ...prev, [name]: newValue }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const addSkill = () => {
        if (!currentSkill.name) return;
        if (skills.some(s => s.name.toLowerCase() === currentSkill.name.toLowerCase())) {
            return;
        }
        const exp = parseFloat(currentSkill.exp) || 0;
        if (exp < 0 || exp > 70) {
            showToast('Досвід має бути від 0 до 70 років', 'warning');
            return;
        }
        setSkills(prev => [...prev, {
            name: currentSkill.name,
            exp: exp
        }]);
        setCurrentSkill({ name: '', exp: '' });
    };

    const removeSkill = (index: number) => {
        setSkills(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const mandatoryFields: (keyof typeof formData)[] = [
            'first_name', 'last_name', 'middle_name', 'email', 'phone', 'position'
        ];

        mandatoryFields.forEach(field => {
            if (!formData[field] || String(formData[field]).trim() === '') {
                newErrors[field] = 'Це поле є обов\'язковим';
            }
        });

        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = 'Невірний формат email';
        }

        // Phone validation (12 digits + formatting characters = ~19 chars, but digits count is best)
        const phoneDigits = formData.phone.replace(/\D/g, '');
        if (phoneDigits.length < 12) {
            newErrors.phone = 'Введіть повний номер мобільного';
        }

        // Experience validation
        if (formData.experience_years) {
            const exp = parseInt(formData.experience_years);
            if (exp < 0 || exp > 70) {
                newErrors.experience_years = 'Досвід має бути від 0 до 70 років';
            }
        }

        setErrors(newErrors);
        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            tg?.HapticFeedback?.notificationOccurred('error');
            showToast('Будь ласка, заповніть усі обов’язкові поля', 'warning');
            const firstErrorField = Object.keys(newErrors)[0];
            const element = document.getElementsByName(firstErrorField)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setIsLoading(true);
        setError(null);

        const data: any = { ...formData };

        // Full Name
        data.full_name = [data.first_name, data.last_name, data.middle_name].filter(Boolean).join(' ');
        delete data.first_name;
        delete data.last_name;
        delete data.middle_name;

        // Send structured data
        data.english_level = data.english_level || null;
        data.skills = skills.map(s => s.name);
        data.skills_details = skills.map(s => ({
            name: s.name,
            exp: s.exp
        }));
        data.additional_info = data.additional_info || '';

        // Clean empty fields
        Object.keys(data).forEach(key => {
            if (data[key] === '' || data[key] === null) delete data[key];
        });

        try {
            const result = await api.post('/candidate/application', data);
            if (result.success) {
                tg?.HapticFeedback?.notificationOccurred('success');
                navigate('/waiting');
            } else {
                setError(result.detail || 'Помилка при відправці');
            }
        } catch (err: any) {
            setError(err.message || 'Помилка відправки. Спробуйте пізніше.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <header className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-text">📝 Подача заявки</h1>
                <p className="text-hint">Заповніть форму нижче, щоб подати заявку на роботу</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 pb-10">
                <Card className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-black/5 pb-2">Особиста інформація</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Input
                            label="Ім'я"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            error={errors.first_name}
                            icon="👤"
                            placeholder="Іван"
                        />
                        <Input
                            label="Прізвище"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            error={errors.last_name}
                            icon="👤"
                            placeholder="Іванов"
                        />
                        <Input
                            label="По батькові"
                            name="middle_name"
                            value={formData.middle_name}
                            onChange={handleInputChange}
                            error={errors.middle_name}
                            icon="👤"
                            placeholder="Іванович"
                        />
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            error={errors.email}
                            icon="📧"
                            placeholder="example@email.com"
                        />
                        <Input
                            label="Телефон"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            onFocus={(e) => {
                                if (e.target.value === '+380') {
                                    e.target.setSelectionRange(4, 4);
                                }
                            }}
                            error={errors.phone}
                            icon="📱"
                            placeholder="+380 (XX) XXX-XX-XX"
                        />
                    </div>
                </Card>

                <Card className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-black/5 pb-2">Професійна інформація</h2>
                    <div className="space-y-4">
                        <Input
                            label="Позиція"
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                            error={errors.position}
                            icon="💼"
                            placeholder="Наприклад: Python Developer"
                        />
                        <Input
                            label="Загальний досвід (років)"
                            name="experience_years"
                            type="text"
                            inputMode="decimal"
                            value={formData.experience_years}
                            onChange={handleInputChange}
                            icon="⏱️"
                            placeholder="0"
                        />

                        <Select
                            label="Рівень англійської"
                            icon="🌐"
                            value={formData.english_level}
                            onChange={(val) => setFormData(prev => ({ ...prev, english_level: val }))}
                            options={ENGLISH_LEVELS}
                            placeholder="Не вказано"
                        />

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-text ml-1 flex items-center gap-1.5">
                                <span>🛠️</span> Навички та технології
                            </label>
                            <div className="flex gap-2">
                                <Select
                                    placeholder="Технологія"
                                    value={currentSkill.name}
                                    onChange={(val) => setCurrentSkill(prev => ({ ...prev, name: val }))}
                                    options={POPULAR_TECHS}
                                    searchable
                                    className="flex-1"
                                />
                                <input
                                    className="w-20 bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none focus:border-primary text-center"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Років"
                                    value={currentSkill.exp}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(',', '.');
                                        if (val === '' || (/^\d*\.?\d*$/.test(val) && (parseFloat(val) <= 70 || val === '.'))) {
                                            setCurrentSkill(prev => ({ ...prev, exp: val }));
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addSkill} className="px-5">+</Button>
                            </div>

                            {skills.length > 0 && (
                                <div className="max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {skills.map((skill, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm border border-primary/20 animate-scaleIn">
                                                <span>{skill.name} ({skill.exp}р.)</span>
                                                <button type="button" onClick={() => removeSkill(i)} className="hover:text-red-500 font-bold transition-colors">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-black/5 pb-2">Досвід та освіта</h2>
                    <div className="space-y-4">
                        <Textarea
                            label="Освіта"
                            name="education"
                            value={formData.education}
                            onChange={handleInputChange}
                            icon="🎓"
                            placeholder="Опишіть вашу освіту..."
                        />
                        <Textarea
                            label="Попередні місця роботи"
                            name="previous_work"
                            value={formData.previous_work}
                            onChange={handleInputChange}
                            icon="💼"
                            placeholder="Опишіть ваш досвід..."
                        />
                    </div>
                </Card>

                <Card className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-black/5 pb-2">Додатково</h2>
                    <div className="space-y-4">
                        <Input
                            label="Посилання на портфоліо"
                            name="portfolio_url"
                            type="url"
                            value={formData.portfolio_url}
                            onChange={handleInputChange}
                            icon="🔗"
                            placeholder="https://..."
                        />
                        <Textarea
                            label="Додаткова інформація"
                            name="additional_info"
                            value={formData.additional_info}
                            onChange={handleInputChange}
                            icon="📝"
                            placeholder="Що ще ви хотіли б додати?"
                        />
                    </div>
                </Card>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full text-lg py-4 shadow-lg shadow-primary/30"
                    isLoading={isLoading}
                >
                    🚀 Відправити заявку
                </Button>
            </form>
        </div>
    );
};
