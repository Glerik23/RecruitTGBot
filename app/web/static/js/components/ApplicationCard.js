/** Компонент картки заявки */
export function createApplicationCard(application, onView, onAccept, onReject) {
    // Використовуємо formatDate з утиліт або локальну версію
    const formatDateFunc = typeof formatDate === 'function' ? formatDate : function (dateString) {
        if (!dateString) return 'Невідомо';
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    // Status Translations (shared logic pattern)
    const getStatusInfo = (status) => {
        const s = status ? status.toLowerCase() : '';
        switch (s) {
            case 'pending': return { emoji: '⏳', text: 'Очікує розгляду' };
            case 'accepted': return { emoji: '⚙️', text: 'Прийнято (На розгляді)' };
            case 'screening_pending': return { emoji: '📅', text: 'Очікує планування скрінінгу' };
            case 'screening_scheduled': return { emoji: '🗓️', text: 'Скрінінг заплановано' };
            case 'screening_completed': return { emoji: '✅', text: 'Скрінінг пройдено' };
            case 'tech_pending': return { emoji: '⏳', text: 'Очікує технічного інтерв\'ю' };
            case 'tech_scheduled': return { emoji: '👨‍💻', text: 'Тех. інтерв\'ю заплановано' };
            case 'tech_completed': return { emoji: '🏁', text: 'Тех. інтерв\'ю пройдено' };
            case 'hired': return { emoji: '🎉', text: 'Найнято (Офер)' };
            case 'rejected': return { emoji: '❌', text: 'Відхилено' };
            case 'declined': return { emoji: '🚫', text: 'Відмова кандидата' };
            case 'cancelled': return { emoji: '🗑️', text: 'Скасовано' };
            default: return { emoji: '📄', text: status || 'Невідомо' };
        }
    };

    const { emoji: statusEmoji, text: statusText } = getStatusInfo(application.status);

    const card = document.createElement('div');
    card.className = 'application-card';
    card.innerHTML = `
        <div class="application-header">
            <div class="application-title">
                <span class="status-badge status-${application.status.toLowerCase()}">${statusEmoji} ${statusText}</span>
                <h3>${application.position}</h3>
            </div>
            <div class="application-meta">
                <span class="application-date">${formatDateFunc(application.created_at)}</span>
            </div>
        </div>
        ${application.status === 'screening_pending' ? `
            <div style="padding: 0 16px 8px 16px; margin-top: -8px;">
                ${application.screening_info?.has_selected_time
                ? `<div style="color: #4caf50; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 4px;">
                         🕒 Час обрано (Потрібне підтвердження)
                       </div>`
                : `<div style="color: #ff9800; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 4px;">
                         ⏳ Очікуємо вибору кандидата
                       </div>`
            }
            </div>
        ` : ''}
        <div class="application-body">
            <div class="application-info">
                <div class="info-item">
                    <span class="info-label">👤 Кандидат:</span>
                    <span class="info-value">${application.candidate_name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📧 Email:</span>
                    <span class="info-value">${application.email}</span>
                </div>
                ${application.phone ? `
                <div class="info-item">
                    <span class="info-label">📱 Телефон:</span>
                    <span class="info-value">${application.phone}</span>
                </div>
                ` : ''}
                ${application.experience_years ? `
                <div class="info-item">
                    <span class="info-label">💼 Досвід:</span>
                    <span class="info-value">${application.experience_years} років</span>
                </div>
                ` : ''}
                ${application.skills && application.skills.length > 0 ? `
                <div class="info-item">
                    <span class="info-label">🔧 Навички:</span>
                    <span class="info-value">${application.skills.join(', ')}</span>
                </div>
                ` : ''}
            </div>
        </div>
        <div class="application-actions">
            ${onView ? `<button class="btn btn-secondary" onclick="viewApplication(${application.id})">📋 Деталі</button>` : ''}
            ${onAccept && application.status === 'pending' ? `
                <button class="btn btn-success" onclick="acceptApplication(${application.id})">✅ Прийняти</button>
            ` : ''}
            ${onReject && application.status === 'pending' ? `
                <button class="btn btn-danger" onclick="rejectApplication(${application.id})">❌ Відхилити</button>
            ` : ''}
        </div>
    `;

    return card;
}

// Експортуємо глобально для сумісності
window.createApplicationCard = createApplicationCard;

