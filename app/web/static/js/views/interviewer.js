import { apiGet, apiPost } from '../utils/api.js';
import DateTimePicker from '../components/DateTimePicker.js';

let _activeTab = 'my'; // 'my' or 'pool'

export async function loadInterviewerDashboard() {
    console.log('loadInterviewerDashboard called');
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading"><div class="spinner"></div><p>Завантаження...</p></div>';

    try {
        console.log('Fetching /interviewer/applications...');
        // Add timeout to prevent infinite hang
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out (10s)')), 10000)
        );

        const response = await Promise.race([
            apiGet('/interviewer/applications'),
            timeoutPromise
        ]);

        console.log('Dashboard data received:', response);
        const myCandidates = response.my_candidates || [];
        const pool = response.pool || [];

        renderDashboard(myCandidates, pool);

    } catch (error) {
        console.error('loadInterviewerDashboard error:', error);
        app.innerHTML = `
            <div class="container">
                <div class="error">
                    <h2>Помилка</h2>
                    <p>${error.message}</p>
                    <button onclick="loadInterviewerDashboard()">Спробувати ще раз</button>
                    <pre style="text-align:left; font-size:12px; margin-top:10px; overflow:auto;">${error.stack}</pre>
                </div>
            </div>
        `;
    }
}



function renderDashboard(myCandidates, pool) {
    const app = document.getElementById('app');

    // Calculate counts
    const myCount = myCandidates.length;
    const poolCount = pool.length;

    app.innerHTML = `
        <div class="container" style="padding-bottom: 80px;">
            <header class="header">
                <h1>👋 Кабінет Інтерв'юера</h1>
            </header>
            
            <div class="tabs-container" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                <button class="tab-btn ${_activeTab === 'my' ? 'active' : ''}" onclick="switchTab('my')">
                    Мої кандидати <span class="badge" style="background: #3390ec;">${myCount}</span>
                </button>
                <button class="tab-btn ${_activeTab === 'pool' ? 'active' : ''}" onclick="switchTab('pool')">
                    Загальний пул <span class="badge" style="background: #444;">${poolCount}</span>
                </button>
            </div>
            
            <div id="tab-content">
                ${_activeTab === 'my' ? renderList(myCandidates, 'my') : renderList(pool, 'pool')}
            </div>
        </div>
    `;

    // Inject styles if needed
    if (!document.getElementById('interviewer-styles')) {
        const s = document.createElement('style');
        s.id = 'interviewer-styles';
        s.textContent = `
            .tab-btn {
                background: transparent;
                border: none;
                color: #888;
                padding: 10px 16px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }
            .tab-btn.active {
                color: white;
                border-bottom-color: #3390ec;
            }
            .tab-btn:hover:not(.active) {
                color: #ccc;
            }
            .badge {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 10px;
                color: white;
            }
            .action-btn {
                margin-top: 10px;
                width: 100%;
                padding: 10px;
                border-radius: 8px;
                border: none;
                font-weight: 600;
                cursor: pointer;
            }
            .btn-primary { background: #3390ec; color: white; }
            .btn-secondary { background: #444; color: white; }
        `;
        document.head.appendChild(s);
    }
}

function renderList(list, type) {
    if (list.length === 0) {
        return `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #888;">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <p>${type === 'my' ? 'У вас немає активних кандидатів' : 'Пул порожній'}</p>
            </div>
        `;
    }

    return list.map(app => `
        <div class="card application-card" style="margin-bottom: 16px; background: #1e1e1e; border-radius: 12px; padding: 16px;">
            <div class="card-header" style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                <h3 style="margin:0; font-size: 18px; color: white;">${app.candidate_name}</h3>
                <span class="status-badge status-${app.status.toLowerCase()}">${formatStatus(app.status)}</span>
            </div>
            <div class="card-body" style="color: #ccc; font-size: 14px; margin-bottom: 12px;">
                <p style="margin: 4px 0;"><strong>Позиція:</strong> ${app.position}</p>
                <p style="margin: 4px 0;"><strong>Дата:</strong> ${new Date(app.created_at).toLocaleDateString()}</p>
            </div>
            ${renderCardActions(app, type)}
        </div>
    `).join('');
}

