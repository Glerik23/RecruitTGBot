import { API_URL, apiGet, apiPost } from '../utils/api.js';
import { createApplicationCard } from '../components/ApplicationCard.js';
import { createApplicationDetail } from '../components/ApplicationDetail.js?v=3';
import DateTimePicker from '../components/DateTimePicker.js';

let currentApplicationId = null;
let _currentFilter = 'pending'; // Default: Inbox
const tg = window.Telegram?.WebApp;

export async function loadHRApplications(filter = null) {
    if (filter) _currentFilter = filter;

    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading"><div class="spinner"></div><p>Завантаження...</p></div>';

    try {
        const queryParams = _currentFilter === 'all' ? '?status=all' : `?status=${_currentFilter}`;
        const data = await apiGet(`/hr/applications${queryParams}`);

        const counts = data.counts || {};

        const filters = [
            { label: `📥 Вхідні (${counts.pending || 0})`, value: 'pending' },
            { label: `⚙️ В обробці (${counts.processing || 0})`, value: 'processing' },
            { label: `🗣️ Співбесіди (${counts.interviews || 0})`, value: 'interviews' },
            { label: `📂 Всі (${counts.all || 0})`, value: 'all' },
            { label: `🗄️ Архів (${counts.archive || 0})`, value: 'archive' }
        ];

        const filterButtonsHtml = filters.map(f => `
            <button class="filter-chip ${f.value === _currentFilter ? 'active' : ''}" onclick="loadHRApplications('${f.value}')">
                ${f.label}
            </button>
        `).join('');

        let contentHtml = '';

        if (!data.applications || data.applications.length === 0) {
            contentHtml = `
                <div class="card empty-state" style="text-align: center; padding: 40px; margin-top: 20px;">
                    <div class="empty-icon" style="font-size: 64px; margin-bottom: 20px;">📭</div>
                    <h2 style="color: var(--tg-theme-text-color, #ffffff); margin-bottom: 10px;">Список порожній</h2>
                    <p style="color: var(--tg-theme-hint-color, #aaa);">Заявки зі статусом "${filters.find(f => f.value === _currentFilter)?.label}" відсутні.</p>
                </div>
            `;
        } else {
            contentHtml = `<div id="applications-list"></div>`;
        }

        app.innerHTML = `
            <div class="hr-flex-wrapper" style="display: flex; flex-direction: column; height: calc(100vh - 40px);">
                <div class="page-header" style="flex-shrink: 0;">
                    <h1>📋 Заявки HR</h1>
                    <div class="filters-scroll" style="display: flex; gap: 10px; padding: 10px 0;">
                        ${filterButtonsHtml}
                    </div>
                    ${data.applications && data.applications.length > 0 ? `<p class="page-subtitle">Знайдено: ${data.applications.length}</p>` : ''}
                </div>
                ${contentHtml}
            </div>
        `;

        // Render Cards if any
        if (data.applications && data.applications.length > 0) {
            const listContainer = document.getElementById('applications-list');
            data.applications.forEach(application => {
                // Show actions only if PENDING or INTERVIEW_SCHEDULED? 
                // Currently allow typical actions. 
                // Ideally, if Accepted/Rejected, buttons should be hidden or different.
                // For now, pass 'true' to show buttons, but maybe logic in Card helps?
                // Card logic: createApplicationCard(app, showStatus, showDate, showActions)
                // If status is 'pending', show actions.
                // Show actions for active applications
                const activeStatuses = [
                    'pending', 'accepted',
                    'screening_pending', 'screening_scheduled', 'screening_completed',
                    'tech_pending', 'tech_scheduled', 'tech_completed'
                ];
                const showActions = activeStatuses.includes(application.status ? application.status.toLowerCase() : '');
                const card = createApplicationCard(application, true, true, showActions);
                listContainer.appendChild(card);
            });
        }

        // Inject Styles
        if (!document.getElementById('hr-filters-style')) {
            const style = document.createElement('style');
            style.id = 'hr-filters-style';
            style.textContent = `
                .filter-chip {
                    padding: 8px 16px;
                    border: 1px solid #e0e0e0;
                    border-radius: 20px;
                    background: var(--card-bg, #fff);
                    color: var(--text-secondary, #666);
                    font-size: 14px;
                    font-weight: 500;
                    white-space: nowrap;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                    width: auto !important; /* Override global button width */
                    margin: 0; /* Override global button margin */
                }
                .filter-chip.active {
                    background: var(--primary-color, #3390ec);
                    color: white;
                    border-color: var(--primary-color, #3390ec);
                    box-shadow: 0 2px 8px rgba(51, 144, 236, 0.3);
                }
                .filter-chip:hover:not(.active) {
                    background: #f5f5f5;
                }
                
                /* Filters Scroll Container */
                .filters-scroll {
                    overflow-x: auto;
                    white-space: nowrap;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                    scrollbar-color: var(--primary-color, #3390ec) transparent;
                }

                @media (min-width: 768px) {
                    .filters-scroll {
                        flex-wrap: wrap; /* Wrap on desktop */
                        overflow-x: visible; /* No scroll needed */
                        white-space: normal;
                    }
                }

                /* Scrollbar Styles */
                .filters-scroll::-webkit-scrollbar {
                    height: 6px;
                }
                .filters-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .filters-scroll::-webkit-scrollbar-thumb {
                    background-color: var(--primary-color, #3390ec);
                    border-radius: 10px;
                }

                /* Applications List Scroll (Vertical) */
                #applications-list {
                    flex-grow: 1;
                    height: 100%; /* Fill remaining flex space */
                    overflow-y: auto;
                    padding-right: 8px;
                    padding-bottom: 50px; /* Safe bottom space */
                    min-height: 0; /* Important for flex scrolling */
                }
                #applications-list::-webkit-scrollbar {
                    width: 6px;
                }
                #applications-list::-webkit-scrollbar-track {
                    background: transparent;
                }
                #applications-list::-webkit-scrollbar-thumb {
                    background-color: var(--primary-color, #3390ec);
                    border-radius: 10px;
                }
            `;
            document.head.appendChild(style);
        }

    } catch (error) {
        console.error('Loader error:', error);
        app.innerHTML = `
            <div class="error">
                <h2>Помилка завантаження</h2>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadHRApplications()">🔄 Спробувати ще раз</button>
            </div>
        `;
    }
}

