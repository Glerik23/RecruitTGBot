/** UI утиліти */
const tg = window.Telegram?.WebApp || {};

/**
 * Показати повідомлення
 * @param {string} message - Текст повідомлення
 * @param {string} type - Тип повідомлення ('success' | 'error')
 */
export function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    const className = type === 'error' ? 'error' : 'success';
    messageDiv.innerHTML = `<div class="${className}">${message}</div>`;
    
    // Автоматично приховати через 5 секунд
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

/**
 * Показати завантаження
 * @param {string|HTMLElement} container - ID елемента або сам елемент
 */
export function showLoading(container) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (container) {
        container.innerHTML = '<div class="loading">Завантаження...</div>';
    }
}

/**
 * Вібрація (якщо підтримується)
 * @param {number[]} pattern - Патерн вібрації
 */
export function vibrate(pattern = [100]) {
    if (tg.vibrate) {
        tg.vibrate(pattern);
    }
}

/**
 * Форматувати дату
 * @param {string} dateString - ISO дата
 * @returns {string} Форматована дата
 */
export function formatDate(dateString) {
    if (!dateString) return 'Невідомо';
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Скопіювати текст в буфер обміну
 * @param {string} text - Текст для копіювання
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showMessage('✅ Скопійовано!', 'success');
        vibrate([50]);
    } catch (error) {
        showMessage('❌ Помилка копіювання', 'error');
    }
}

/**
 * Створити елемент картки
 * @param {string} content - HTML контент
 * @param {string} className - Додаткові CSS класи
 * @returns {HTMLElement}
 */
export function createCard(content, className = '') {
    const card = document.createElement('div');
    card.className = `card ${className}`;
    card.innerHTML = content;
    return card;
}

/**
 * Створити елемент кнопки
 * @param {string} text - Текст кнопки
 * @param {Function} onClick - Обробник кліку
 * @param {string} className - CSS класи
 * @param {string} type - Тип кнопки
 * @returns {HTMLElement}
 */
export function createButton(text, onClick, className = '', type = 'button') {
    const button = document.createElement('button');
    button.type = type;
    button.className = className;
    button.textContent = text;
    button.onclick = onClick;
    return button;
}

// Експортуємо глобально для зворотної сумісності
window.showMessage = showMessage;
window.showLoading = showLoading;
window.vibrate = vibrate;
window.formatDate = formatDate;
window.copyToClipboard = copyToClipboard;
window.createCard = createCard;
window.createButton = createButton;

