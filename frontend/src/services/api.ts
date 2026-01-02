export const API_BASE = import.meta.env.VITE_API_URL || '/web';

async function request(path: string, options: RequestInit = {}) {
    const tg = window.Telegram?.WebApp;
    const headers = {
        'Content-Type': 'application/json',
        'X-TG-Data': tg?.initData || '',
        'X-Telegram-User-Id': tg?.initDataUnsafe?.user?.id?.toString() || '',
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'API Error' }));
        throw new Error(error.detail || 'Something went wrong');
    }

    if (response.status === 204) return null;
    return response.json();
}

export const api = {
    get: (path: string) => request(path),
    post: (path: string, data?: any) => request(path, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    }),
    delete: (path: string) => request(path, {
        method: 'DELETE',
    }),
};