export async function viewApplication(applicationId) {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading"><div class="spinner"></div><p>Завантаження...</p></div>';

    try {
        const application = await apiGet(`/hr/applications/${applicationId}`);

        currentApplicationId = applicationId;

        // Determine if we should show actions based on status
        const activeStatuses = [
            'pending', 'accepted',
            'screening_pending', 'screening_scheduled', 'screening_completed',
            'tech_pending', 'tech_scheduled', 'tech_completed'
        ];
        const currentStatus = application.status ? application.status.toLowerCase() : '';
        const canAct = activeStatuses.includes(currentStatus);

        const detail = createApplicationDetail(application, canAct, true);

        // Add "Back" button functionality
        const backBtn = document.createElement('div');
        backBtn.className = 'back-nav';
        backBtn.innerHTML = `<button class="btn-text" onclick="loadHRApplications()">⬅️ Назад до списку</button>`;
        backBtn.style.padding = '10px';

        app.innerHTML = '';
        app.appendChild(backBtn);
        app.appendChild(detail);

    } catch (error) {
        alert(`Помилка: ${error.message}`);
        loadHRApplications();
    }
}

window.openAcceptanceModal = function (applicationId) {
    const existing = document.getElementById('acceptance-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'acceptance-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;
        backdrop-filter: blur(2px); animation: fadeIn 0.2s ease-out;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="background: #1e1e1e; padding: 24px; border-radius: 16px; width: 90%; max-width: 400px; color: #ffffff; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid #333; position: relative;">
            
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: rgba(76, 175, 80, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <span style="font-size: 32px;">✅</span>
                </div>
                <h2 style="margin: 0; font-size: 22px; font-weight: 600;">Прийняти заявку</h2>
                <p style="color: #aaa; margin-top: 8px; font-size: 15px; line-height: 1.5;">
                    Ви впевнені, що хочете взяти заявку в роботу?
                    <br><span style="font-size: 13px; color: #666;">Заявка перейде в статус "В обробці".</span>
                </p>
            </div>

            <div style="display: flex; gap: 12px;">
                <button id="cancel-accept-btn" class="btn" style="flex: 1; background: transparent; color: #ccc; border: 1px solid #444; padding: 12px; border-radius: 10px; font-weight: 500; cursor: pointer; transition: all 0.2s;">Скасувати</button>
                <button id="confirm-accept-btn" class="btn" style="flex: 1; background: #4caf50; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);">Прийняти</button>
            </div>
        </div>
    `;

    // Inject styles for hover effects if not already present
    if (!document.getElementById('accept-modal-style')) {
        const s = document.createElement('style');
        s.id = 'accept-modal-style';
        s.textContent = `
            #cancel-accept-btn:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: #666; }
            #confirm-accept-btn:hover { background: #43a047; }
            #confirm-accept-btn:active { transform: scale(0.98); }
        `;
        document.head.appendChild(s);
    }

    document.body.appendChild(modal);

    // Close Handler
    const close = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 200);
    };

    document.getElementById('cancel-accept-btn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    // Confirm Handler
    document.getElementById('confirm-accept-btn').onclick = async () => {
        const btn = document.getElementById('confirm-accept-btn');
        const cancelBtn = document.getElementById('cancel-accept-btn');
        btn.disabled = true;
        cancelBtn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;margin:0 auto"></div>';

        try {
            await apiPost(`/hr/applications/${applicationId}/accept`, {});

            if (window.Telegram?.WebApp) {
                // Haptic Feedback
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }

            showNotification("✅ Заявку прийнято в роботу!");

            close();

            // Refresh
            if (typeof loadHRApplications === 'function') setTimeout(() => loadHRApplications(), 300);

        } catch (error) {
            alert(`Помилка: ${error.message}`);
            btn.innerHTML = 'Прийняти';
            btn.disabled = false;
            cancelBtn.disabled = false;
        }
    };
};

window.openRejectionModal = function (applicationId) {
    const existing = document.getElementById('rejection-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'rejection-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;
        backdrop-filter: blur(2px); animation: fadeIn 0.2s ease-out;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="background: #1e1e1e; padding: 24px; border-radius: 16px; width: 90%; max-width: 400px; color: #ffffff; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid #333; position: relative;">
            
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="width: 56px; height: 56px; background: rgba(255, 94, 94, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <span style="font-size: 28px;">❌</span>
                </div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Відхилити заявку</h2>
                <p style="color: #aaa; margin-top: 8px; font-size: 14px; line-height: 1.5;">
                    Будь ласка, вкажіть причину відмови.<br>Це допоможе вести статистику.
                </p>
            </div>

            <div style="margin-bottom: 24px;">
                <textarea id="rejection-reason" placeholder="Причина відмови (напр. недостатній досвід, не підходить стек...)" style="
                    width: 100%; height: 100px; padding: 14px; border-radius: 12px; border: 1px solid #333; 
                    background: #262626; color: white; box-sizing: border-box; font-size: 15px; outline: none; 
                    resize: none; transition: border-color 0.2s; font-family: inherit;
                "></textarea>
            </div>

            <div style="display: flex; gap: 12px;">
                <button id="cancel-rejection-btn" class="btn" style="flex: 1; background: transparent; color: #ccc; border: 1px solid #444; padding: 12px; border-radius: 10px; font-weight: 500; cursor: pointer; transition: all 0.2s;">Скасувати</button>
                <button id="confirm-rejection-btn" class="btn" style="flex: 1; background: #ff5e5e; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 94, 94, 0.3);">Відхилити</button>
            </div>
        </div>
    `;

    // Inject Styles if needed (reusing common modal styles, but adding focus)
    if (!document.getElementById('rejection-modal-style')) {
        const s = document.createElement('style');
        s.id = 'rejection-modal-style';
        s.textContent = `
            #rejection-reason:focus { border-color: #ff5e5e !important; }
            #cancel-rejection-btn:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: #666; }
            #confirm-rejection-btn:active { transform: scale(0.98); }
        `;
        document.head.appendChild(s);
    }

    document.body.appendChild(modal);

    const textarea = document.getElementById('rejection-reason');
    textarea.focus();

    // Close Handler
    const close = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 200);
    };

    document.getElementById('cancel-rejection-btn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    // Confirm Handler
    document.getElementById('confirm-rejection-btn').onclick = async () => {
        const reason = textarea.value.trim();
        if (!reason) {
            textarea.style.borderColor = '#ff5e5e';
            textarea.placeholder = '⚠️ Поле не може бути порожнім!';
            return;
        }

        const btn = document.getElementById('confirm-rejection-btn');
        const cancelBtn = document.getElementById('cancel-rejection-btn');
        btn.disabled = true;
        cancelBtn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;margin:0 auto"></div>';

        try {
            await apiPost(`/hr/applications/${applicationId}/reject`, { reason: reason });

            // Success feedback
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }

            showNotification("❌ Заявку відхилено", 'error');

            close();

            // Refresh list or view
            // Assuming viewApplication or loadHRApplications is available
            if (typeof loadHRApplications === 'function') setTimeout(() => loadHRApplications(), 300);

        } catch (error) {
            alert(`Помилка: ${error.message}`);
            btn.innerHTML = 'Відхилити';
            btn.disabled = false;
            cancelBtn.disabled = false;
        }
    };
};