function renderCardActions(app, type) {
    if (type === 'pool') {
        return `
            <button class="action-btn btn-primary" onclick="claimCandidate(${app.id})">
                📥 Взяти в роботу
            </button>
        `;
    } else {
        // My candidates actions
        // Logic: if scheduled -> "Conduct Interview" (Show link/details)
        // If pending -> "Schedule"
        // If completed (tech_completed) -> "Edit Feedback" or simple "View"
        // Simplified for now:
        return `
            <button class="action-btn btn-secondary" onclick="window.router.navigate('/interviewer/application/${app.id}')">
                👁️ Відкрити деталі
            </button>
        `;
    }
}

window.switchTab = function (tab) {
    _activeTab = tab;
    loadInterviewerDashboard(); // Reloading fetches fresh data (good for pool concurrency)
};

window.claimCandidate = async function (id) {
    if (!confirm('Взяти цього кандидата в роботу?')) return;

    try {
        await apiPost(`/interviewer/pool/${id}/claim`, {});
        // alert('✅ Кандидата додано до ваших призначень'); // Optional toast
        // Switch to 'my' tab to show it
        _activeTab = 'my';
        loadInterviewerDashboard();
    } catch (err) {
        alert('Помилка: ' + err.message);
        loadInterviewerDashboard(); // Refresh to reflect real state
    }
};

