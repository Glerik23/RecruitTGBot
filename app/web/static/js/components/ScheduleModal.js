/**
 * Універсальний компонент модального вікна для планування слотів
 */
import DateTimePicker from './DateTimePicker.js';

export class ScheduleModal {
    constructor(options) {
        this.applicationId = options.applicationId;
        this.title = options.title || '📅 Планування';
        this.subtitle = options.subtitle || 'Додайте варіанти часу для кандидата.';
        this.onSubmit = options.onSubmit; // async function(slots) => void
        this.onCancel = options.onCancel || (() => {});
        
        this.selectedSlots = [];
        this.modal = null;
        
        // Initialize default times
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(nextHour.getHours() + 1);
        
        const end = new Date(nextHour);
        end.setHours(end.getHours() + 1);
        
        this.selectedDate = new Date(nextHour);
        this.selectedStartTime = { hours: nextHour.getHours(), minutes: 0 };
        this.selectedEndTime = { hours: end.getHours(), minutes: 0 };
    }
    
    formatDateDisplay(date) {
        return date.toLocaleDateString('uk-UA', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        });
    }
    
    formatTimeDisplay(time) {
        return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
    }
    
    open() {
        // Remove existing modal
        const existing = document.getElementById('schedule-modal');
        if (existing) existing.remove();
        
        this.modal = document.createElement('div');
        this.modal.id = 'schedule-modal';
        this.modal.className = 'modal-overlay';
        this.modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;
            backdrop-filter: blur(2px);
        `;
        
        this.modal.innerHTML = this.getTemplate();
        document.body.appendChild(this.modal);
        
        this.injectStyles();
        this.bindEvents();
    }
    
    getTemplate() {
        return `
            <div class="modal-content" style="background: #212121; padding: 24px; border-radius: 16px; width: 90%; max-width: 420px; color: #ffffff; box-shadow: 0 10px 40px rgba(0,0,0,0.6); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <h2 style="margin-top:0; margin-bottom: 8px; color: #ffffff; font-size: 20px; font-weight: 600;">${this.title}</h2>
                <p style="font-size: 14px; opacity: 0.7; color: #cccccc; margin-bottom: 24px;">${this.subtitle}</p>
                
                <div style="margin-bottom: 24px;">
                    <label style="display:block; margin-bottom: 8px; font-weight:500; color: #e0e0e0; font-size: 14px;">Дата та Час:</label>
                    
                    <div id="date-btn" class="picker-btn" style="padding: 12px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: border-color 0.2s;">
                        <span style="font-size: 15px;">${this.formatDateDisplay(this.selectedDate)}</span>
                        <span style="opacity: 0.5;">📅</span>
                    </div>

                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <span style="font-size: 12px; color: #888; margin-bottom: 4px;">З</span>
                            <div id="start-time-btn" class="picker-btn" style="padding: 10px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; cursor: pointer; text-align: center; font-size: 15px; transition: border-color 0.2s;">
                                ${this.formatTimeDisplay(this.selectedStartTime)}
                            </div>
                        </div>
                        <span style="color: #666; padding-top: 16px;">—</span>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <span style="font-size: 12px; color: #888; margin-bottom: 4px;">До</span>
                            <div id="end-time-btn" class="picker-btn" style="padding: 10px; background: #2c2c2c; border: 1px solid #444; border-radius: 8px; cursor: pointer; text-align: center; font-size: 15px; transition: border-color 0.2s;">
                                ${this.formatTimeDisplay(this.selectedEndTime)}
                            </div>
                        </div>
                        <button id="add-slot-btn" class="btn" style="background: #3390ec; color: white; border: none; width: 42px; height: 42px; font-size: 24px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-top: 18px; transition: background 0.2s;">+</button>
                    </div>
                </div>

                <div style="margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #e0e0e0;">Обрані слоти:</div>
                <div id="slots-list" style="margin-bottom: 24px; max-height: 180px; overflow-y: auto; background: #1a1a1a; padding: 4px; border-radius: 10px; border: 1px solid #333; min-height: 80px;">
                    <div style="text-align: center; color: #666; font-size: 13px; padding: 20px;">Список порожній</div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancel-btn" class="btn" style="background: transparent; color: #ff5e5e; border: 1px solid #ff5e5e; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Скасувати</button>
                    <button id="confirm-btn" class="btn" disabled style="background: #3390ec; color: white; border: none; border-radius: 8px; padding: 10px 24px; font-weight: 500; opacity: 0.5; cursor: not-allowed; transition: opacity 0.2s;">Відправити</button>
                </div>
            </div>
        `;
    }
    
    injectStyles() {
        if (document.getElementById('schedule-modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'schedule-modal-styles';
        style.textContent = `
            .picker-btn:hover {
                border-color: #3390ec !important;
            }
            #add-slot-btn:hover {
                background: #2980c9;
            }
            #cancel-btn:hover {
                background: rgba(255, 94, 94, 0.1);
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        const dateBtn = this.modal.querySelector('#date-btn');
        const startBtn = this.modal.querySelector('#start-time-btn');
        const endBtn = this.modal.querySelector('#end-time-btn');
        const addBtn = this.modal.querySelector('#add-slot-btn');
        const cancelBtn = this.modal.querySelector('#cancel-btn');
        const confirmBtn = this.modal.querySelector('#confirm-btn');
        
        // Date picker
        dateBtn.onclick = () => {
            new DateTimePicker({
                mode: 'date',
                defaultDate: this.selectedDate,
                minDate: new Date(),
                onSelect: (d) => {
                    this.selectedDate = d;
                    dateBtn.querySelector('span').innerText = this.formatDateDisplay(d);
                }
            }).open();
        };
        
        // Start time picker
        startBtn.onclick = () => {
            new DateTimePicker({
                mode: 'time',
                defaultTime: this.selectedStartTime,
                onSelect: (t) => {
                    this.selectedStartTime = t;
                    startBtn.innerText = this.formatTimeDisplay(t);
                }
            }).open();
        };
        
        // End time picker
        endBtn.onclick = () => {
            new DateTimePicker({
                mode: 'time',
                defaultTime: this.selectedEndTime,
                onSelect: (t) => {
                    this.selectedEndTime = t;
                    endBtn.innerText = this.formatTimeDisplay(t);
                }
            }).open();
        };
        
        // Add slot
        addBtn.onclick = () => this.addSlot();
        
        // Cancel
        cancelBtn.onclick = () => this.close();
        this.modal.onclick = (e) => { 
            if (e.target === this.modal) this.close(); 
        };
        
        // Confirm
        confirmBtn.onclick = () => this.submit();
        
        // Global slot remove handler
        window._scheduleModalRemoveSlot = (index) => {
            this.selectedSlots.splice(index, 1);
            this.renderSlots();
        };
    }
    
    addSlot() {
        const start = new Date(this.selectedDate);
        start.setHours(this.selectedStartTime.hours, this.selectedStartTime.minutes, 0);
        
        const end = new Date(this.selectedDate);
        end.setHours(this.selectedEndTime.hours, this.selectedEndTime.minutes, 0);
        
        // Validation
        if (end <= start) {
            this.showError('Час завершення має бути пізніше часу початку');
            return;
        }
        
        // Check duplicates
        if (this.selectedSlots.some(s => s.start === start.toISOString() && s.end === end.toISOString())) {
            this.showError('Цей слот вже додано');
            return;
        }
        
        this.selectedSlots.push({
            start: start.toISOString(),
            end: end.toISOString()
        });
        
        // Sort by date
        this.selectedSlots.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        this.renderSlots();
        
        // Animation feedback
        const addBtn = this.modal.querySelector('#add-slot-btn');
        addBtn.style.transform = "scale(0.9)";
        setTimeout(() => addBtn.style.transform = "scale(1)", 100);
    }
    
    renderSlots() {
        const list = this.modal.querySelector('#slots-list');
        const confirmBtn = this.modal.querySelector('#confirm-btn');
        
        if (this.selectedSlots.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #666; font-size: 13px; padding: 20px;">Список порожній</div>';
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = "0.5";
            confirmBtn.style.cursor = "not-allowed";
            return;
        }
        
        list.innerHTML = this.selectedSlots.map((slot, index) => {
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            
            const dateStr = start.toLocaleDateString('uk-UA', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
            const timeStr = `${start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
            
            return `
                <div style="display:flex; justify-content: space-between; align-items: center; padding: 10px 12px; margin: 4px; background: #2c2c2c; border-radius: 8px; font-size: 14px; border: 1px solid #3a3a3a;">
                    <div style="display:flex; flex-direction: column; gap: 2px;">
                        <span style="font-weight: 500; color: #fff;">${dateStr}</span>
                        <span style="font-size: 12px; color: #aaa;">${timeStr}</span>
                    </div>
                    <button onclick="window._scheduleModalRemoveSlot(${index})" style="background: transparent; border: none; color: #ff5e5e; font-size: 18px; cursor: pointer; padding: 4px;">×</button>
                </div>
            `;
        }).join('');
        
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
        confirmBtn.style.cursor = "pointer";
    }
    
    showError(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
    
    async submit() {
        const confirmBtn = this.modal.querySelector('#confirm-btn');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;margin:0 auto"></div>';
        
        try {
            await this.onSubmit(this.selectedSlots);
            
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
            
            this.close();
        } catch (error) {
            this.showError(error.message);
            confirmBtn.innerHTML = 'Відправити';
            confirmBtn.disabled = false;
        }
    }
    
    close() {
        if (this.modal) {
            this.modal.style.opacity = '0';
            setTimeout(() => {
                this.modal.remove();
                delete window._scheduleModalRemoveSlot;
                this.onCancel();
            }, 200);
        }
    }
}

export default ScheduleModal;

