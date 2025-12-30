import { API_URL, apiPost, apiDelete, apiGet } from '../utils/api.js';

const tg = window.Telegram?.WebApp;
const user = tg?.initDataUnsafe?.user;

export async function loadRolesManagement() {
    try {
        const data = await apiGet('/director/roles');

        let html = `
            <div class="analytics-header">
                <h1>👥 Управління ролями</h1>
                <p class="analytics-subtitle">Створення та управління запрошувальними посиланнями</p>
            </div>
        `;

        // Кнопки створення запрошень
        html += `
            <div class="analytics-section">
                <h2 class="section-title">➕ Створити запрошення</h2>
                <div class="invite-buttons">
                    <button class="invite-btn hr" onclick="createInvite('hr')">
                        <span class="invite-icon">👔</span>
                        <span class="invite-label">HR</span>
                    </button>
                    <button class="invite-btn analyst" onclick="createInvite('analyst')">
                        <span class="invite-icon">📊</span>
                        <span class="invite-label">Аналітик</span>
                    </button>
                    <button class="invite-btn director" onclick="createInvite('director')">
                        <span class="invite-icon">👑</span>
                        <span class="invite-label">Директор</span>
                    </button>
                </div>
            </div>
        `;

        // Список запрошень
        const activeInvites = data.invites.filter(inv => !inv.is_used);
        const usedInvites = data.invites.filter(inv => inv.is_used);

        if (activeInvites.length > 0) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">🟢 Активні запрошення (${activeInvites.length})</h2>
                    <div class="invites-list">
            `;

            for (const invite of activeInvites) {
                const roleEmoji = {
                    'hr': '👔',
                    'analyst': '📊',
                    'director': '👑'
                }[invite.role] || '📌';

                let expiresText = '';
                if (invite.expires_at) {
                    const expires = new Date(invite.expires_at);
                    const now = new Date();
                    if (expires > now) {
                        const hoursLeft = Math.floor((expires - now) / (1000 * 60 * 60));
                        expiresText = ` (залишилось ~${hoursLeft} год.)`;
                    } else {
                        expiresText = ' (термін минув)';
                    }
                }

                html += `
                    <div class="invite-item active">
                        <div class="invite-header">
                            <span class="invite-role">${roleEmoji} ${invite.role.toUpperCase()}</span>
                            <button class="delete-btn" onclick="deleteInvite(${invite.id})" title="Видалити">🗑️</button>
                        </div>
                        <div class="invite-url">
                            <input type="text" value="${invite.invite_url}" readonly onclick="this.select()" class="invite-input">
                            <button class="copy-btn" onclick="copyInviteUrl('${invite.invite_url}')" title="Копіювати">📋</button>
                        </div>
                        <div class="invite-meta">${expiresText}</div>
                    </div>
                `;
            }

            html += `</div></div>`;
        }

        if (usedInvites.length > 0) {
            html += `
                <div class="analytics-section">
                    <h2 class="section-title">🔴 Використані запрошення (${usedInvites.length})</h2>
                    <div class="invites-list">
            `;

            for (const invite of usedInvites.slice(0, 10)) {
                const roleEmoji = {
                    'hr': '👔',
                    'analyst': '📊',
                    'director': '👑'
                }[invite.role] || '📌';

                const usedDate = invite.used_at ? new Date(invite.used_at).toLocaleString('uk-UA') : 'Невідомо';

                html += `
                    <div class="invite-item used">
                        <div class="invite-header">
                            <span class="invite-role">${roleEmoji} ${invite.role.toUpperCase()}</span>
                        </div>
                        <div class="invite-meta">Використано: ${usedDate}</div>
                    </div>
                `;
            }

            html += `</div></div>`;
        }

        if (activeInvites.length === 0 && usedInvites.length === 0) {
            html += `
                <div class="analytics-section">
                    <p style="text-align: center; color: var(--tg-theme-hint-color, #666); padding: 20px;">
                        У вас поки немає створених запрошень.<br>
                        Створіть нове запрошення вище.
                    </p>
                </div>
            `;
        }

        html += `<div id="message"></div>`;

        document.getElementById('app').innerHTML = html;

    } catch (error) {
        document.getElementById('app').innerHTML = `
            <div class="error">
                <h2>Помилка завантаження</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Helper functions (attached to window for onclick handlers)

async function createInvite(role) {
    try {
        const result = await apiPost('/director/invite/create', { role });

        // Показуємо повідомлення
        const messageDiv = document.getElementById('message');
        messageDiv.innerHTML = `
            <div class="success">
                <strong>✅ Запрошення створено!</strong><br>
                Роль: <b>${result.invite.role.toUpperCase()}</b><br>
                Посилання дійсне 24 години.
            </div>
        `;

        // Оновлюємо список
        setTimeout(() => {
            loadRolesManagement();
        }, 1000);

        // Вібрація
        if (tg?.vibrate) {
            tg.vibrate([100, 50, 100]);
        }

    } catch (error) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.innerHTML = `
                <div class="error">
                    <strong>❌ Помилка</strong><br>
                    ${error.message}
                </div>
            `;
        } else {
            alert(error.message);
        }
    }
}

async function deleteInvite(inviteId) {
    if (!confirm('Ви впевнені, що хочете видалити це запрошення?')) {
        return;
    }

    try {
        await apiDelete(`/director/invite/${inviteId}`);

        // Оновлюємо список
        loadRolesManagement();

        // Вібрація
        if (tg?.vibrate) {
            tg.vibrate([50]);
        }

    } catch (error) {
        alert('Помилка: ' + error.message);
    }
}

function copyInviteUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        // Показуємо повідомлення
        const messageDiv = document.getElementById('message');
        messageDiv.innerHTML = `
            <div class="success">
                <strong>✅ Посилання скопійовано!</strong>
            </div>
        `;
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 2000);

        // Вібрація
        if (tg?.vibrate) {
            tg.vibrate([50]);
        }
    }).catch(err => {
        alert('Помилка копіювання: ' + err.message);
    });
}

// Export helpers to window
window.createInvite = createInvite;
window.deleteInvite = deleteInvite;
window.copyInviteUrl = copyInviteUrl;