export async function loadInterviewerApplicationDetail(id) {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading"><div class="spinner"></div><p>Завантаження...</p></div>';

    try {
        const data = await apiGet(`/interviewer/applications/${id}`);
        // Fetch existing feedback if any
        let feedback = null;
        try {
            const fbRes = await apiGet(`/interviewer/applications/${id}/feedback`);
            feedback = fbRes.feedback;
        } catch (e) {
            console.warn('No feedback found or error', e);
        }

        app.innerHTML = `
            <div class="interviewer-container">
                <div onclick="window.router.navigate('/interviewer')" class="back-nav">
                    <span>←</span> Назад до списку
                </div>
                
                <div class="glass-card">
                    <div class="candidate-header">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h1 class="candidate-name">${data.candidate_name}</h1>
                                <div class="candidate-meta">
                                    <span style="color: #fff; font-weight: 500;">${data.position}</span>
                                    <span>•</span>
                                    <span>Added ${new Date(data.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span class="status-badge status-${data.status.toLowerCase()}">${formatStatus(data.status)}</span>
                                </div>
                            </div>
                            ${data.portfolio_url ? `
                                <a href="${data.portfolio_url}" target="_blank" class="btn btn-secondary" style="font-size: 13px; padding: 8px 16px;">
                                    🔗 Портфоліо
                                </a>
                            ` : ''}
                        </div>
                    </div>

                    <div class="info-grid">
                        <div class="info-group">
                            <label>Email</label>
                            <div>
                                <span>📧</span> <a href="mailto:${data.email}" class="info-link">${data.email}</a>
                            </div>
                        </div>
                        ${data.phone ? `
                        <div class="info-group">
                            <label>Телефон</label>
                            <div>
                                <span>📱</span> <a href="tel:${data.phone}" class="info-link">${data.phone}</a>
                            </div>
                        </div>` : ''}
                        <div class="info-group">
                            <label>Досвід</label>
                            <div>
                                <span>💼</span> ${data.experience_years || 0} років
                            </div>
                        </div>
                        
                        <div class="info-group" style="grid-column: 1 / -1;">
                            <label>Навички</label>
                            <div style="flex-wrap: wrap; gap: 8px; margin-top: 4px;">
                                ${(data.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
                            </div>
                        </div>
                        
                         ${data.additional_info ? `
                        <div class="info-group" style="grid-column: 1 / -1; margin-top: 10px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                            <label>Додаткова інформація</label>
                            <div style="font-size: 14px; color: #ccc; line-height: 1.5;">${data.additional_info}</div>
                        </div>` : ''}
                    </div>
                </div>

                <!-- Actions Section -->
                ${renderInterviewerActions(data)}

                <!-- Feedback Section -->
                ${(feedback || (data.active_interview && data.active_interview.is_confirmed)) ? `
                <div class="glass-card" style="margin-top: 24px; border-color: rgba(51, 144, 236, 0.3);">
                    <div class="section-title">
                        <span>📝</span> Технічний Фідбек
                    </div>
                    
                    ${feedback ? renderFeedbackView(feedback) : renderFeedbackForm(id, data.status)}
                </div>
                ` : ''}
            </div>
        `;

        // Inject specific styles
        if (!document.getElementById('interviewer-detail-styles')) {
            const s = document.createElement('style');
            s.id = 'interviewer-detail-styles';
            s.textContent = `
                .interviewer-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding-bottom: 80px;
                }
                .back-nav {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: #888;
                    font-size: 14px;
                    margin-bottom: 20px;
                    cursor: pointer;
                    transition: color 0.2s;
                    padding: 8px 0;
                }
                .back-nav:hover { color: white; }
                
                .glass-card {
                    background: rgba(30, 30, 30, 0.6);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }
                
                .candidate-header {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                .candidate-name {
                    font-size: 24px;
                    font-weight: 700;
                    color: white;
                    margin: 0 0 8px 0;
                }
                .candidate-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    align-items: center;
                    font-size: 13px;
                    color: #888;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 24px;
                }
                .info-group label {
                    display: block;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                    color: #666;
                    margin-bottom: 8px;
                }
                .info-group div {
                    font-size: 15px;
                    color: #eee;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .info-link {
                    color: #3390ec;
                    text-decoration: none;
                }
                .info-link:hover { text-decoration: underline; }

                .skill-tag {
                    background: rgba(255, 255, 255, 0.1); 
                    padding: 4px 10px; 
                    border-radius: 6px; 
                    font-size: 13px;
                    color: #e0e0e0;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                
                .section-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: white;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                /* Reuse feedback form styles but clearer */
                .form-control {
                    width: 100%;
                    padding: 12px;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    transition: border-color 0.2s;
                    resize: vertical;
                }
                .form-control:focus {
                    border-color: #3390ec;
                    outline: none;
                }
                .form-label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 13px;
                    color: #ccc;
                    font-weight: 500;
                }

                .score-slider-container {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: rgba(0,0,0,0.2);
                    padding: 16px;
                    border-radius: 12px;
                }
                input[type=range] {
                    flex: 1;
                    height: 6px;
                    background: #444;
                    border-radius: 3px;
                    border: none;
                    outline: none;
                    -webkit-appearance: none;
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #3390ec;
                    cursor: pointer;
                    border: 2px solid #1e1e1e;
                }
                .score-display {
                    font-size: 24px;
                    font-weight: 800;
                    color: #3390ec;
                    min-width: 48px;
                    text-align: center;
                }

                /* Action Card Refinements */
                .action-card {
                    margin-top: 24px;
                    background: rgba(51, 144, 236, 0.1);
                    border: 1px solid rgba(51, 144, 236, 0.3);
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .action-btn-lg {
                    background: #3390ec;
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .action-btn-lg:hover {
                     background: #2b7ac9;
                     transform: translateY(-1px);
                }
            `;
            document.head.appendChild(s);
        }

    } catch (error) {
        console.error(error);
        app.innerHTML = `<div class="container"><div class="error">Error: ${error.message}</div></div>`;
    }
}



