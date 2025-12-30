import { apiGet } from '../utils/api.js';

let _applications = [];
let _currentFilter = 'all';

export async function loadHistoryView() {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Завантаження історії...</p></div>';

    try {
        const response = await apiGet('/candidate/applications');
        _applications = response.applications || [];
        // Sort by date desc
        _applications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        renderHistory();
    } catch (error) {
        console.error('Error loading history:', error);
        appContainer.innerHTML = `
            <div class="error">
                <h2>Помилка</h2>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" class="submit-button" style="margin-top: 20px;">Спробувати ще раз</button>
            </div>
        `;
    }
}

function renderHistory() {
    const appContainer = document.getElementById('app');
    const filteredApps = _applications.filter(app => {
        if (_currentFilter === 'all') return true;
        return app.status === _currentFilter;
    });

    const filters = [
        { label: 'Всі', value: 'all' },
        { label: 'Активні', value: 'pending' },
        { label: 'Прийняті', value: 'accepted' },
        { label: 'Відхилені', value: 'rejected' },
        { label: 'Скасовані', value: 'cancelled' }
    ];

    const filterButtonsHtml = filters.map(f => `
        <button class="filter-chip ${f.value === _currentFilter ? 'active' : ''}" data-value="${f.value}">
            ${f.label}
        </button>
    `).join('');

    const statusMap = {
        'pending': { text: 'Очікування', class: 'pending', icon: '⏳' },
        'reviewed': { text: 'Переглянуто', class: 'info', icon: '👀' },
        'interview_scheduled': { text: 'Інтерв\'ю', class: 'info', icon: '📅' },
        'accepted': { text: 'Прийнято', class: 'success', icon: '✅' },
        'rejected': { text: 'Відхилено', class: 'rejected', icon: '❌' },
        'cancelled': { text: 'Скасовано', class: 'secondary', icon: '🚫' },
        'hired': { text: 'Найнято', class: 'success', icon: '🎉' },
        'declined': { text: 'Відмовлено', class: 'secondary', icon: '🚫' }
    };

    const listHtml = filteredApps.length > 0 ? filteredApps.map(app => {
        const status = statusMap[app.status] || { text: app.status, class: 'secondary', icon: '❓' };

        return `
            <div class="card" style="margin-bottom: 15px; cursor: pointer; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h3 style="margin: 0; color: white;">${app.position}</h3>
                    <span class="status ${status.class}" style="font-size: 12px; font-weight: bold;">${status.text}</span>
                </div>
                ${app.rejection_reason ? `<div style="margin-top: 12px; margin-bottom: 5px; color: #ff6b6b; font-size: 14px; font-weight: bold;">Причина: ${app.rejection_reason}</div>` : ''}
                <div style="margin-top: 8px; font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.9);">
                    ${status.icon} ${new Date(app.created_at).toLocaleString('uk-UA')}
                </div>
            </div>
        `;
    }).join('') : `<div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">Нічого не знайдено</div>`;

    appContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; margin-bottom: 20px; padding-top: 20px;">
            <button id="btnBack" style="background: none; border: none; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: start; color: white; padding: 0;">⬅️</button>
            <h1 style="margin: 0; font-size: 24px; color: white; text-align: center;">Історія заявок</h1>
            <div></div>
        </div>

        <div class="filters-scroll" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 15px; margin-bottom: 10px; scrollbar-width: none;">
            ${filterButtonsHtml}
        </div>

        <div class="history-list">
            ${listHtml}
        </div>
    `;

    // Add Styles for filters if not present (inline for now)
    if (!document.getElementById('history-styles')) {
        const style = document.createElement('style');
        style.id = 'history-styles';
        style.textContent = `
            .filter-chip {
                padding: 8px 16px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                white-space: nowrap;
                cursor: pointer;
                transition: all 0.2s;
            }
            .filter-chip:hover {
                background: rgba(255, 255, 255, 0.15);
            }
            .filter-chip.active {
                background: var(--primary-color, #0088cc);
                color: white;
                border-color: var(--primary-color, #0088cc);
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    // Attach Events
    document.getElementById('btnBack').onclick = () => {
        if (window.router) window.router.navigate('/waiting');
    };

    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.onclick = (e) => {
            _currentFilter = e.target.getAttribute('data-value');
            renderHistory();
        };
    });
}
