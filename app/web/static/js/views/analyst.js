import { API_URL, apiGet } from '../utils/api.js';

const user = window.Telegram?.WebApp?.initDataUnsafe?.user;

export async function loadAnalytics() {
    try {
        const data = await apiGet('/analyst/dashboard');

        let html = `
            <div class="analytics-header">
                <h1>📊 Аналітика компанії</h1>
                <p class="analytics-subtitle">Детальна статистика рекрутингу</p>
            </div>
        `;

        // Метрики-картки
        html += `
            <div class="metrics-grid">
                <div class="metric-card primary">
                    <div class="metric-icon">📋</div>
                    <div class="metric-value">${data.overview.total_applications}</div>
                    <div class="metric-label">Всього заявок</div>
                </div>
                <div class="metric-card warning">
                    <div class="metric-icon">⏳</div>
                    <div class="metric-value">${data.overview.pending}</div>
                    <div class="metric-label">Очікують</div>
                </div>
                <div class="metric-card success">
                    <div class="metric-icon">✅</div>
                    <div class="metric-value">${data.overview.accepted}</div>
                    <div class="metric-label">Прийнято</div>
                </div>
                <div class="metric-card danger">
                    <div class="metric-icon">❌</div>
                    <div class="metric-value">${data.overview.rejected}</div>
                    <div class="metric-label">Відхилено</div>
                </div>
                <div class="metric-card info">
                    <div class="metric-icon">💼</div>
                    <div class="metric-value">${data.overview.hired}</div>
                    <div class="metric-label">Прийнято на роботу</div>
                </div>
                <div class="metric-card secondary">
                    <div class="metric-icon">📅</div>
                    <div class="metric-value">${data.interviews.total_interviews}</div>
                    <div class="metric-label">Собесідувань</div>
                </div>
            </div>
        `;

        // Конверсія
        html += `
            <div class="analytics-section">
                <h2 class="section-title">📈 Метрики конверсії</h2>
                <div class="conversion-grid">
                    <div class="conversion-item">
                        <div class="conversion-label">Заявка → Прийнята</div>
                        <div class="conversion-value">${data.conversion_metrics.application_to_accepted}%</div>
                    </div>
                    <div class="conversion-item">
                        <div class="conversion-label">Заявка → Собесідування</div>
                        <div class="conversion-value">${data.conversion_metrics.application_to_interview}%</div>
                    </div>
                    <div class="conversion-item">
                        <div class="conversion-label">Заявка → Підтверджене</div>
                        <div class="conversion-value">${data.conversion_metrics.application_to_confirmed_interview}%</div>
                    </div>
                    <div class="conversion-item">
                        <div class="conversion-label">Заявка → Найм</div>
                        <div class="conversion-value">${data.conversion_metrics.application_to_hired}%</div>
                    </div>
                    <div class="conversion-item">
                        <div class="conversion-label">Собесідування → Найм</div>
                        <div class="conversion-value">${data.conversion_metrics.interview_to_hired}%</div>
                    </div>
                </div>
            </div>
        `;

        // Графік динаміки за тиждень
        if (data.weekly_dynamics && data.weekly_dynamics.daily_data) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">📊 Динаміка за тиждень</h2>
                    <canvas id="weeklyChart" height="200"></canvas>
                </div>
            `;
        }

        // Графік динаміки за місяць
        if (data.monthly_dynamics && data.monthly_dynamics.daily_data) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">📊 Динаміка за місяць</h2>
                    <canvas id="monthlyChart" height="200"></canvas>
                </div>
            `;
        }

        // Розподіл за статусами
        if (data.by_status) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">📋 Розподіл за статусами</h2>
                    <canvas id="statusChart" height="200"></canvas>
                </div>
            `;
        }

        // Топ технологій
        if (data.skills_distribution && Object.keys(data.skills_distribution).length > 0) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">💻 Топ-10 технологій</h2>
                    <canvas id="skillsChart" height="250"></canvas>
                </div>
            `;
        }

        // Розподіл за досвідом
        if (data.experience_distribution) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">👔 Досвід роботи</h2>
                    <canvas id="experienceChart" height="200"></canvas>
                </div>
            `;
        }

        // Рівень англійської
        if (data.english_level && Object.keys(data.english_level).length > 0) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">🌐 Рівень англійської</h2>
                    <canvas id="englishChart" height="200"></canvas>
                </div>
            `;
        }

        // Активність HR
        if (data.hr_activity && data.hr_activity.hr_details && data.hr_activity.hr_details.length > 0) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">👥 Активність HR</h2>
                    <div class="hr-stats">
                        <div class="hr-summary">
                            <div class="hr-summary-item">
                                <span class="hr-summary-label">HR менеджерів:</span>
                                <span class="hr-summary-value">${data.hr_activity.total_hr_count}</span>
                            </div>
                            <div class="hr-summary-item">
                                <span class="hr-summary-label">Розглянуто:</span>
                                <span class="hr-summary-value">${data.hr_activity.total_reviewed}</span>
                            </div>
                            <div class="hr-summary-item">
                                <span class="hr-summary-label">Середній % прийняття:</span>
                                <span class="hr-summary-value">${data.hr_activity.overall_acceptance_rate}%</span>
                            </div>
                        </div>
                        <div class="hr-list">
                            ${data.hr_activity.hr_details.map(hr => `
                                <div class="hr-item">
                                    <div class="hr-name">${hr.hr_name}</div>
                                    <div class="hr-metrics">
                                        <span>Розглянуто: <b>${hr.reviewed}</b></span>
                                        <span>Прийнято: <b>${hr.accepted}</b></span>
                                        <span>Відхилено: <b>${hr.rejected}</b></span>
                                        <span>% прийняття: <b>${hr.acceptance_rate}%</b></span>
                                        ${hr.avg_review_time_hours > 0 ? `<span>Середній час: <b>${hr.avg_review_time_hours} год.</b></span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // Час розгляду
        if (data.time_to_review) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">⏱ Час розгляду заявок</h2>
                    <div class="time-stats">
                        <div class="time-stat-item">
                            <div class="time-stat-value">${data.time_to_review.average_hours.toFixed(1)}</div>
                            <div class="time-stat-label">годин</div>
                        </div>
                        <div class="time-stat-item">
                            <div class="time-stat-value">${data.time_to_review.average_days.toFixed(1)}</div>
                            <div class="time-stat-label">днів</div>
                        </div>
                        <div class="time-stat-item">
                            <div class="time-stat-value">${data.time_to_review.total_reviewed}</div>
                            <div class="time-stat-label">розглянуто</div>
                        </div>
                    </div>
                </div>
            `;
        }

        document.getElementById('app').innerHTML = html;

        // Створюємо графіки
        setTimeout(() => {
            createCharts(data);
        }, 100);

    } catch (error) {
        document.getElementById('app').innerHTML = `
            <div class="error">
                <h2>Помилка завантаження</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function createCharts(data) {
    if (!window.Chart) return;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#ffffff',
                    padding: 15,
                    font: { size: 12 }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                border: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            x: {
                ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                border: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        }
    };

    // Динаміка за тиждень
    if (data.weekly_dynamics && data.weekly_dynamics.daily_data) {
        const weeklyCtx = document.getElementById('weeklyChart');
        if (weeklyCtx) {
            const weeklyData = data.weekly_dynamics.daily_data;
            new Chart(weeklyCtx, {
                type: 'line',
                data: {
                    labels: weeklyData.map(d => new Date(d.date).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' })),
                    datasets: [{
                        label: 'Заявки',
                        data: weeklyData.map(d => d.count),
                        borderColor: '#3390ec',
                        backgroundColor: 'rgba(51, 144, 236, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartOptions
            });
        }
    }

    // Динаміка за місяць
    if (data.monthly_dynamics && data.monthly_dynamics.daily_data) {
        const monthlyCtx = document.getElementById('monthlyChart');
        if (monthlyCtx) {
            const monthlyData = data.monthly_dynamics.daily_data;
            new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: monthlyData.map(d => new Date(d.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })),
                    datasets: [{
                        label: 'Заявки',
                        data: monthlyData.map(d => d.count),
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartOptions
            });
        }
    }

    // Розподіл за статусами
    if (data.by_status) {
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            const statusLabels = {
                'pending': 'Очікують',
                'reviewed': 'Розглянуто',
                'rejected': 'Відхилено',
                'accepted': 'Прийнято',
                'interview_scheduled': 'Собесідування',
                'interview_completed': 'Пройдено',
                'hired': 'Прийнято на роботу',
                'declined': 'Відмовився'
            };
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(data.by_status).map(k => statusLabels[k.toLowerCase()] || k),
                    datasets: [{
                        data: Object.values(data.by_status),
                        backgroundColor: [
                            '#ffa500', '#2196f3', '#f44336', '#4caf50',
                            '#9c27b0', '#00bcd4', '#8bc34a', '#ff9800'
                        ]
                    }]
                },
                options: chartOptions
            });
        }
    }

    // Топ технологій
    if (data.skills_distribution && Object.keys(data.skills_distribution).length > 0) {
        const skillsCtx = document.getElementById('skillsChart');
        if (skillsCtx) {
            const topSkills = Object.entries(data.skills_distribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            new Chart(skillsCtx, {
                type: 'bar',
                data: {
                    labels: topSkills.map(s => s[0]),
                    datasets: [{
                        label: 'Кількість',
                        data: topSkills.map(s => s[1]),
                        backgroundColor: '#3390ec'
                    }]
                },
                options: {
                    ...chartOptions,
                    indexAxis: 'y'
                }
            });
        }
    }

    // Досвід роботи
    if (data.experience_distribution) {
        const expCtx = document.getElementById('experienceChart');
        if (expCtx) {
            const expData = Object.entries(data.experience_distribution).filter(([k, v]) => v > 0);
            new Chart(expCtx, {
                type: 'pie',
                data: {
                    labels: expData.map(d => d[0]),
                    datasets: [{
                        data: expData.map(d => d[1]),
                        backgroundColor: [
                            '#ff9800', '#2196f3', '#4caf50', '#9c27b0', '#f44336', '#00bcd4'
                        ]
                    }]
                },
                options: chartOptions
            });
        }
    }

    // Рівень англійської
    if (data.english_level && Object.keys(data.english_level).length > 0) {
        const engCtx = document.getElementById('englishChart');
        if (engCtx) {
            const engData = Object.entries(data.english_level).filter(([k, v]) => v > 0);
            new Chart(engCtx, {
                type: 'bar',
                data: {
                    labels: engData.map(d => d[0]),
                    datasets: [{
                        label: 'Кількість',
                        data: engData.map(d => d[1]),
                        backgroundColor: '#4caf50'
                    }]
                },
                options: chartOptions
            });
        }
    }
}
