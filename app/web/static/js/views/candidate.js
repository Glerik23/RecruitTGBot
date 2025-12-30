import { API_URL, apiPost, apiGet } from '../utils/api.js';

const tg = window.Telegram?.WebApp;
const user = tg?.initDataUnsafe?.user;

const POPULAR_TECHS = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js',
    'Java', 'C#', '.NET', 'Go', 'Rust', 'C++', 'PHP', 'Laravel', 'Symfony',
    'Ruby', 'Ruby on Rails', 'Swift', 'Kotlin', 'Flutter', 'Dart',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure',
    'Git', 'CI/CD', 'Linux', 'Terraform', 'Ansible', 'Jenkins',
    'HTML', 'CSS', 'SASS/SCSS', 'TailwindCSS', 'Bootstrap',
    'GraphQL', 'REST API', 'gRPC', 'WebSockets',
    'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
    'Figma', 'Adobe XD', 'Sketch'
].sort();

export async function loadApplicationForm() {
    // Check for existing pending applications
    try {
        const response = await apiGet('/candidate/applications');
        const applications = response.applications || [];

        if (applications.length > 0) {
            // Sort to ensure we get the latest
            applications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const latestApp = applications[0];

            // Check if the LATEST application is still active
            const activeStatuses = [
                'pending', 'accepted', 'reviewed',
                'screening_pending', 'screening_scheduled', 'screening_completed',
                'tech_pending', 'tech_scheduled', 'tech_completed'
            ];

            if (activeStatuses.includes(latestApp.status ? latestApp.status.toLowerCase() : '')) {
                if (window.router) window.router.navigate('/waiting');
                return;
            }
        }
    } catch (e) {
        console.error('Check status error', e);
    }

    const html = `
        <div class="form-header">
            <h1>📝 Подача заявки</h1>
            <p>Заповніть форму нижче, щоб подати заявку на роботу</p>
        </div>
        
        <form id="applicationForm">
            <!-- Особиста інформація -->
            <div class="form-section">
                <div class="form-section-title">Особиста інформація</div>
                
                <div class="name-grid">
                    <div class="form-group">
                        <label>
                            <span class="icon">👤</span>
                            Ім'я
                            <span class="required">*</span>
                        </label>
                        <div class="input-wrapper">
                            <input type="text" name="first_name" required placeholder="Іван" value="${user?.first_name || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>
                            <span class="icon">👤</span>
                            Прізвище
                            <span class="required">*</span>
                        </label>
                        <div class="input-wrapper">
                            <input type="text" name="last_name" required placeholder="Іванов" value="${user?.last_name || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>
                            <span class="icon">👤</span>
                            По батькові
                            <span class="required">*</span>
                        </label>
                        <div class="input-wrapper">
                            <input type="text" name="middle_name" required placeholder="Іванович">
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">📧</span>
                        Email
                        <span class="required">*</span>
                    </label>
                    <div class="input-wrapper">
                        <input type="email" name="email" required placeholder="example@email.com">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">📱</span>
                        Телефон
                        <span class="required">*</span>
                    </label>
                    <div class="input-wrapper">
                        <input type="tel" name="phone" required placeholder="+380 XX XXX XX XX">
                    </div>
                </div>
            </div>
            
            <!-- Професійна інформація -->
            <div class="form-section">
                <div class="form-section-title">Професійна інформація</div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">💼</span>
                        Позиція, на яку подаєтеся
                        <span class="required">*</span>
                    </label>
                    <div class="input-wrapper">
                        <input type="text" name="position" required placeholder="Наприклад: Python Developer">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">⏱️</span>
                        Досвід роботи (років)
                    </label>
                    <div class="input-wrapper">
                        <input type="number" name="experience_years" min="0" max="50" placeholder="0">
                    </div>
                </div>

                <div class="form-group">
                    <label>
                        <span class="icon">🌐</span>
                        Рівень англійської
                    </label>
                    <div class="custom-select-wrapper" id="englishCustomSelect">
                        <div class="custom-select-trigger">
                            <input type="text" class="custom-select-input" placeholder="Не вказано" readonly style="cursor: pointer;">
                            <div class="arrow"></div>
                        </div>
                        <div class="custom-options">
                            <div class="custom-option selected" data-value="">Не вказано</div>
                            <div class="custom-option" data-value="A1">A1 (Beginner)</div>
                            <div class="custom-option" data-value="A2">A2 (Elementary)</div>
                            <div class="custom-option" data-value="B1">B1 (Intermediate)</div>
                            <div class="custom-option" data-value="B2">B2 (Upper-Intermediate)</div>
                            <div class="custom-option" data-value="C1">C1 (Advanced)</div>
                            <div class="custom-option" data-value="C2">C2 (Proficiency)</div>
                        </div>
                    </div>
                    <input type="hidden" name="english_level" id="englishLevelInput">
                </div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">🛠️</span>
                        Навички та технології
                    </label>
                    
                    <div class="skill-builder-container">
                        <div class="skill-inputs-row">
                            <div class="skill-name-input">
                                <div class="custom-select-wrapper" id="skillCustomSelect">
                                    <div class="custom-select-trigger">
                                        <input type="text" class="custom-select-input" placeholder="Виберіть технологію">
                                        <div class="arrow"></div>
                                    </div>
                                    <div class="custom-options">
                                        ${POPULAR_TECHS.map(tech => `<div class="custom-option" data-value="${tech}">${tech}</div>`).join('')}
                                    </div>
                                </div>
                                <input type="hidden" id="skillNameValue">
                            </div>
                            <div class="skill-exp-input">
                                <input type="number" id="skillExpInput" placeholder="Років" min="0" max="20" step="0.5">
                            </div>
                            <button type="button" id="addSkillBtn" class="add-skill-btn" title="Додати навичку">+</button>
                        </div>
                        <div id="addedSkillsList" class="added-skills-list"></div>
                        <div class="skills-input-hint">Оберіть технологію зі списку або введіть свою</div>
                    </div>
                    
                    <!-- Hidden input to store raw skills for form submission -->
                    <input type="hidden" name="skills_json" id="skillsJson">
                </div>
            </div>
            
            <!-- Досвід та освіта -->
            <div class="form-section">
                <div class="form-section-title">Досвід та освіта</div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">🎓</span>
                        Освіта
                    </label>
                    <div class="input-wrapper">
                        <textarea name="education" rows="3" placeholder="Опишіть вашу освіту, навчальні заклади, спеціальність..."></textarea>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">💼</span>
                        Попередні місця роботи
                    </label>
                    <div class="input-wrapper">
                        <textarea name="previous_work" rows="4" placeholder="Опишіть ваш попередній досвід роботи, компанії, проекти..."></textarea>
                    </div>
                </div>
            </div>
            
            <!-- Додаткова інформація -->
            <div class="form-section">
                <div class="form-section-title">Додаткова інформація</div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">🔗</span>
                        Посилання на портфоліо
                    </label>
                    <div class="input-wrapper">
                        <input type="url" name="portfolio_url" placeholder="https://github.com/username або https://your-portfolio.com">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>
                        <span class="icon">📝</span>
                        Додаткова інформація
                    </label>
                    <div class="input-wrapper">
                        <textarea name="additional_info" rows="4" placeholder="Будь-яка додаткова інформація, яку ви хочете додати до заявки..."></textarea>
                    </div>
                </div>
            </div>
            
            <button type="submit" class="submit-button">
                <span style="position: relative; z-index: 1;">🚀 Відправити заявку</span>
            </button>
            <div id="message"></div>
        </form>
    `;
    document.getElementById('app').innerHTML = html;

    const form = document.getElementById('applicationForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Skill Builder Logic
    const skillCustomSelect = document.getElementById('skillCustomSelect');
    const skillNameValue = document.getElementById('skillNameValue');
    const skillExpInput = document.getElementById('skillExpInput');
    const addSkillBtn = document.getElementById('addSkillBtn');
    const addedSkillsList = document.getElementById('addedSkillsList');
    const skillsJsonInput = document.getElementById('skillsJson');

    // Reusable Custom Select Function
    function setupCustomSelect(wrapperId, inputId) {
        const wrapper = document.getElementById(wrapperId);
        const input = document.getElementById(inputId);

        if (!wrapper || !input) return null;

        const trigger = wrapper.querySelector('.custom-select-trigger');
        const triggerSpan = trigger.querySelector('span');
        const triggerInput = trigger.querySelector('input'); // For search mode
        const options = wrapper.querySelectorAll('.custom-option');

        function closeAll() {
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                w.classList.remove('open');
            });
        }

        if (triggerInput) {
            // --- Searchable Mode ---

            // Open/Close on click
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();

                // If clicking the input explicitly
                if (e.target === triggerInput) {
                    // Check if input is readonly
                    if (triggerInput.readOnly) {
                        // Readonly inputs behave like standard triggers: toggle
                        if (wrapper.classList.contains('open')) {
                            wrapper.classList.remove('open');
                        } else {
                            closeAll();
                            wrapper.classList.add('open');
                        }
                    } else {
                        // Editable inputs: Open only (to allow typing/focus)
                        // But if it's already open, we keep it open.
                        if (!wrapper.classList.contains('open')) {
                            closeAll();
                            wrapper.classList.add('open');
                        }
                    }
                    return;
                }

                // For arrow or container background, toggle
                if (wrapper.classList.contains('open')) {
                    wrapper.classList.remove('open');
                } else {
                    closeAll();
                    wrapper.classList.add('open');
                    triggerInput.focus();
                }
            });

            // Filter options on type
            triggerInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                // Update hidden input directly to allow custom values
                input.value = e.target.value;

                let hasVisible = false;
                options.forEach(option => {
                    const text = option.textContent.toLowerCase();
                    if (text.includes(term)) {
                        option.style.display = 'block';
                        hasVisible = true;
                    } else {
                        option.style.display = 'none';
                    }
                });

                if (!wrapper.classList.contains('open')) {
                    closeAll();
                    wrapper.classList.add('open');
                }
            });

            // Select option
            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const text = option.textContent;
                    const value = option.dataset.value;

                    triggerInput.value = text;
                    input.value = value;

                    // Reset filter
                    options.forEach(o => o.style.display = 'block');

                    wrapper.classList.remove('open');
                });
            });

            return {
                reset: () => {
                    triggerInput.value = '';
                    input.value = '';
                    wrapper.classList.remove('open');
                    options.forEach(o => o.style.display = 'block');
                }
            };

        } else {
            // --- Standard Dropdown Mode ---

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAll();
                if (wrapper.id === wrapperId) wrapper.classList.toggle('open');
            });

            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    triggerSpan.textContent = option.textContent;
                    input.value = option.dataset.value;

                    wrapper.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    wrapper.classList.remove('open');
                });
            });

            return {
                reset: () => {
                    const defaultOption = wrapper.querySelector('.custom-option[data-value=""]');
                    if (defaultOption) {
                        triggerSpan.textContent = defaultOption.textContent;
                        input.value = defaultOption.dataset.value;
                        wrapper.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                        defaultOption.classList.add('selected');
                        wrapper.classList.remove('open');
                    }
                }
            };
        }
    }

    // Initialize Dropdowns
    const englishSelect = setupCustomSelect('englishCustomSelect', 'englishLevelInput');
    const skillsSelect = setupCustomSelect('skillCustomSelect', 'skillNameValue');

    // Global Click Outside Handler
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
            wrapper.classList.remove('open');
        });
    });

    let currentSkills = [];

    function updateSkillsDisplay() {
        addedSkillsList.innerHTML = currentSkills.map((skill, index) => `
            <div class="skill-tag-item">
                <div class="skill-info">
                    <span class="skill-name">${skill.name}</span>
                    <span class="skill-exp">${skill.exp > 0 ? `${skill.exp} років` : 'менше року'}</span>
                </div>
                <button type="button" class="remove-skill-btn" data-index="${index}">✖</button>
            </div>
        `).join('');

        // Update remove buttons
        document.querySelectorAll('.remove-skill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                currentSkills.splice(index, 1);
                updateSkillsDisplay();
            });
        });

        // Update hidden input
        skillsJsonInput.value = JSON.stringify(currentSkills.map(s => s.name));
    }

    addSkillBtn.addEventListener('click', () => {
        const name = skillNameValue.value;
        const exp = parseFloat(skillExpInput.value);

        if (name) {
            // Check for duplicates
            if (!currentSkills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
                currentSkills.push({
                    name: name,
                    exp: isNaN(exp) ? 0 : exp
                });
                updateSkillsDisplay();

                // Reset custom select
                skillsSelect.reset();

                skillExpInput.value = '';
            } else {
                // Shake animation for duplicate
                skillCustomSelect.classList.add('shake');
                setTimeout(() => skillCustomSelect.classList.remove('shake'), 500);
            }
        }
    });

    // Enter key support
    skillExpInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkillBtn.click();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Блокуємо кнопку під час відправки
        submitButton.disabled = true;
        submitButton.innerHTML = '<span style="position: relative; z-index: 1;">⏳ Відправка...</span>';

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Concatenate full name
        const nameParts = [data.first_name, data.last_name, data.middle_name].filter(Boolean);
        data.full_name = nameParts.join(' ');

        // Remove individual name fields as backend expects full_name
        delete data.last_name;
        delete data.first_name;
        delete data.middle_name;

        // Обробка рівня англійської
        if (data.english_level) {
            const englishInfo = `English Level: ${data.english_level}`;
            if (data.additional_info) {
                data.additional_info = `${englishInfo}\n\n${data.additional_info}`;
            } else {
                data.additional_info = englishInfo;
            }
            delete data.english_level;
        }

        // Обробка навичок з Skill Builder
        if (currentSkills.length > 0) {
            // 1. Для поля 'skills' (список назв для аналітики)
            data.skills = currentSkills.map(s => s.name);

            // 2. Для 'additional_info' (детальний опис з досвідом)
            const skillsDetails = currentSkills.map(s =>
                `- ${s.name}: ${s.exp > 0 ? `${s.exp} років` : 'менше року'}`
            ).join('\n');

            const skillsHeader = "Technical Skills Details:\n" + skillsDetails;

            if (data.additional_info) {
                data.additional_info += `\n\n${skillsHeader}`;
            } else {
                data.additional_info = skillsHeader;
            }
        }

        delete data.skills_json; // Remove temp field

        // Очищаємо порожні поля
        Object.keys(data).forEach(key => {
            if (data[key] === '') {
                delete data[key];
            }
        });

        try {
            const result = await apiPost('/candidate/application', data);

            if (result.success) {
                if (tg?.vibrate) {
                    tg.vibrate([100, 50, 100]);
                }

                // Redirect to waiting page
                const { navigate } = await import('../router.js');
                navigate('/waiting');
            } else {
                document.getElementById('message').innerHTML =
                    `<div class="error">
                        <strong>❌ Помилка</strong><br>
                        ${result.detail || 'Невідома помилка'}
                    </div>`;
            }
        } catch (error) {
            document.getElementById('message').innerHTML =
                `<div class="error">
                    <strong>❌ Помилка відправки</strong><br>
                    ${error.message}<br>
                    <small>Перевірте підключення до інтернету та спробуйте ще раз.</small>
                </div>`;
        } finally {
            // Розблоковуємо кнопку
            submitButton.disabled = false;
            submitButton.innerHTML = '<span style="position: relative; z-index: 1;">🚀 Відправити заявку</span>';
        }
    });
}

