/**
 * Утиліти для роботи зі статусами заявок
 */

/**
 * Мапа статусів на людино-читабельні назви
 */
const STATUS_MAP = {
    'pending': 'Очікує розгляду',
    'accepted': 'Прийнято (На розгляді)',
    'screening_pending': 'Очікує планування скрінінгу',
    'screening_scheduled': 'Скрінінг заплановано',
    'screening_completed': 'Скрінінг пройдено',
    'tech_pending': "Очікує технічного інтерв'ю",
    'tech_scheduled': "Технічне інтерв'ю заплановано",
    'tech_completed': "Технічне інтерв'ю пройдено",
    'hired': 'Найнято (Офер прийнято)',
    'rejected': 'Відхилено',
    'declined': 'Відмова кандидата',
    'cancelled': 'Скасовано',
    'reviewed': 'Переглянуто',
    'interview_scheduled': 'Співбесіда заплановано'
};

/**
 * Мапа статусів на іконки
 */
const STATUS_ICONS = {
    'pending': '⏳',
    'accepted': '✅',
    'screening_pending': '📅',
    'screening_scheduled': '🗣️',
    'screening_completed': '✅',
    'tech_pending': '💻',
    'tech_scheduled': '🗣️',
    'tech_completed': '🏁',
    'hired': '🎉',
    'rejected': '❌',
    'declined': '🚫',
    'cancelled': '🗑️',
    'reviewed': '👀',
    'interview_scheduled': '📅'
};

/**
 * Форматування статусу в людино-читабельний вигляд
 * @param {string} status - Статус з бекенду
 * @returns {string} Людино-читабельний статус
 */
export function formatStatus(status) {
    const normalized = status ? status.toLowerCase() : '';
    return STATUS_MAP[normalized] || status;
}

/**
 * Отримати іконку для статусу
 * @param {string} status - Статус з бекенду
 * @returns {string} Емодзі для статусу
 */
export function getStatusIcon(status) {
    const normalized = status ? status.toLowerCase() : '';
    return STATUS_ICONS[normalized] || '📄';
}

/**
 * Перевірити чи статус є активним (можна діяти)
 * @param {string} status - Статус з бекенду
 * @returns {boolean}
 */
export function isActiveStatus(status) {
    const activeStatuses = [
        'pending', 'accepted',
        'screening_pending', 'screening_scheduled', 'screening_completed',
        'tech_pending', 'tech_scheduled', 'tech_completed'
    ];
    return activeStatuses.includes(status ? status.toLowerCase() : '');
}

/**
 * Перевірити чи статус є фінальним
 * @param {string} status - Статус з бекенду
 * @returns {boolean}
 */
export function isFinalStatus(status) {
    const finalStatuses = ['hired', 'rejected', 'declined', 'cancelled'];
    return finalStatuses.includes(status ? status.toLowerCase() : '');
}

// Експортуємо глобально для зворотньої сумісності
window.formatStatus = formatStatus;
window.getStatusIcon = getStatusIcon;
window.isActiveStatus = isActiveStatus;
window.isFinalStatus = isFinalStatus;