// --- Notification Logic ---
function showNotification(message, type = 'success') {
    const existing = document.getElementById('custom-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'custom-notification';
    const bgColor = type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)';
    const icon = type === 'success' ? '✅' : '⚠️';

    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #1e1e1e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-left: 4px solid ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 2000;
        min-width: 300px;
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    notification.innerHTML = `
        <div style="font-size: 20px;">${icon}</div>
        <div style="font-weight: 500; font-size: 15px;">${message}</div>
    `;

    document.body.appendChild(notification);

    // Animate In
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(-50%) translateY(0)';
        notification.style.opacity = '1';
    });

    // Vibration
    if (window.Telegram?.WebApp?.vibrate) {
        window.Telegram.WebApp.vibrate(type === 'success' ? [50] : [50, 50]);
    }

    // Auto Hide
    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(100px)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Експортуємо глобально
window.loadHRApplications = loadHRApplications;
window.viewApplication = viewApplication;
window.openAcceptanceModal = openAcceptanceModal;
window.openRejectionModal = openRejectionModal;
window.showNotification = showNotification;

// --- Modal Logic ---

// --- Modal Logic ---

window.openScheduleModal = function (applicationId) {
    // Remove existing modal if any
    const existing = document.getElementById('schedule-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'schedule-modal';
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
            <h2 style="margin-top:0; margin-bottom: 8px; color: #ffffff; font-size: 20px; font-weight: 600;">📅 Планування Скрінінгу</h2>
            <p style="font-size: 14px; opacity: 0.7; color: #cccccc; margin-bottom: 24px;">Додайте варіанти часу для кандидата.</p>
            
            <div style="margin-bottom: 24px;">
                <label style="display:block; margin-bottom: 8px; font-weight:500; color: #e0e0e0; font-size: 14px;">Дата та Час:</label>
                
                <div id="date-btn" style="padding: 12px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: border-color 0.2s;">
                    <span style="font-size: 15px;">${formatDateDisplay(selectedDate)}</span>
                    <span style="opacity: 0.5;">📅</span>
                </div>

                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <span style="font-size: 12px; color: #888; margin-bottom: 4px;">З</span>
                        <div id="start-time-btn" style="padding: 10px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; cursor: pointer; text-align: center; font-size: 15px; transition: border-color 0.2s;">
                            ${formatTimeDisplay(selectedStartTime)}
                        </div>
                    </div>
                    <span style="color: #666; padding-top: 16px;">—</span>
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <span style="font-size: 12px; color: #888; margin-bottom: 4px;">До</span>
                        <div id="end-time-btn" style="padding: 10px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; cursor: pointer; text-align: center; font-size: 15px; transition: border-color 0.2s;">
                            ${formatTimeDisplay(selectedEndTime)}
                        </div>
                    </div>
                    <button id="add-slot-btn" class="btn" style="background: #3390ec; color: white; border: none; width: 42px; height: 42px; font-size: 24px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-top: 18px; transition: background 0.2s;">+</button>
                </div>
            </div>

            <div style="margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #e0e0e0;">Обрані слоти:</div>
            <div id="slots-list" style="margin-bottom: 24px; max-height: 180px; overflow-y: auto; background: #1a1a1a; padding: 4px; border-radius: 10px; border: 1px solid #333; min-height: 80px;">
                <div style="text-align: center; color: #666; font-size: 13px; padding: 20px;">Список порожній</div>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancel-schedule-btn" class="btn" style="background: transparent; color: #ff5e5e; border: 1px solid #ff5e5e; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Скасувати</button>
                <button id="confirm-schedule-btn" class="btn" disabled style="background: #3390ec; color: white; border: none; border-radius: 8px; padding: 10px 24px; font-weight: 500; opacity: 0.5; cursor: not-allowed; transition: opacity 0.2s;">Відправити</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const dateBtn = document.getElementById('date-btn');
    const startBtn = document.getElementById('start-time-btn');
    const endBtn = document.getElementById('end-time-btn');
    const addBtn = document.getElementById('add-slot-btn');
    const list = document.getElementById('slots-list');
    const confirmBtn = document.getElementById('confirm-schedule-btn');
    const cancelBtn = document.getElementById('cancel-schedule-btn');

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

    // Helper to parse time string "HH:MM" to object
    const parseTimeString = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
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
                <button onclick="window._removeSlot(${index})" style="background: transparent; border: none; color: #ff5e5e; font-size: 18px; cursor: pointer; padding: 4px;">×</button>
            </div>
            `;
        }).join('');

        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
        confirmBtn.style.cursor = "pointer";
    }

    // Expose remove handler globally (temporary but effective for innerHTML)
    window._removeSlot = (index) => {
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
            showNotification('Час завершення має бути пізніше часу початку', 'error');
            return;
        }

        // Check for duplicates
        if (selectedSlots.some(s => s.start === start.toISOString() && s.end === end.toISOString())) {
            showNotification('Цей слот вже додано', 'error');
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
            delete window._removeSlot;
        }, 200);
    };

    cancelBtn.onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    // Confirm Handler
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;margin:0 auto"></div>';

        try {
            await apiPost(`/hr/applications/${applicationId}/screening/start`, { slots: selectedSlots });

            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }

            // Success Visuals
            showNotification('✅ Запрошення надіслано успішно!', 'success');

            close();

            // Refresh parent view
            if (typeof loadHRApplications === 'function') setTimeout(() => loadHRApplications(), 300);

        } catch (error) {
            showNotification(error.message, 'error');
            confirmBtn.innerHTML = 'Відправити';
            confirmBtn.disabled = false;
        }
    };
};

window.openMoveToTechModal = async function (applicationId) {
    // Remove existing modal if any
    const existing = document.getElementById('tech-move-modal');
    if (existing) existing.remove();

    // Create modal structure
    const modal = document.createElement('div');
    modal.id = 'tech-move-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;
        backdrop-filter: blur(4px); animation: fadeIn 0.2s ease-out;
    `;

    // Initial View: Selection Mode
    modal.innerHTML = `
        <div class="modal-content" style="background: #1e1e1e; padding: 24px; border-radius: 16px; width: 90%; max-width: 420px; color: #ffffff; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid #333; position: relative; overflow: hidden;">
            
            <button id="close-modal-btn" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #666; font-size: 24px; cursor: pointer; padding: 0; line-height: 1;">&times;</button>

            <div id="step-1-content">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="width: 56px; height: 56px; background: rgba(51, 144, 236, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                        <span style="font-size: 28px;">🚀</span>
                    </div>
                    <h2 style="margin: 0; font-size: 22px; font-weight: 600;">Наступний етап</h2>
                    <p style="color: #bbb; margin-top: 8px; font-size: 15px; line-height: 1.5;">
                        Оберіть, як призначити технічне інтерв'ю для кандидата.
                    </p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="btn-pool" class="option-card" style="display: flex; align-items: center; gap: 16px; background: #262626; border: 1px solid #333; border-radius: 12px; padding: 16px; width: 100%; cursor: pointer; transition: all 0.2s; text-align: left;">
                        <div style="background: #333; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📥</div>
                        <div>
                            <div style="font-weight: 600; font-size: 16px; color: white; margin-bottom: 2px;">В загальний пул</div>
                            <div style="font-size: 13px; color: #aaa;">Інтерв'юери самі розберуть заявки</div>
                        </div>
                        <div style="margin-left: auto; color: #777;">&rsaquo;</div>
                    </button>

                    <button id="btn-assign" class="option-card" style="display: flex; align-items: center; gap: 16px; background: #262626; border: 1px solid #333; border-radius: 12px; padding: 16px; width: 100%; cursor: pointer; transition: all 0.2s; text-align: left;">
                        <div style="background: #333; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👤</div>
                        <div>
                            <div style="font-weight: 600; font-size: 16px; color: white; margin-bottom: 2px;">Призначити особисто</div>
                            <div style="font-size: 13px; color: #aaa;">Обрати конкретного спеціаліста</div>
                        </div>
                        <div style="margin-left: auto; color: #777;">&rsaquo;</div>
                    </button>
                </div>
            </div>

            <div id="step-2-content" style="display: none; height: 100%;">
                <div style="display: grid; grid-template-columns: 80px 1fr 80px; align-items: center; margin-bottom: 24px;">
                    <button id="back-btn" style="background: transparent; border: none; color: #3390ec; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0; font-weight: 500; justify-self: start;">
                        <span style="font-size: 24px; line-height: 0.5; padding-bottom: 4px;">&lsaquo;</span> Назад
                    </button>
                    <h3 style="margin: 0; font-size: 17px; font-weight: 600; text-align: center; white-space: nowrap;">Оберіть</h3>
                    <div></div> 
                </div>
                <!-- Subtitle for context -->
                <div style="text-align: center; color: #aaa; font-size: 13px; margin-top: -16px; margin-bottom: 16px;">
                    технічного інтерв'юера
                </div>
                
                <div id="interviewers-list" style="max-height: 300px; overflow-y: auto; padding-right: 4px;">
                    <div style="text-align:center; padding: 20px;"><div class="spinner"></div></div>
                </div>
            </div>

            <div id="step-pool-confirm" style="display: none; height: 100%; text-align: center; padding-top: 10px;">
                <div style="width: 64px; height: 64px; background: rgba(51, 144, 236, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                    <span style="font-size: 32px;">📥</span>
                </div>
                <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">Підтвердження</h3>
                <p style="color: #bbb; font-size: 15px; margin-bottom: 32px; line-height: 1.5;">
                    Відправити кандидата в загальний пул?<br>
                    <span style="font-size: 13px; color: #888;">Будь-який інтерв'юер зможе взяти (claim) цю заявку.</span>
                </p>
                
                <div style="display: flex; gap: 12px;">
                    <button id="cancel-pool-btn" style="flex: 1; background: #2a2a2a; color: #fff; border: 1px solid #333; padding: 12px; border-radius: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;">Скасувати</button>
                    <button id="confirm-pool-btn" style="flex: 1; background: #3390ec; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(51, 144, 236, 0.3);">Підтвердити</button>
                </div>
            </div>

        </div>
    `;

    // Inject Hover Styles
    if (!document.getElementById('tech-modal-styles')) {
        const s = document.createElement('style');
        s.id = 'tech-modal-styles';
        s.textContent = `
            .option-card:hover {
                background: #2f2f2f !important;
                border-color: #444 !important;
                transform: translateY(-1px);
            }
            .option-card:active {
                transform: scale(0.99);
            }
            .interviewer-item {
                display: flex; align-items: center; gap: 12px;
                padding: 12px; border-radius: 10px;
                cursor: pointer; transition: background 0.2s;
                border-bottom: 1px solid #2a2a2a;
            }
            .interviewer-item:last-child { border-bottom: none; }
            .interviewer-item:hover { background: #262626; }
            .interviewer-avatar {
                width: 36px; height: 36px; border-radius: 50%;
                background: linear-gradient(135deg, #3390ec, #0078d4);
                color: white; font-weight: 600; font-size: 14px;
                display: flex; align-items: center; justify-content: center;
            }
        `;
        document.head.appendChild(s);
    }

    document.body.appendChild(modal);

    // --- Action Handlers ---

    // Close
    const close = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 200);
    };
    document.getElementById('close-modal-btn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    // Option 1: Pool
    document.getElementById('btn-pool').onclick = () => {
        document.getElementById('step-1-content').style.display = 'none';
        document.getElementById('step-pool-confirm').style.display = 'block';
        document.getElementById('close-modal-btn').style.display = 'none'; // Hide X
    };

    // Pool Cancel
    document.getElementById('cancel-pool-btn').onclick = () => {
        document.getElementById('step-pool-confirm').style.display = 'none';
        document.getElementById('step-1-content').style.display = 'block';
        document.getElementById('close-modal-btn').style.display = 'block'; // Restore X
    };

    // Pool Confirm
    document.getElementById('confirm-pool-btn').onclick = async () => {
        const btn = document.getElementById('confirm-pool-btn');
        const cancelBtn = document.getElementById('cancel-pool-btn');
        btn.disabled = true;
        cancelBtn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;margin:0 auto"></div>';

        try {
            await apiPost(`/hr/applications/${applicationId}/tech/move`, { mode: "pool" });

            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
            showNotification("✅ Кандидата відправлено в пул!");

            close();
            viewApplication(applicationId);
        } catch (err) {
            showNotification(`⚠️ Помилка: ${err.message}`, 'error');
            close();
        }
    };

    // Option 2: Personal Assign (Show List)
    document.getElementById('btn-assign').onclick = async () => {
        document.getElementById('step-1-content').style.display = 'none';
        document.getElementById('step-2-content').style.display = 'block';
        document.getElementById('close-modal-btn').style.display = 'none'; // Hide X to avoid overlap

        const listContainer = document.getElementById('interviewers-list');

        try {
            // Fetch interviewers
            const response = await apiGet('/hr/interviewers');
            const interviewers = response.interviewers || [];

            if (interviewers.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #888;">
                        <div style="font-size: 32px; margin-bottom: 8px;">😕</div>
                        У системі немає технічних інтерв'юерів.
                    </div>
                `;
                return;
            }

            // Render List
            listContainer.innerHTML = interviewers.map(u => {
                const initials = u.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return `
                    <div class="interviewer-item" data-id="${u.id}">
                        <div class="interviewer-avatar">${initials}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: white;">${u.full_name}</div>
                            <div style="font-size: 12px; color: #999;">@${u.username || 'no_username'}</div>
                        </div>
                        <div style="color: #3390ec;">Призначити</div>
                    </div>
                `;
            }).join('');

            // Add click handlers
            listContainer.querySelectorAll('.interviewer-item').forEach(item => {
                item.onclick = async () => {
                    const userId = item.dataset.id;
                    const userName = item.querySelector('div[style*="font-weight: 500"]').innerText;

                    if (!confirm(`Призначити ${userName} на цю заявку?`)) return;

                    try {
                        listContainer.innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner"></div></div>';
                        await apiPost(`/hr/applications/${applicationId}/tech/move`, {
                            mode: "assign",
                            interviewer_id: userId
                        });

                        if (window.Telegram?.WebApp) {
                            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                        }
                        showNotification(`✅ Кандидата призначено на ${userName}`);

                        close();
                        viewApplication(applicationId);
                    } catch (err) {
                        showNotification(`⚠️ Помилка: ${err.message}`, 'error');
                        close();
                    }
                };
            });

        } catch (error) {
            listContainer.innerHTML = `<div style="color: #ff5555; text-align: center;">Помилка: ${error.message}</div>`;
        }
    };

    // Back Button
    document.getElementById('back-btn').onclick = () => {
        document.getElementById('step-2-content').style.display = 'none';
        document.getElementById('step-1-content').style.display = 'block';
        document.getElementById('close-modal-btn').style.display = 'block'; // Restore X
    };
};

// Legacy alias just in case
window.assignInterviewer = (appId) => window.openMoveToTechModal(appId);

// Global exposure
window.assignInterviewer = assignInterviewer;
window.openScheduleModal = window.openScheduleModal;
window.openFinalizeModal = function (applicationId, interviewId, timeStr) {
    const existing = document.getElementById('finalize-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'finalize-modal';
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
                <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Підтвердження</h2>
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

    // Inject styles for radio toggle animation
    const styleId = 'finalize-modal-styles';
    if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = `
            #finalize-modal input[type="radio"]:checked + .radio-tile {
                background: #3390ec;
                color: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            #finalize-modal input[type="radio"]:not(:checked) + .radio-tile {
                background: transparent;
                color: #888;
            }
            #finalize-modal input[type="radio"]:not(:checked) + .radio-tile:hover {
                background: rgba(255,255,255,0.05);
                color: #ccc;
            }
            #finalize-modal input:focus {
                border-color: #3390ec !important;
            }
            #cancel-finalize-btn:hover {
                background: rgba(255,255,255,0.05);
                color: #fff;
                border-color: #666;
            }
            #submit-finalize-btn:active {
                transform: scale(0.98);
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

        apiPost(`/hr/applications/${applicationId}/screening/finalize`, {
            interview_id: interviewId,
            location_type: type, // Enum matches backend
            details: details
        }).then(() => {
            if (window.Telegram?.WebApp) window.Telegram.WebApp.showPopup({ message: "✅ Інтерв'ю підтверджено!" });
            else alert("✅ Інтерв'ю підтверджено!");
            modal.remove();
            viewApplication(applicationId);
        }).catch(err => {
            alert("Помилка: " + err.message);
            btn.disabled = false;
            btn.innerHTML = 'Підтвердити';
        });
    };
};

window.openMoveToTechModal = window.openMoveToTechModal;