export async function loadMyApplications() {
    try {
        const [appsData, interviewsData] = await Promise.all([
            apiGet('/candidate/applications'),
            apiGet('/candidate/interviews')
        ]);

        const appContainer = document.getElementById('app');
        let html = `
            <div class="dashboard-header">
                <h1>👋 Кабінет Кандидата</h1>
            </div>
        `;

        // --- Interviews Section ---
        if (interviewsData.interviews && interviewsData.interviews.length > 0) {
            html += `
                <div class="section-title">📅 Мої Співбесіди</div>
                <div class="cards-list">
                    ${interviewsData.interviews.map(renderInterviewCard).join('')}
                </div>
            `;
        }

        // --- Applications Section ---
        if (appsData.applications.length > 0) {
            html += `
                <div class="section-title">📂 Мої Заявки</div>
                <div class="cards-list">
                    ${appsData.applications.map(app => `
                        <div class="card">
                            <div class="card-header-row">
                                <h3>${app.position}</h3>
                                <span class="status-badge status-${app.status.toLowerCase()}">${formatStatus(app.status)}</span>
                            </div>
                            ${app.rejection_reason ? `<div class="rejection-box">❌ Причина: ${app.rejection_reason}</div>` : ''}
                            <div class="card-date">${new Date(app.created_at).toLocaleDateString('uk-UA')}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (!interviewsData.interviews || interviewsData.interviews.length === 0) {
            html += '<div class="empty-state">У вас поки немає активних заявок</div>';
        }

        appContainer.innerHTML = html;

    } catch (error) {
        document.getElementById('app').innerHTML = `<div class="error">Помилка: ${error.message}</div>`;
    }
}

function renderInterviewCard(interview) {
    const typeLabel = interview.interview_type === 'hr_screening' ? 'HR Скрінінг' : 'Технічне Інтерв\'ю';

    let content = '';

    if (!interview.selected_time) {
        // Mode: Select Slot
        content = `
            <p class="action-required">⚠️ Необхідно обрати час!</p>
            <div class="slots-container">
                <p>Оберіть зручний час:</p>
                <div class="slots-grid">
                    ${interview.available_slots.map(slot => `
                        <button class="slot-btn" onclick="selectSlot(${interview.id}, '${slot.start}')">
                            ${new Date(slot.start).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        // Mode: Waiting Confirmation or Confirmed
        const statusText = interview.is_confirmed
            ? '✅ Підтверджено'
            : '⏳ Очікує підтвердження (Link/Local)';

        content = `
            <div class="interview-status">${statusText}</div>
            <div class="interview-time">
                ⏰ ${new Date(interview.selected_time).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            ${interview.meet_link ? `<div class="interview-link"><a href="${interview.meet_link}" target="_blank">🔗 Посилання на зустріч</a></div>` : ''}
            ${interview.address ? `<div class="interview-address">📍 Адреса: ${interview.address}</div>` : ''}
        `;
    }

    return `
        <div class="card interview-card">
            <h3>${typeLabel}</h3>
            ${content}
        </div>
    `;
}

window.selectSlot = async function (interviewId, slotStart) {
    if (!confirm(`Обрати цей час: ${new Date(slotStart).toLocaleString()}?`)) return;

    try {
        await apiPost('/candidate/interviews/select-slot', {
            interview_id: interviewId,
            selected_date: slotStart
        });
        alert('✅ Час обрано!');
        loadMyApplications(); // Reload
    } catch (e) {
        alert('Помилка: ' + e.message);
    }
};

function formatStatus(status) {
    const map = {
        'pending': 'Очікує розгляду',
        'accepted': 'Прийнято (На розгляді)',
        'screening_pending': 'Очікує планування скрінінгу',
        'screening_scheduled': 'Скрінінг заплановано',
        'screening_completed': 'Скрінінг пройдено',
        'tech_pending': 'Очікує технічного інтерв\'ю',
        'tech_scheduled': 'Технічне інтерв\'ю заплановано',
        'tech_completed': 'Технічне інтерв\'ю пройдено',
        'hired': 'Найнято (Офер прийнято)',
        'rejected': 'Відхилено',
        'declined': 'Відмова кандидата',
        'cancelled': 'Скасовано'
    };
    return map[status ? status.toLowerCase() : ''] || status;
}
