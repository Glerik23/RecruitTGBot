import { apiGet, apiPost } from '../utils/api.js';

export async function loadWaitingView() {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Завантаження статусу...</p></div>';

    try {
        const [appResponse, interviewResponse] = await Promise.all([
            apiGet('/candidate/applications'),
            apiGet('/candidate/interviews')
        ]);

        // Get latest application
        const applications = appResponse.applications || [];
        // Get interviews
        const interviews = interviewResponse.interviews || [];

        // Let's take the one with highest ID.
        const latest = applications.length > 0 ? applications.reduce((prev, current) => (prev.id > current.id) ? prev : current) : null;

        renderWaiting(latest, interviews);
    } catch (error) {
        console.error('Error loading application:', error);
        appContainer.innerHTML = `
            <div class="error">
                <h2>Помилка</h2>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" class="submit-button" style="margin-top: 20px;">Спробувати ще раз</button>
            </div>
        `;
    }
}

function renderWaiting(application, interviews) {
    const appContainer = document.getElementById('app');

    if (!application) {
        appContainer.innerHTML = `
            <div class="form-header">
                <h1>👋 Вітаємо!</h1>
                <p>У вас немає активних заявок.</p>
            </div>
            <div class="card" style="text-align: center; padding: 40px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2);">
                <p style="margin-bottom: 20px; color: white;">Ви ще не подали жодної заявки на вакансію.</p>
                <button id="btnNewApplication" class="submit-button" style="color: white;">🚀 Подати заявку</button>
                <button id="btnHistory" class="submit-button outbound" style="margin-top: 10px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.3); color: white;">📜 Історія заявок</button>
            </div>
        `;
        document.getElementById('btnNewApplication').onclick = () => {
            // Basic navigation fallback
            if (window.router) window.router.navigate('/candidate/application');
            else window.history.pushState({}, '', '/candidate/application');
        };
        document.getElementById('btnHistory').onclick = () => {
            if (window.router) window.router.navigate('/history');
            else window.history.pushState({}, '', '/history');
        };
        return;
    }

    const { status, position, created_at, id } = application;

    const s = status ? status.toLowerCase() : '';

    // Find relevant interview logic
    // We look for an interview associated with this application
    let interview = interviews.find(i => i.application_id === id); // Fallback to any

    if (s.includes('tech')) {
        const tech = interviews.find(i => i.application_id === id && i.interview_type === 'technical');
        if (tech) interview = tech;
    } else if (s.includes('screening')) {
        const scr = interviews.find(i => i.application_id === id && i.interview_type === 'hr_screening');
        if (scr) interview = scr;
    }

    let statusIcon = '⏱️';
    let statusText = 'Очікування';
    let statusClass = 'pending';
    let statusDesc = 'Ваша заявка розглядається HR-менеджером.';
    let showSlots = false;
    let showTimeSelectedWait = false;

    // Fallback logic for inconsistent state (Scheduled but no time)
    if ((s === 'tech_scheduled' || s === 'screening_scheduled') && interview && !interview.selected_time && interview.available_slots && interview.available_slots.length > 0) {
        // Treat as pending
        statusIcon = '⚠️';
        statusText = 'Потрібен вибір часу';
        statusClass = 'warning';
        statusDesc = 'Ми відновили доступ до слотів. Будь ласка, оберіть час.';
        showSlots = true;
    } else {

        switch (s) {
            case 'pending':
                statusIcon = '⏳';
                statusText = 'Очікування';
                statusClass = 'pending';
                statusDesc = 'Ваша заявка успішно отримана і очікує розгляду HR.';
                break;
            case 'accepted':
                statusIcon = '⚙️';
                statusText = 'На розгляді';
                statusClass = 'info';
                statusDesc = 'HR-менеджер прийняв вашу заявку в роботу.';
                break;
            case 'screening_pending':
            case 'tech_pending':
                if (interview && !interview.selected_time && interview.available_slots && interview.available_slots.length > 0) {
                    // Case: Slots available, user needs to pick
                    statusIcon = '📅';
                    statusText = 'Вибір часу';
                    statusClass = 'warning'; // Action needed
                    statusDesc = 'HR запропонував час для співбесіди. Будь ласка, оберіть зручний слот.';
                    showSlots = true;
                } else if (interview && interview.selected_time && !interview.is_confirmed) {
                    // Case: User picked, waiting for confirmation
                    statusIcon = '🕒';
                    statusText = 'Очікує підтвердження';
                    statusClass = 'info';
                    statusDesc = 'Ви обрали час. Очікуйте підтвердження та посилання на зустріч від HR.';
                    showTimeSelectedWait = true;
                } else {
                    // Fallback or just created status before slots?
                    statusIcon = '📅';
                    statusText = 'Планування';
                    statusClass = 'info';
                    statusDesc = 'Очікуйте запрошення на скрінінг.';
                }
                // Override text for Tech interview specifically if needed, but logic is similar
                if (s === 'tech_pending') {
                    if (!showSlots && !showTimeSelectedWait) statusDesc = 'Очікуйте призначення технічного інтерв\'ю.';
                }
                break;

            case 'screening_scheduled':
            case 'tech_scheduled':
                statusIcon = '🗣️';
                statusText = s === 'tech_scheduled' ? 'Тех. Інтерв\'ю' : 'Скрінінг';
                statusClass = 'primary';
                statusDesc = 'Вам призначено співбесіду. Деталі нижче.';
                break;

            case 'screening_completed':
                statusIcon = '✅';
                statusText = 'Скрінінг пройдено';
                statusClass = 'success';
                statusDesc = 'HR-співбесіда успішно завершена.';
                break;
            case 'tech_completed':
                statusIcon = '🏁';
                statusText = 'Тех. етап завершено';
                statusClass = 'success';
                statusDesc = 'Технічне інтерв\'ю пройдено. Очікуйте фінального рішення.';
                break;
            case 'hired':
                statusIcon = '🎉';
                statusText = 'Офер';
                statusClass = 'success';
                statusDesc = 'Вітаємо! Ми раді запропонувати вам офер.';
                break;
            case 'rejected':
                statusIcon = '❌';
                statusText = 'Відхилено';
                statusClass = 'rejected';
                statusDesc = 'На жаль, вашу заявку відхилено. Дякуємо за ваш час.';
                break;
            case 'declined':
                statusIcon = '🚫';
                statusText = 'Відмова';
                statusClass = 'secondary';
                statusDesc = 'Ви відмовилися від пропозиції.';
                break;
            case 'cancelled':
                statusIcon = '🗑️';
                statusText = 'Скасовано';
                statusClass = 'secondary';
                statusDesc = 'Ви скасували цю заявку.';
                break;
            default:
                statusIcon = '📄';
                statusText = status || 'Невідомо';
                statusDesc = 'Статус оновлюється...';
        }
    }

    const createdDate = new Date(created_at).toLocaleString('uk-UA');
    const isFinalState = ['hired', 'rejected', 'declined', 'cancelled'].includes(s);

    // Render Slots HTML if needed
    let slotsHtml = '';
    if (showSlots && interview) {
        slotsHtml = `
            <div style="margin-top: 20px; text-align: left;">
                <h3 style="color: white; font-size: 16px; margin-bottom: 10px;">Оберіть час:</h3>
                <div class="slots-grid" style="display: grid; gap: 10px;">
                    ${interview.available_slots.map(slot => {
            const date = new Date(slot.start);
            const day = date.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
            const time = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            return `
                        <button class="slot-btn" data-id="${interview.id}" data-time="${slot.start}" 
                            style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            ${day}, ${time}
                        </button>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    // Render Interview Details if Scheduled
    let detailsHtml = '';
    if ((s === 'screening_scheduled' || s === 'tech_scheduled') && interview && !showSlots) {
        let details = [];
        if (interview.selected_time) {
            const d = new Date(interview.selected_time);
            details.push(`📅 ${d.toLocaleString('uk-UA')}`);
        }
        if (interview.location_type === 'online' && interview.meet_link) {
            details.push(`🔗 <a href="${interview.meet_link}" target="_blank" style="color: #4da6ff;">Приєднатися до зустрічі</a>`);
        } else if (interview.location_type === 'office' && interview.address) {
            details.push(`📍 ${interview.address}`);
        }

        detailsHtml = `
            <div style="margin-top: 20px; background: rgba(0, 255, 128, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(0, 255, 128, 0.3);">
                ${details.map(d => `<div style="margin-bottom: 5px; color: white;">${d}</div>`).join('')}
            </div>
        `;
    }

    appContainer.innerHTML = `
        <div class="form-header">
            <h1 style="color: white;">Статус заявки</h1>
        </div>
        
        <div class="card" style="text-align: center; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2);">
            <div style="font-size: 64px; margin-bottom: 20px;">${statusIcon}</div>
            <h2 style="margin-bottom: 10px; color: white;">${position}</h2>
            
            <div style="display: inline-flex; justify-content: center; align-items: center; padding: 4px 8px; border-radius: 20px; background: rgba(255,255,255,0.1); margin-bottom: 20px;">
                <span class="status ${statusClass}" style="font-weight: bold; color: white; margin: 0; padding: 4px 12px;">${statusText}</span>
            </div>
            
            <p style="margin-bottom: 30px; color: white;">${statusDesc}</p>

            ${slotsHtml}
            ${detailsHtml}
            
            <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7); margin-top: 30px; margin-bottom: 20px;">
                ID: #${id} • ${createdDate}
            </div>

            ${!isFinalState ? `
                <button id="btnCancel" class="submit-button" style="background-color: #ff4d4d; color: white;">🛑 Скасувати заявку</button>
            ` : ''}

            ${['cancelled', 'rejected', 'declined'].includes(s) ? `
                <button id="btnNew" class="submit-button" style="color: white;">📝 Подати нову заявку</button>
            ` : ''}
            
            <button id="btnHistory" class="submit-button outbound" style="margin-top: 15px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.3); color: white;">📋 Історія заявок</button>
        </div>
    `;

    // Attach Slot Events
    if (showSlots) {
        document.querySelectorAll('.slot-btn').forEach(btn => {
            btn.onclick = async () => {
                const interviewId = btn.dataset.id;
                const slotTime = btn.dataset.time;

                // Custom Confirmation Modal
                showConfirmationModal(
                    'Підтвердження часу',
                    `Ви обрали дату <b>${btn.innerText}</b>.<br>Підтвердити запис?`,
                    async () => {
                        try {
                            // Disable all buttons
                            document.querySelectorAll('.slot-btn').forEach(b => b.disabled = true);

                            await apiPost('/candidate/interviews/select-slot', {
                                interview_id: parseInt(interviewId),
                                selected_date: slotTime
                            });

                            // Reload to show "Waiting for confirmation"
                            loadWaitingView();

                        } catch (err) {
                            alert('Помилка вибору часу: ' + err.message);
                            document.querySelectorAll('.slot-btn').forEach(b => b.disabled = false);
                        }
                    }
                );
            };
        });
    }

    // Attach Events
    const btnCancel = document.getElementById('btnCancel');
    if (btnCancel) {
        btnCancel.onclick = async () => {
            showConfirmationModal(
                'Скасування заявки',
                'Ви впевнені, що хочете скасувати цю заявку? Цю дію неможливо скасувати.',
                async () => {
                    btnCancel.disabled = true;
                    btnCancel.textContent = 'Скасування...';
                    try {
                        await apiPost(`/candidate/application/${id}/cancel`);
                        loadWaitingView(); // Reload
                    } catch (error) {
                        alert('Помилка: ' + error.message);
                        btnCancel.disabled = false;
                        btnCancel.textContent = '🛑 Скасувати заявку';
                    }
                }
            );
        };
    }

    const btnNew = document.getElementById('btnNew');
    if (btnNew) {
        btnNew.onclick = () => {
            if (window.router) window.router.navigate('/candidate/application');
        };
    }

    const btnHistory = document.getElementById('btnHistory');
    if (btnHistory) {
        btnHistory.onclick = () => {
            if (window.router) window.router.navigate('/history');
        };
    }
}

function showConfirmationModal(title, message, onConfirm) {
    // Ensure styles exist
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.innerHTML = `
            .modal-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                animation: modalFadeIn 0.2s ease-out forwards;
            }
            .modal-content {
                background: #1c1c1e;
                color: #ffffff;
                padding: 24px;
                border-radius: 16px;
                width: 90%;
                max-width: 320px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.08);
                transform: scale(0.95);
                animation: modalScaleIn 0.2s ease-out forwards;
            }
            .modal-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
            .modal-body { font-size: 14px; margin-bottom: 24px; line-height: 1.5; color: #aaaaaa; }
            .modal-actions { display: flex; gap: 10px; justify-content: center; }
            .modal-btn { padding: 12px 0; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; font-size: 14px; flex: 1; transition: opacity 0.2s; }
            .modal-btn:active { opacity: 0.8; }
            .modal-btn.cancel { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
            .modal-btn.confirm { background: #3390ec; color: #ffffff; }
            @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalScaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    // Remove existing modal if any
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-title">${title}</div>
            <div class="modal-body">${message}</div>
            <div class="modal-actions">
                <button class="modal-btn cancel" id="modalCancel">Скасувати</button>
                <button class="modal-btn confirm" id="modalConfirm">Підтвердити</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('modalCancel').onclick = () => {
        overlay.classList.add('fading-out'); // Optional: add fade out logic if needed
        setTimeout(() => overlay.remove(), 50);
    };

    document.getElementById('modalConfirm').onclick = () => {
        overlay.remove();
        onConfirm();
    };

    // Close on click outside
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}
