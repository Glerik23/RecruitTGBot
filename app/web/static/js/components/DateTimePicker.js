export class DateTimePicker {
    constructor(options = {}) {
        this.options = {
            mode: 'datetime', // 'date', 'time', 'datetime'
            minDate: new Date(),
            defaultDate: null,
            defaultTime: null,
            ...options
        };

        // State
        this.selectedDate = this.options.defaultDate ? new Date(this.options.defaultDate) : null;
        this.selectedTime = this.options.defaultTime || null;
        this.currentMonth = this.selectedDate ? new Date(this.selectedDate) : new Date(this.options.minDate);
        this.isOpen = false;

        this.init();
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('dt-picker-styles')) return;

        const css = `
            .dt-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000;
                backdrop-filter: blur(4px);
                animation: dt-fade-in 0.2s ease-out;
            }
            .dt-modal {
                background: #1e1e1e; border-radius: 16px; padding: 20px; width: 340px; max-width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid #333;
                display: flex; flex-direction: column; gap: 16px;
                animation: dt-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .dt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .dt-month-year { font-size: 18px; font-weight: 600; color: white; }
            .dt-nav-btn { background: transparent; border: 1px solid #333; color: #fff; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .dt-nav-btn:hover { background: #333; }
            
            .dt-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
            .dt-day-header { font-size: 13px; color: #888; padding: 8px 0; font-weight: 500; }
            .dt-day { 
                padding: 10px 0; border-radius: 8px; color: #eee; cursor: pointer; font-size: 14px; 
                transition: background 0.2s;
            }
            .dt-day:hover:not(.disabled) { background: #333; }
            .dt-day.selected { background: #3390ec; color: white; font-weight: 600; }
            .dt-day.disabled { color: #444; cursor: default; }

            .dt-time-grid { 
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; 
                max-height: 180px; overflow-y: auto; padding-right: 4px;
            }
            .dt-time-slot {
                background: #2c2c2c; color: #ccc; padding: 8px 4px; border-radius: 6px; 
                text-align: center; font-size: 13px; cursor: pointer; border: 1px solid transparent;
            }
            .dt-time-slot:hover { border-color: #555; }
            .dt-time-slot.selected { background: #3390ec; color: white; border-color: #3390ec; }

            .dt-time-header { font-size: 14px; color: #aaa; margin-bottom: 8px; font-weight: 500; }

            .dt-actions { display: flex; gap: 12px; margin-top: 8px; }
            .dt-actions button { flex: 1; padding: 12px; border-radius: 10px; font-weight: 600; border: none; cursor: pointer; }
            .dt-cancel-btn { background: transparent; color: #ff5e5e; border: 1px solid #ff5e5e40; }
            .dt-confirm-btn { background: #3390ec; color: white; }
            .dt-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #333; color: #888; }

            @keyframes dt-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes dt-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            
            .dt-time-grid::-webkit-scrollbar { width: 4px; }
            .dt-time-grid::-webkit-scrollbar-track { background: #222; }
            .dt-time-grid::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
        `;

        const style = document.createElement('style');
        style.id = 'dt-picker-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    init() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'dt-overlay';
        this.overlay.style.display = 'none';

        const mode = this.options.mode;
        const showCalendar = mode === 'date' || mode === 'datetime';
        const showTime = mode === 'time' || mode === 'datetime';

        this.overlay.innerHTML = `
            <div class="dt-modal">
                ${showCalendar ? `
                <div class="dt-header">
                    <button class="dt-nav-btn prev-month">←</button>
                    <span class="dt-month-year"></span>
                    <button class="dt-nav-btn next-month">→</button>
                </div>
                <div class="dt-calendar-grid"></div>` : ''}
                
                ${showTime ? `
                <div class="dt-time-section">
                    <div class="dt-time-header">${showCalendar ? 'Час' : 'Оберіть час'}</div>
                    <div class="dt-time-grid"></div>
                </div>` : ''}
                
                <div class="dt-actions">
                    <button class="dt-cancel-btn">Скасувати</button>
                    <button class="dt-confirm-btn" disabled>Обрати</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        if (showCalendar) {
            this.overlay.querySelector('.prev-month').onclick = () => this.changeMonth(-1);
            this.overlay.querySelector('.next-month').onclick = () => this.changeMonth(1);
        }

        this.overlay.querySelector('.dt-cancel-btn').onclick = () => this.close();
        this.overlay.querySelector('.dt-confirm-btn').onclick = () => this.confirm();

        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) this.close();
        };

        if (showCalendar) this.renderCalendar();
        if (showTime) this.renderTimeGrid();

        this.updateConfirmState();
    }

    open() {
        this.overlay.style.display = 'flex';
        this.isOpen = true;
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.selectionChanged();
        }
    }

    close() {
        this.overlay.style.display = 'none';
        this.isOpen = false;
        setTimeout(() => this.overlay.remove(), 200); // Cleanup after animation? Or just keep hidden. 
        // Actually better to remove if we instantiate new one every time.
        // We will remove it.
        this.overlay.remove();
    }

    changeMonth(delta) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
        this.renderCalendar();
    }

    renderCalendar() {
        const grid = this.overlay.querySelector('.dt-calendar-grid');
        const title = this.overlay.querySelector('.dt-month-year');

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
        title.textContent = `${monthNames[month]} ${year}`;

        grid.innerHTML = '';

        ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].forEach(d => {
            const el = document.createElement('div');
            el.className = 'dt-day-header';
            el.textContent = d;
            grid.appendChild(el);
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        let startingDay = firstDay.getDay() || 7;

        for (let i = 1; i < startingDay; i++) {
            grid.appendChild(document.createElement('div'));
        }

        const todayTimestamp = new Date().setHours(0, 0, 0, 0);

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            const el = document.createElement('div');
            el.className = 'dt-day';
            el.textContent = i;

            if (date.getTime() < todayTimestamp) {
                el.classList.add('disabled');
            } else {
                el.onclick = () => this.selectDate(date, el);
            }

            if (this.selectedDate && date.toDateString() === this.selectedDate.toDateString()) {
                el.classList.add('selected');
            }

            grid.appendChild(el);
        }
    }

    renderTimeGrid() {
        const grid = this.overlay.querySelector('.dt-time-grid');
        grid.innerHTML = '';

        const startHour = 8;
        const endHour = 20;

        for (let h = startHour; h <= endHour; h++) {
            ['00', '30'].forEach(m => {
                const timeStr = `${h.toString().padStart(2, '0')}:${m}`;
                const el = document.createElement('div');
                el.className = 'dt-time-slot';
                el.textContent = timeStr;
                el.onclick = () => this.selectTime(timeStr, el);

                if (this.selectedTime === timeStr) el.classList.add('selected');

                grid.appendChild(el);
            });
        }
    }

    selectDate(date, el) {
        this.selectedDate = date;
        this.overlay.querySelectorAll('.dt-day').forEach(d => d.classList.remove('selected'));
        el.classList.add('selected');
        this.updateConfirmState();
        if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }

    selectTime(time, el) {
        this.selectedTime = time;
        this.overlay.querySelectorAll('.dt-time-slot').forEach(t => t.classList.remove('selected'));
        el.classList.add('selected');
        this.updateConfirmState();
        if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }

    updateConfirmState() {
        const btn = this.overlay.querySelector('.dt-confirm-btn');
        const showCalendar = this.options.mode === 'date' || this.options.mode === 'datetime';
        const showTime = this.options.mode === 'time' || this.options.mode === 'datetime';

        const dateValid = !showCalendar || this.selectedDate;
        const timeValid = !showTime || this.selectedTime;

        if (dateValid && timeValid) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    }

    confirm() {
        if (this.options.onSelect) {
            this.options.onSelect(this.selectedDate, this.selectedTime);
        }
        this.close();
    }
}

export default DateTimePicker;