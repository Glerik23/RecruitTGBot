/** Компонент деталей заявки */
export function createApplicationDetail(application, onAccept, onReject) {
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
    const detail = document.createElement('div');
    detail.className = 'application-detail';

    // Status Translations
    const getStatusInfo = (status) => {
        const s = status ? status.toLowerCase() : '';
        switch (s) {
            case 'pending': return { emoji: '⏳', text: 'Очікує розгляду' };
            case 'accepted': return { emoji: '⚙️', text: 'Прийнято (На розгляді)' };
            case 'screening_pending': return { emoji: '📅', text: 'Очікує планування скрінінгу' };
            case 'screening_scheduled': return { emoji: '🗣️', text: 'Скрінінг заплановано' };
            case 'screening_completed': return { emoji: '✅', text: 'Скрінінг пройдено' };
            case 'tech_pending': return { emoji: '💻', text: 'Очікує технічного інтерв\'ю' };
            case 'tech_scheduled': return { emoji: '👨‍💻', text: 'Тех. інтерв\'ю заплановано' };
            case 'tech_completed': return { emoji: '🏁', text: 'Тех. інтерв\'ю пройдено' };
            case 'hired': return { emoji: '🎉', text: 'Найнято (Офер)' };
            case 'rejected': return { emoji: '❌', text: 'Відхилено' };
            case 'declined': return { emoji: '🚫', text: 'Відмова кандидата' };
            case 'cancelled': return { emoji: '🗑️', text: 'Скасовано' };
            default: return { emoji: '📄', text: status || 'Невідомо' };
        }
    };
    const normalizedStatus = application.status ? application.status.toLowerCase() : '';
    const { emoji: statusEmoji, text: statusText } = getStatusInfo(normalizedStatus);

    // --- Parsing Logic for Additional Info ---
    let info = application.additional_info || '';
    let englishLevel = null;
    let techSkills = [];
    let customInfo = info;

    // 1. Extract English Level
    const enMatch = info.match(/English Level:\s*([A-C][1-2](?:\s*\(.*?\))?|.*?)(?:\n|$)/);
    if (enMatch) {
        englishLevel = enMatch[1].trim();
        customInfo = customInfo.replace(enMatch[0], '');
    }

    // 2. Extract Technical Skills (Detailed)
    const skillsHeader = "Technical Skills Details:";
    const skillsIndex = customInfo.indexOf(skillsHeader);

    if (skillsIndex !== -1) {
        const skillsText = customInfo.substring(skillsIndex + skillsHeader.length);
        customInfo = customInfo.substring(0, skillsIndex);

        techSkills = skillsText.split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('-'))
            .map(line => {
                const firstColon = line.indexOf(':');
                if (firstColon !== -1) {
                    const name = line.substring(1, firstColon).trim();
                    const exp = line.substring(firstColon + 1).trim();
                    return { name, exp };
                }
                return { name: line.substring(1).trim(), exp: '' };
            });
    }

    customInfo = customInfo.trim();

    detail.innerHTML = `
        <div class="detail-header">
            <h2>Деталі заявки</h2>
        </div>
        
        <div class="detail-content">
            <div class="detail-section">
                <div class="section-title">Статус</div>
                <div class="status-badge status-${normalizedStatus}">
                    ${statusEmoji} ${statusText}
                </div>
            </div>
            
            <div class="detail-section">
                <div class="section-title">Особисті дані</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">👤 ПІБ:</span>
                        <span class="detail-value">${application.candidate_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">📧 Email:</span>
                        <span class="detail-value">
                            <a href="mailto:${application.email}">${application.email}</a>
                        </span>
                    </div>
                    ${application.phone ? `
                    <div class="detail-item">
                        <span class="detail-label">📱 Телефон:</span>
                        <span class="detail-value">
                            <a href="tel:${application.phone}">${application.phone}</a>
                        </span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-section">
                <div class="section-title">Позиція</div>
                <div class="detail-value">${application.position}</div>
            </div>

            ${application.experience_years ? `
            <div class="detail-section">
                <div class="section-title">Досвід роботи</div>
                <div class="detail-value">${application.experience_years} років</div>
            </div>
            ` : ''}

            ${(() => {
            if (techSkills.length > 0) {
                return `
                    <div class="detail-section">
                        <div class="section-title">🛠️ Технічні навички</div>
                        <div class="tech-skills-grid">
                            ${techSkills.map(skill => `
                                <div class="tech-skill-item">
                                    <div class="skill-name">${skill.name}</div>
                                    ${skill.exp ? `<div class="skill-exp">${skill.exp}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
            } else if (application.skills && application.skills.length > 0) {
                return `
                    <div class="detail-section">
                        <div class="section-title">🛠️ Технічні навички</div>
                        <div class="skills-list">
                            ${application.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    </div>`;
            }
            return '';
        })()}
            
            ${application.previous_work ? `
            <div class="detail-section">
                <div class="section-title">Попередні місця роботи</div>
                <div class="detail-value">${application.previous_work}</div>
            </div>
            ` : ''}
            
            ${application.education ? `
            <div class="detail-section">
                <div class="section-title">Освіта</div>
                <div class="detail-value">${application.education}</div>
            </div>
            ` : ''}
            
            ${englishLevel ? `
            <div class="detail-section">
                <div class="section-title">🌍 Рівень англійської</div>
                <div class="info-card" style="display: flex; justify-content: center; padding: 20px;">
                    <span class="en-level-badge">${englishLevel}</span>
                </div>
            </div>` : ''}
            
            ${application.portfolio_url ? `
            <div class="detail-section">
                <div class="section-title">Портфоліо</div>
                <div class="detail-value">
                    <a href="${application.portfolio_url}" target="_blank" rel="noopener">
                        ${application.portfolio_url}
                    </a>
                </div>
            </div>
            ` : ''}
            
            ${customInfo ? `
            <div class="detail-section">
                <div class="section-title">📝 Додатково</div>
                <div class="detail-value">${customInfo.replace(/\n/g, '<br>')}</div>
            </div>` : ''}
            
            ${application.rejection_reason ? `
            <div class="detail-section">
                <div class="section-title">Причина відхилення</div>
                <div class="detail-value rejection-reason">${application.rejection_reason}</div>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <div class="section-title">Дата створення</div>
                <div class="detail-value">${formatDateFunc(application.created_at)}</div>
            </div>

            ${application.feedbacks && application.feedbacks.length > 0 ? `
            <div class="detail-section" style="border-top: 2px solid #3390ec; margin-top: 20px; padding-top: 20px;">
                <div class="section-title">🔧 Технічний Фідбек</div>
                ${application.feedbacks.map(f => `
                    <div class="feedback-item" style="background: rgba(51, 144, 236, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <div style="font-weight: bold; margin-bottom: 5px;">Інтерв'юер: ${f.interviewer_name}</div>
                        <div style="margin-bottom: 5px;">Оцінка: <strong>${f.score}/10</strong></div>
                        ${f.pros ? `<div>✅ <strong>Плюси:</strong> ${f.pros}</div>` : ''}
                        ${f.cons ? `<div>❌ <strong>Мінуси:</strong> ${f.cons}</div>` : ''}
                        <div style="margin-top: 10px; font-style: italic;">"${f.summary}"</div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        ${normalizedStatus === 'accepted' ? `
        <div class="detail-actions">
            <button class="btn btn-primary btn-large" onclick="openScheduleModal(${application.id})">
                📅 Запланувати Скрінінг
            </button>
        </div>
        ` : ''}

        ${normalizedStatus === 'screening_pending' ? (() => {
            const interview = application.interviews?.find(i => i.type === 'hr_screening');
            if (interview && interview.selected_time && !interview.confirmed) {
                return `
                <div class="detail-actions" style="flex-direction: column; gap: 10px;">
                    <div class="alert-info" style="background: rgba(51, 144, 236, 0.1); padding: 10px; border-radius: 8px; border: 1px solid #3390ec;">
                        <strong>📅 Кандидат обрав час:</strong><br>
                        ${formatDateFunc(interview.selected_time)}
                    </div>
                    <button class="btn btn-primary btn-large" onclick="openFinalizeModal(${application.id}, ${interview.id}, '${interview.selected_time}')">
                        ✅ Підтвердити та Надіслати лінк
                    </button>
                </div>
                `;
            } else {
                return `
                <div class="detail-actions">
                    <button class="btn btn-secondary btn-large" disabled>
                        ⏳ Очікуємо вибору кандидата
                    </button>
                    ${interview && interview.slots ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">Запропоновано ${interview.slots.length} слот(ів)</div>` : ''}
                </div>
                `;
            }
        })() : ''}

        ${normalizedStatus === 'screening_scheduled' || normalizedStatus === 'screening_completed' ? `
        <div class="detail-actions">
            <button class="btn btn-warning btn-large" onclick="openMoveToTechModal(${application.id})">
                ➡️ Передати на Тех. Інтерв'ю
            </button>
        </div>
        ` : ''}

        ${normalizedStatus === 'tech_pending' ? `
        <div class="tech-pending-alert" style="
            margin: 24px 0;
            background: linear-gradient(135deg, rgba(51, 144, 236, 0.15) 0%, rgba(51, 144, 236, 0.05) 100%);
            border: 1px solid rgba(51, 144, 236, 0.3);
            border-radius: 16px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            backdrop-filter: blur(10px);
        ">
             <div style="
                background: linear-gradient(135deg, #3390ec 0%, #0077c2 100%);
                color: white;
                border-radius: 12px;
                min-width: 42px;
                height: 42px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 4px 10px rgba(51, 144, 236, 0.3);
             ">ℹ️</div>
             <div>
                 <div style="font-weight: 600; color: #fff; font-size: 16px; margin-bottom: 4px;">Заявка на етапі Tech</div>
                 <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); line-height: 1.4;">
                    Заявка успішно передана технічним фахівцям. Зараз вона знаходиться в пулі або в роботі.
                 </div>
             </div>
        </div>
        ` : ''}

        ${normalizedStatus === 'pending' ? `
        <div class="detail-actions">
            <button class="btn btn-success btn-large" onclick="openAcceptanceModal(${application.id})">
                ✅ Прийняти заявку
            </button>
            <button class="btn btn-danger btn-large" onclick="openRejectionModal(${application.id})">
                ❌ Відхилити заявку
            </button>
        </div>
        ` : ''}
    `;

    return detail;
}

// Експортуємо глобально
window.createApplicationDetail = createApplicationDetail;

