class HustleCard {
    constructor(hustleId, gameEngineInstance) {
        this.hustleId = hustleId;
        this.gameEngine = gameEngineInstance;
        this.config = this.gameEngine.hustleConfig.find(h => h.id === this.hustleId);
        this.element = this.createCardElement();
        this.cacheDOMElements();
        this.attachEventListeners();
        this.render();
    }

    createCardElement() {
        const card = document.createElement('div');
        card.className = 'hustle-card';
        card.id = `hustle-${this.hustleId}`;
        card.innerHTML = `
            <div class="hustle-icon">
                <span class="hustle-emoji">${this.config.icon || '💼'}</span>
            </div>
            <div class="hustle-details">
                <div class="hustle-header">
                    <span class="hustle-name">${this.config.name}</span>
                    <span class="hustle-level"></span>
                </div>
                <div class="hustle-income"></div>
                <div class="unlock-requirement"></div>
                <div class="event-effect"></div>
                <div class="automation-info-wrapper"></div>
                <div class="actions-wrapper">
                    <button class="action-button info-button">ℹ️ Details</button>
                    <button class="action-button manual-hustle-button" style="display: none;"></button>
                    <button class="action-button buy-button"></button>
                </div>
            </div>`;
        return card;
    }

    cacheDOMElements() {
        this.levelDisplay = this.element.querySelector('.hustle-level');
        this.incomeDisplay = this.element.querySelector('.hustle-income');
        this.unlockRequirement = this.element.querySelector('.unlock-requirement');
        this.eventEffect = this.element.querySelector('.event-effect');
        this.automationWrapper = this.element.querySelector('.automation-info-wrapper');
        this.manualButton = this.element.querySelector('.manual-hustle-button');
        this.buyButton = this.element.querySelector('.buy-button');
        this.infoButton = this.element.querySelector('.info-button');
    }

    attachEventListeners() {
        this.manualButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.gameEngine.manualHustle(this.hustleId, e.target);
        });
        
        this.buyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.gameEngine.buyHustle(this.hustleId);
        });
        
        this.infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.gameEngine.showHustleDetails(this.hustleId);
        });
    }

    render() {
        const state = this.gameEngine.gameState.hustles[this.hustleId];
        if (!state) return;

        const cost = this.gameEngine.getHustleCost(this.hustleId);
        const income = this.gameEngine.getHustleIncome(this.hustleId);
        const canAfford = this.gameEngine.gameState.money >= cost;

        // Update card appearance based on state
        this.element.classList.toggle('locked', !state.isUnlocked && !state.canUnlock);
        this.element.classList.toggle('can-unlock', !state.isUnlocked && state.canUnlock);
        
        // Update level display
        if (state.level > 0) {
            this.levelDisplay.textContent = `Lvl ${state.level}`;
            this.levelDisplay.style.display = '';
        } else {
            this.levelDisplay.style.display = 'none';
        }
        
        // Update income display
        if (state.isUnlocked && state.level > 0) {
            this.incomeDisplay.textContent = `Income: UGX ${this.gameEngine.formatMoney(income)}`;
            this.unlockRequirement.textContent = '';
        } else if (state.canUnlock) {
            this.incomeDisplay.textContent = `Potential: UGX ${this.gameEngine.formatMoney(this.config.baseIncome)}`;
            this.unlockRequirement.textContent = '✨ Ready to unlock!';
            this.unlockRequirement.style.color = '#FFC700';
        } else {
            this.incomeDisplay.textContent = `Locked hustle`;
            
            // Find the previous hustle to show requirement - FIX: Find by actual ID
            const hustleIndex = this.gameEngine.hustleConfig.findIndex(h => h.id === this.hustleId);
            if (hustleIndex > 0) {
                const prevHustle = this.gameEngine.hustleConfig[hustleIndex - 1];
                const prevState = this.gameEngine.gameState.hustles[prevHustle.id];
                if (prevState) {
                    this.unlockRequirement.textContent = `Need ${prevHustle.name} level 5 (currently ${prevState.level})`;
                    this.unlockRequirement.style.color = '#888';
                }
            }
        }

        // Event effects
        const eventMultiplier = state.eventMultiplier || 1;
        if (eventMultiplier !== 1 && state.isUnlocked) {
            let effectText = `📈 ${Math.round(eventMultiplier)}x BOOST!`, effectClass = 'event-positive';
            if (eventMultiplier === 0) { effectText = '🚫 OFFLINE'; effectClass = 'event-negative'; }
            else if (eventMultiplier < 1) { effectText = `📉 ${Math.round((1 - eventMultiplier) * 100)}% REDUCED`; effectClass = 'event-negative'; }
            this.eventEffect.innerHTML = `<div class="event-indicator ${effectClass}">${effectText}</div>`;
        } else {
            this.eventEffect.innerHTML = '';
        }

        // Manual hustle button
        if (!state.isAutomated && state.isUnlocked && state.level > 0) {
            const manualIncome = income * 0.1 * eventMultiplier;
            this.manualButton.textContent = `💪 Hustle (+${this.gameEngine.formatMoney(manualIncome)})`;
            this.manualButton.style.display = '';
        } else {
            this.manualButton.style.display = 'none';
        }

        // Buy/Upgrade button
        if (!state.isUnlocked) {
            if (state.canUnlock) {
                this.buyButton.textContent = `🔓 Unlock: UGX ${this.gameEngine.formatMoney(cost)}`;
                this.buyButton.disabled = !canAfford;
                this.buyButton.style.backgroundColor = canAfford ? '#4CAF50' : '#666';
            } else {
                this.buyButton.textContent = `🔒 Locked`;
                this.buyButton.disabled = true;
                this.buyButton.style.backgroundColor = '#666';
            }
        } else {
            this.buyButton.textContent = `⬆️ Upgrade: UGX ${this.gameEngine.formatMoney(cost)}`;
            this.buyButton.disabled = !canAfford;
            this.buyButton.style.backgroundColor = canAfford ? '#4CAF50' : '#666';
        }
        
        this.buyButton.classList.toggle('disabled', this.buyButton.disabled);

        // Automation info
        if (state.isAutomated) {
            const progress = (state.automationProgress / this.config.automation.timer) * 100;
            this.automationWrapper.innerHTML = `
                <div class="automation-text">🤖 Automated!</div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>`;
        } else if (state.isUnlocked && state.level >= this.config.automation.unlockRequirement) {
            this.automationWrapper.innerHTML = `<div class="automation-available">🤖 Auto-mode Ready!</div>`;
        } else if (state.isUnlocked) {
            this.automationWrapper.innerHTML = `<div class="automation-pending">🤖 Automates at level ${this.config.automation.unlockRequirement}</div>`;
        } else {
            this.automationWrapper.innerHTML = '';
        }
    }
}