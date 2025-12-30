/** API утиліти */
const tg = window.Telegram?.WebApp;
export const API_URL = window.location.origin + '/web';

/**
 * Отримати заголовки для API запитів
 * @param {string|null} contentType - Content-Type заголовок
 * @returns {Object} Об'єкт заголовків
 */
function getHeaders(contentType = 'application/json') {
    const user = tg?.initDataUnsafe?.user;
    const headers = {
        'X-Telegram-User-Id': user?.id || '1'
    };

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    return headers;
}

/**
 * Виконати API запит
 * @param {string} url - URL ендпоінту (без базового URL)
 * @param {Object} options - Опції fetch
 * @returns {Promise<Object>} Відповідь API
 */
export async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(`${API_URL}${url}`, {
            ...options,
            headers: {
                ...getHeaders(options.contentType),
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Помилка сервера' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * GET запит
 * @param {string} url - URL ендпоінту
 */
export async function apiGet(url) {
    return apiRequest(url, { method: 'GET' });
}

/**
 * POST запит
 * @param {string} url - URL ендпоінту
 * @param {Object} data - Дані для відправки
 */
export async function apiPost(url, data) {
    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data),
        contentType: 'application/json'
    });
}

/**
 * PUT запит
 * @param {string} url - URL ендпоінту
 * @param {Object} data - Дані для відправки
 */
export async function apiPut(url, data) {
    return apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data),
        contentType: 'application/json'
    });
}

/**
 * PATCH запит
 * @param {string} url - URL ендпоінту
 * @param {Object} data - Дані для відправки
 */
export async function apiPatch(url, data) {
    return apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
        contentType: 'application/json'
    });
}

/**
 * DELETE запит
 * @param {string} url - URL ендпоінту
 */
export async function apiDelete(url) {
    return apiRequest(url, { method: 'DELETE' });
}