function renderFeedbackView(fb) {
    return `
        <div style="background: rgba(51, 144, 236, 0.1); padding: 16px; border-radius: 8px;">
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #aaa;">Оцінка:</span>
                <span style="font-size: 24px; font-weight: 800; color: #3390ec;">${fb.score}/10</span>
            </div>
            
            <div style="margin-bottom: 12px;">
                <strong style="display: block; margin-bottom: 4px; color: #4ade80;">✅ Плюси:</strong>
                <p style="margin: 0; color: #ddd; white-space: pre-wrap;">${fb.pros || '-'}</p>
            </div>

            <div style="margin-bottom: 12px;">
                <strong style="display: block; margin-bottom: 4px; color: #f87171;">❌ Мінуси:</strong>
                <p style="margin: 0; color: #ddd; white-space: pre-wrap;">${fb.cons || '-'}</p>
            </div>

            <div>
                <strong style="display: block; margin-bottom: 4px; color: #fff;">ℹ️ Резюме:</strong>
                <p style="margin: 0; color: #ddd; font-style: italic;">"${fb.summary || '-'}"</p>
            </div>
            
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: #888; font-size: 12px;">
                Фідбек відправлено. Статус оновлено.
            </div>
        </div>
    `;
}

function renderFeedbackForm(id) {
    return `
        <form id="feedback-form" onsubmit="submitFeedback(event, ${id})">
            <div class="form-group">
                <label class="form-label">Технічна оцінка (1-10)</label>
                <div class="range-wrap">
                    <input type="range" name="score" min="1" max="10" value="5" class="form-control" oninput="document.getElementById('score-val').innerText = this.value">
                    <div id="score-val" class="score-display">5</div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Що сподобалось (Pros)</label>
                <textarea name="pros" rows="3" class="form-control" placeholder="Сильні сторони кандидата..."></textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Що не сподобалось (Cons)</label>
                <textarea name="cons" rows="3" class="form-control" placeholder="Слабкі сторони / прогалини..."></textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Загальне резюме (Summary)</label>
                <textarea name="summary" rows="4" class="form-control" required placeholder="Ваш висновок: Hire / No Hire / Strong Hire..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-large" style="width: 100%; margin-top: 10px;">
                📤 Відправити фідбек
            </button>
        </form>
    `;
}

