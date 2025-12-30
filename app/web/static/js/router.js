import { loadApplicationForm } from './views/candidate.js';
import { loadHRApplications } from './views/hr.js';
import { loadAnalytics } from './views/analyst.js';
import { loadRolesManagement } from './views/director.js';
import { loadWaitingView } from './views/waiting.js';
import { loadHistoryView } from './views/history.js';
import { loadInterviewerDashboard, loadInterviewerApplicationDetail } from './views/interviewer.js';

const routes = {
    '/candidate/application': loadApplicationForm,
    '/waiting': loadWaitingView,
    '/history': loadHistoryView,
    '/hr/applications': loadHRApplications,
    '/analyst/dashboard': loadAnalytics,
    '/director/roles': loadRolesManagement,
    '/interviewer': loadInterviewerDashboard,
    '/interviewer/dashboard': loadInterviewerDashboard, // explicit dashboard route
    '/interviewer/applications': loadInterviewerDashboard, // alias
    '/interviewer/application/:id': loadInterviewerApplicationDetail // dynamic route support?
};

export async function navigate(path) {
    window.history.pushState({}, '', path);
    await handleRoute(path);
}

// Expose routing globally to avoid circular dependency issues with dynamic imports
window.router = { navigate };

async function handleRoute(path) {
    let handler = routes[path];
    let args = [];

    // Simple dynamic route matching for /interviewer/application/:id
    if (!handler) {
        if (path.startsWith('/interviewer/application/')) {
            handler = routes['/interviewer/application/:id'];
            const idPart = path.split('/').pop();
            args = [idPart];
        } else if (path.startsWith('/hr/applications/')) {
            // Maybe support deep linking for HR later
        }
    }

    if (handler) {
        try {
            await handler(...args);
        } catch (error) {
            console.error('Route error:', error);
            document.getElementById('app').innerHTML = `
                <div class="error">
                    <h2>Помилка</h2>
                    <p>${error.message}</p>
                </div>
            `;
        }
    } else {
        document.getElementById('app').innerHTML = `
            <div class="error">
                <h1>Сторінка не знайдена</h1>
                <p>Маршрут ${path} не налаштовано</p>
                <button onclick="window.history.back()">Назад</button>
            </div>
        `;
    }
}

export async function initRouter() {
    // Handle browser back/forward buttons
    window.onpopstate = () => {
        handleRoute(window.location.pathname);
    };

    const path = window.location.pathname;
    await handleRoute(path);
}