window.submitFeedback = async function (e, id) {
    e.preventDefault();
    const form = e.target;
    // Basic validation
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = 'Відправка...';

    const data = {
        score: parseInt(form.score.value),
        pros: form.pros.value,
        cons: form.cons.value,
        summary: form.summary.value
    };

    try {
        await apiPost(`/interviewer/applications/${id}/feedback`, data);
        // Refresh view to show read-only feedback
        loadInterviewerApplicationDetail(id);
    } catch (err) {
        alert('Помилка при відправці: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
};

function formatStatus(status) {
    const map = {
        'pending': 'Очікує',
        'tech_pending': 'Очікує Tech',
        'tech_scheduled': 'Tech Заплановано',
        'tech_completed': 'Tech Завершено',
        'rejected': 'Відхилено'
    };
    return map[status ? status.toLowerCase() : ''] || status;
}

// Global exports
window.loadInterviewerDashboard = loadInterviewerDashboard;

// Update actions to use specific tech modals
function renderInterviewerActions(app) {
    const status = app.status ? app.status.toLowerCase() : '';

    if (status === 'tech_pending') {
        return `
            <div class="action-card">
                <div>
                    <h3 style="margin: 0; font-size: 18px; color: #fff; margin-bottom: 4px;">📅 Планування</h3>
                    <p style="margin: 0; font-size: 13px; color: #aaa;">Запропонуйте кандидату слоти для інтерв'ю</p>
                </div>
                <button class="action-btn-lg" onclick="window.openTechScheduleModal(${app.id})">
                     Додати слоти
                </button>
            </div>
        `;
    }

    if (status === 'tech_scheduled') {
        const interview = app.active_interview;

        if (interview && interview.selected_time) {
            return `
                <div class="action-card" style="border-color: #4ade80; background: rgba(74, 222, 128, 0.08);">
                     <div>
                        <h3 style="margin: 0; font-size: 18px; color: #4ade80; margin-bottom: 4px;">✅ Час обрано</h3>
                        <p style="margin: 0; font-size: 13px; color: #ccc;">Кандидат підтвердив слот. Надішліть деталі.</p>
                     </div>
                     <button class="action-btn-lg" style="background: #4ade80; color: #004d20;" 
                        onclick="window.openTechFinalizeModal(${app.id}, ${interview.id}, '${interview.selected_time}')">
                         Надіслати посилання
                    </button>
                </div>
             `;
        } else {
            return `
                <div class="action-card" style="border-color: #eab308; background: rgba(234, 179, 8, 0.08);">
                     <div>
                        <h3 style="margin: 0; font-size: 18px; color: #eab308; margin-bottom: 4px;">⏳ Очікуємо кандидата</h3>
                        <p style="margin: 0; font-size: 13px; color: #ccc;">Слоти надіслано. Очікуємо вибору часу.</p>
                     </div>
                     <button class="action-btn-lg" style="background: #333; color: #888; cursor: default;" disabled>
                         Очікування...
                    </button>
                </div>
             `;
        }
    }

    return '';
}


// --- Tech Scheudle Modal ---
// --- Tech Scheudle Modal ---
window.openTechScheduleModal = function (applicationId) {
    // Remove existing modal if any
    const existing = document.getElementById('tech-schedule-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'tech-schedule-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;
        backdrop-filter: blur(2px);
    `;

    // Initialize selection state
    const now = new Date();
    // Round up to next hour for default start time
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);

    // Default end time is start + 1 hour
    const end = new Date(nextHour);
    end.setHours(end.getHours() + 1);

    let selectedDate = new Date(nextHour);
    let selectedStartTime = { hours: nextHour.getHours(), minutes: 0 };
    let selectedEndTime = { hours: end.getHours(), minutes: 0 };
    let selectedSlots = [];

    // Formatter for display
    const formatDateDisplay = (date) => {
        return date.toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatTimeDisplay = (time) => {
        return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
    };

    modal.innerHTML = `
        <div class="modal-content" style="background: #212121; padding: 24px; border-radius: 16px; width: 90%; max-width: 420px; color: #ffffff; box-shadow: 0 10px 40px rgba(0,0,0,0.6); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <h2 style="margin-top:0; margin-bottom: 8px; color: #ffffff; font-size: 20px; font-weight: 600;">📅 Технічне Інтерв'ю</h2>
            <p style="font-size: 14px; opacity: 0.7; color: #cccccc; margin-bottom: 24px;">Запропонуйте слоти для кандидата.</p>
            
            <div style="margin-bottom: 24px;">
                <label style="display:block; margin-bottom: 8px; font-weight:500; color: #e0e0e0; font-size: 14px;">Дата та Час:</label>
                
                <div id="t-date-btn" style="padding: 12px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: border-color 0.2s;">
                    <span style="font-size: 15px;">${formatDateDisplay(selectedDate)}</span>
                    <span style="opacity: 0.5;">📅</span>
                </div>

                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <span style="font-size: 12px; color: #888; margin-bottom: 4px;">З</span>
                        <div id="t-start-time-btn" style="padding: 10px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; cursor: pointer; text-align: center; font-size: 15px; transition: border-color 0.2s;">
                            ${formatTimeDisplay(selectedStartTime)}
                        </div>
                    </div>
                    <span style="color: #666; padding-top: 16px;">—</span>
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <span style="font-size: 12px; color: #888; margin-bottom: 4px;">До</span>
                        <div id="t-end-time-btn" style="padding: 10px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; cursor: pointer; text-align: center; font-size: 15px; transition: border-color 0.2s;">
                            ${formatTimeDisplay(selectedEndTime)}
                        </div>
                    </div>
                    <button id="t-add-slot-btn" class="btn" style="background: #3390ec; color: white; border: none; width: 42px; height: 42px; font-size: 24px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-top: 18px; transition: background 0.2s;">+</button>
                </div>
            </div>

            <div style="margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #e0e0e0;">Обрані слоти:</div>
            <div id="t-slots-list" style="margin-bottom: 24px; max-height: 180px; overflow-y: auto; background: #1a1a1a; padding: 4px; border-radius: 10px; border: 1px solid #333; min-height: 80px;">
                <div style="text-align: center; color: #666; font-size: 13px; padding: 20px;">Список порожній</div>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="t-cancel-schedule-btn" class="btn" style="background: transparent; color: #ff5e5e; border: 1px solid #ff5e5e; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Скасувати</button>
                <button id="t-confirm-schedule-btn" class="btn" disabled style="background: #3390ec; color: white; border: none; border-radius: 8px; padding: 10px 24px; font-weight: 500; opacity: 0.5; cursor: not-allowed; transition: opacity 0.2s;">Відправити</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const dateBtn = document.getElementById('t-date-btn');
    const startBtn = document.getElementById('t-start-time-btn');
    const endBtn = document.getElementById('t-end-time-btn');
    const addBtn = document.getElementById('t-add-slot-btn');
    const list = document.getElementById('t-slots-list');
    const confirmBtn = document.getElementById('t-confirm-schedule-btn');
    const cancelBtn = document.getElementById('t-cancel-schedule-btn');

    // Helper to parse time string "HH:MM" to object
    const parseTimeString = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
    };

    // Pickers Initialization
    dateBtn.onclick = () => {
        new DateTimePicker({
            mode: 'date',
            defaultDate: selectedDate,
            minDate: new Date(),
            onSelect: (d, t) => {
                selectedDate = d;
                dateBtn.querySelector('span').innerText = formatDateDisplay(d);
            }
        }).open();
    };

    startBtn.onclick = () => {
        new DateTimePicker({
            mode: 'time',
            defaultTime: formatTimeDisplay(selectedStartTime),
            onSelect: (date, timeStr) => {
                selectedStartTime = parseTimeString(timeStr);
                startBtn.innerText = formatTimeDisplay(selectedStartTime);
            }
        }).open();
    };

    endBtn.onclick = () => {
        new DateTimePicker({
            mode: 'time',
            defaultTime: formatTimeDisplay(selectedEndTime),
            onSelect: (date, timeStr) => {
                selectedEndTime = parseTimeString(timeStr);
                endBtn.innerText = formatTimeDisplay(selectedEndTime);
            }
        }).open();
    };

    // Helper to render slots
    function renderSlots() {
        if (selectedSlots.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #666; font-size: 13px; padding: 20px;">Список порожній</div>';
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = "0.5";
            confirmBtn.style.cursor = "not-allowed";
            return;
        }

        list.innerHTML = selectedSlots.map((slot, index) => {
            const start = new Date(slot.start);
            const end = new Date(slot.end);

            // Format nice: 29.12.2025 | 10:00 - 11:00
            const dateStr = start.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = `${start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;

            return `
            <div style="display:flex; justify-content: space-between; align-items: center; padding: 10px 12px; margin: 4px; background: #2c2c2c; border-radius: 8px; font-size: 14px; border: 1px solid #3a3a3a;">
                <div style="display:flex; flex-direction: column; gap: 2px;">
                    <span style="font-weight: 500; color: #fff;">${dateStr}</span>
                    <span style="font-size: 12px; color: #aaa;">${timeStr}</span>
                </div>
                <button onclick="window._removeTSlot(${index})" style="background: transparent; border: none; color: #ff5e5e; font-size: 18px; cursor: pointer; padding: 4px;">×</button>
            </div>
            `;
        }).join('');

        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
        confirmBtn.style.cursor = "pointer";
    }

    // Expose remove handler globally
    window._removeTSlot = (index) => {
        selectedSlots.splice(index, 1);
        renderSlots();
    };

    // Add Slot Handler
    addBtn.onclick = () => {
        const start = new Date(selectedDate);
        start.setHours(selectedStartTime.hours, selectedStartTime.minutes, 0);

        const end = new Date(selectedDate);
        end.setHours(selectedEndTime.hours, selectedEndTime.minutes, 0);

        // Validations
        if (end <= start) {
            alert('⚠️ Час завершення має бути пізніше часу початку');
            return;
        }

        // Check for duplicates
        if (selectedSlots.some(s => s.start === start.toISOString() && s.end === end.toISOString())) {
            alert('⚠️ Цей слот вже додано');
            return;
        }

        selectedSlots.push({
            start: start.toISOString(),
            end: end.toISOString()
        });

        // Sort by date
        selectedSlots.sort((a, b) => new Date(a.start) - new Date(b.start));

        renderSlots();

        // Animation feedback
        addBtn.style.transform = "scale(0.9)";
        setTimeout(() => addBtn.style.transform = "scale(1)", 100);
    };

    // Close Handler
    const close = () => {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            delete window._removeTSlot;
        }, 200);
    };

    cancelBtn.onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    // Confirm Handler
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;margin:0 auto"></div>';

        try {
            await apiPost(`/interviewer/applications/${applicationId}/interview/schedule`, { slots: selectedSlots });

            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                window.Telegram.WebApp.showPopup({ message: "✅ Пропозицію відправлено!" });
            } else {
                alert("✅ Пропозицію відправлено!");
            }

            close();

            // Refresh parent view
            if (typeof loadInterviewerApplicationDetail === 'function') setTimeout(() => loadInterviewerApplicationDetail(applicationId), 300);

        } catch (error) {
            alert(`⚠️ Помилка: ${error.message}`);
            confirmBtn.innerHTML = 'Відправити';
            confirmBtn.disabled = false;
        }
    };
};

// --- Tech Finalize Modal ---
// --- Tech Finalize Modal ---
window.openTechFinalizeModal = function (applicationId, interviewId, timeStr) {
    const existing = document.getElementById('tech-finalize-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'tech-finalize-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;
        backdrop-filter: blur(2px);
    `;

    const formattedTime = new Date(timeStr).toLocaleString('uk-UA', {
        weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    modal.innerHTML = `
        <div class="modal-content" style="background: #1e1e1e; padding: 24px; border-radius: 16px; width: 90%; max-width: 400px; color: #ffffff; box-shadow: 0 20px 60px rgba(0,0,0,0.5); font-family: sans-serif; border: 1px solid #333;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 50px; height: 50px; background: rgba(76, 175, 80, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
                    <span style="font-size: 24px;">✅</span>
                </div>
                <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Підтвердження Tech</h2>
                <p style="color: #888; margin-top: 8px; font-size: 14px;">
                    Кандидат обрав: <span style="color: #fff; font-weight: 500;">${formattedTime}</span>
                </p>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display:block; margin-bottom: 8px; font-weight:500; font-size: 13px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Тип зустрічі</label>
                <div style="display: flex; gap: 12px; background: #262626; padding: 4px; border-radius: 12px; border: 1px solid #333;">
                    <label style="flex: 1; cursor: pointer; position: relative;">
                        <input type="radio" name="loc-type" value="online" checked style="position: absolute; opacity: 0; width: 0; height: 0;">
                        <div class="radio-tile" style="display: flex; align-items: center; justify-content: center; padding: 10px 10px 8px 10px; border-radius: 8px; transition: all 0.2s; font-weight: 500; font-size: 14px;">
                            📹 Online
                        </div>
                    </label>
                    <label style="flex: 1; cursor: pointer; position: relative;">
                        <input type="radio" name="loc-type" value="office" style="position: absolute; opacity: 0; width: 0; height: 0;">
                        <div class="radio-tile" style="display: flex; align-items: center; justify-content: center; padding: 10px 10px 8px 10px; border-radius: 8px; transition: all 0.2s; font-size: 14px;">
                            🏢 Офіс
                        </div>
                    </label>
                </div>
            </div>

            <div id="online-input-group" class="input-group-anim">
                <label style="display:block; margin-bottom: 8px; font-weight:500; font-size: 13px; color: #aaa;">Посилання (Google Meet / Zoom)</label>
                <input type="text" id="meet-link" placeholder="Paste link here..." style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #333; background: #262626; color: white; box-sizing: border-box; font-size: 15px; outline: none; transition: border-color 0.2s;">
            </div>

            <div id="office-input-group" class="input-group-anim" style="display: none;">
                <label style="display:block; margin-bottom: 8px; font-weight:500; font-size: 13px; color: #aaa;">Адреса офісу</label>
                <input type="text" id="office-address" placeholder="Введіть адресу..." style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #333; background: #262626; color: white; box-sizing: border-box; font-size: 15px; outline: none; transition: border-color 0.2s; margin-bottom: 12px;">
                
                <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                        <input type="text" id="office-floor" placeholder="Поверх" style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #333; background: #262626; color: white; box-sizing: border-box; font-size: 15px; outline: none; transition: border-color 0.2s;">
                    </div>
                    <div style="flex: 1;">
                        <input type="text" id="office-cabinet" placeholder="Кабінет" style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #333; background: #262626; color: white; box-sizing: border-box; font-size: 15px; outline: none; transition: border-color 0.2s;">
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 32px;">
                <button id="cancel-finalize-btn" class="btn" style="flex: 1; background: transparent; color: #aaa; border: 1px solid #444; padding: 12px; border-radius: 10px; font-weight: 500; cursor: pointer; transition: all 0.2s;">Скасувати</button>
                <button id="submit-finalize-btn" class="btn" style="flex: 1; background: #3390ec; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(51, 144, 236, 0.3);">Підтвердити</button>
            </div>
        </div>
    `;

    // Reusing styles from HR modal if global, otherwise inject
    const styleId = 'finalize-modal-styles';
    if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = `
            #tech-finalize-modal input[type="radio"]:checked + .radio-tile {
                background: #3390ec;
                color: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            #tech-finalize-modal input[type="radio"]:not(:checked) + .radio-tile {
                background: transparent;
                color: #888;
            }
            #tech-finalize-modal input[type="radio"]:not(:checked) + .radio-tile:hover {
                background: rgba(255,255,255,0.05);
                color: #ccc;
            }
            #tech-finalize-modal input:focus {
                border-color: #3390ec !important;
            }
        `;
        document.head.appendChild(s);
    }

    document.body.appendChild(modal);

    const radios = modal.querySelectorAll('input[name="loc-type"]');
    const onlineGroup = document.getElementById('online-input-group');
    const officeGroup = document.getElementById('office-input-group');

    radios.forEach(r => r.onchange = () => {
        if (r.value === 'online') {
            onlineGroup.style.display = 'block';
            officeGroup.style.display = 'none';
        } else {
            onlineGroup.style.display = 'none';
            officeGroup.style.display = 'block';
        }
    });

    document.getElementById('cancel-finalize-btn').onclick = () => modal.remove();

    document.getElementById('submit-finalize-btn').onclick = () => {
        const type = document.querySelector('input[name="loc-type"]:checked').value;
        const details = {};

        if (type === 'online') {
            const link = document.getElementById('meet-link').value.trim();
            if (!link) return alert('Введіть посилання!');
            details.meet_link = link;
        } else {
            const addr = document.getElementById('office-address').value.trim();
            const floor = document.getElementById('office-floor').value.trim();
            const cabinet = document.getElementById('office-cabinet').value.trim();

            if (!addr) return alert('Введіть адресу!');

            let fullAddress = addr;
            if (floor) fullAddress += `, поверх ${floor}`;
            if (cabinet) fullAddress += `, каб. ${cabinet}`;

            details.address = fullAddress;
        }

        const btn = document.getElementById('submit-finalize-btn');
        btn.disabled = true;
        btn.innerHTML = '...';

        apiPost(`/interviewer/applications/${applicationId}/interview/finalize`, {
            interview_id: interviewId,
            location_type: type,
            details: details
        }).then(() => {
            if (window.Telegram?.WebApp) window.Telegram.WebApp.showPopup({ message: "✅ Інтерв'ю підтверджено!" });
            else alert("✅ Інтерв'ю підтверджено!");
            modal.remove();
            loadInterviewerApplicationDetail(applicationId);
        }).catch(err => {
            alert("Помилка: " + err.message);
            btn.disabled = false;
            btn.innerHTML = 'Підтвердити';
        });
    };
};
function showFinalizeUI(applicationId) {
    // Deprecated, removed.
}

