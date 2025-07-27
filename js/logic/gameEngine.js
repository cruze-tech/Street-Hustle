class GameEngine {
    constructor() {
        this.gameState = {
            money: 500, // Start with some money for first upgrade
            hustles: {},
            lastUpdate: Date.now(),
            totalEarnings: 0, // Track total money ever earned
            gameStartTime: Date.now(), // Track when the game started
            sessionStartTime: Date.now() // Track current session
        };
        this.hustleConfig = [];
        this.gameLoopInterval = null;
    }

    async init() {
        await this.loadHustleConfig();
        this.loadGame();
        this.gameState.sessionStartTime = Date.now(); // Reset session time on init
        console.log("Street Hustle: Engine Started!");
        return true;
    }

    async loadHustleConfig() {
        try {
            const response = await fetch('hustles.json');
            this.hustleConfig = await response.json();
            console.log("Loaded hustles:", this.hustleConfig);
        } catch (error) {
            console.error("Failed to load hustle configuration:", error);
            // Use fallback data if JSON fails to load
            this.hustleConfig = [
                {
                    id: "clothing",
                    name: "Wash Clothes",
                    description: "Start small by washing clothes for neighbors. Every entrepreneur starts somewhere!",
                    baseIncome: 500,
                    baseCost: 0,
                    costMultiplier: 1.15,
                    automation: { timer: 1500, unlockRequirement: 10 },
                    icon: "🧺"
                },
                {
                    id: "airtime",
                    name: "Sell Airtime",
                    description: "Everyone needs airtime! Set up a small booth and help people stay connected.",
                    baseIncome: 2500,
                    baseCost: 30000,
                    costMultiplier: 1.20,
                    automation: { timer: 3000, unlockRequirement: 5 },
                    icon: "📱"
                },
                {
                    id: "charging",
                    name: "Charge Phones",
                    description: "Power is precious! Offer phone charging services to people whose devices have died.",
                    baseIncome: 10000,
                    baseCost: 200000,
                    costMultiplier: 1.25,
                    automation: { timer: 5000, unlockRequirement: 3 },
                    icon: "🔋"
                }
            ];
        }
    }

    getInitialHustleState(hustleId) {
        const config = this.hustleConfig.find(h => h.id === hustleId);
        return {
            level: 0,
            isUnlocked: config.baseCost === 0, // First hustle (clothes) starts unlocked
            canUnlock: config.baseCost === 0, // First hustle can be upgraded immediately
            isAutomated: false,
            automationProgress: 0,
            eventMultiplier: 1
        };
    }

    getHustleCost(hustleId) {
        const config = this.hustleConfig.find(h => h.id === hustleId);
        const state = this.gameState.hustles[hustleId];
        
        if (!state.isUnlocked) {
            return config.baseCost; // Cost to unlock
        }
        
        // Cost to upgrade to next level
        return Math.ceil(config.baseCost === 0 ? 
            500 * Math.pow(config.costMultiplier, state.level) : 
            config.baseCost * Math.pow(config.costMultiplier, state.level));
    }

    getHustleIncome(hustleId) {
        const config = this.hustleConfig.find(h => h.id === hustleId);
        const state = this.gameState.hustles[hustleId];
        
        if (!state || !state.isUnlocked || state.level === 0) return 0;
        
        const baseIncome = state.level * config.baseIncome;
        const eventMultiplier = state.eventMultiplier || 1;
        return baseIncome * eventMultiplier;
    }

    calculateIncomePerSecond() {
        return Object.keys(this.gameState.hustles).reduce((total, hustleId) => {
            const hustle = this.gameState.hustles[hustleId];
            if (hustle.isAutomated && hustle.level > 0) {
                const incomePerCycle = this.getHustleIncome(hustleId);
                const config = this.hustleConfig.find(c => c.id === hustleId);
                if (config) {
                    total += incomePerCycle / (config.automation.timer / 1000);
                }
            }
            return total;
        }, 0);
    }
    
    startGameLoop(renderCallback) {
        if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
        this.gameLoopInterval = setInterval(() => this.update(renderCallback), 100);
    }

    update(renderCallback) {
        const now = Date.now();
        const deltaTime = now - this.gameState.lastUpdate;
        this.gameState.lastUpdate = now;

        let moneyEarned = 0;
        
        // Process automated hustles
        Object.keys(this.gameState.hustles).forEach(hustleId => {
            let state = this.gameState.hustles[hustleId];
            if (state.isAutomated && state.level > 0) {
                state.automationProgress += deltaTime;
                const config = this.hustleConfig.find(h => h.id === hustleId);
                
                if (config && state.automationProgress >= config.automation.timer) {
                    const cycles = Math.floor(state.automationProgress / config.automation.timer);
                    moneyEarned += cycles * this.getHustleIncome(hustleId);
                    state.automationProgress %= config.automation.timer;
                }
            }
        });

        if (moneyEarned > 0) {
            this.earnMoney(moneyEarned);
        }
        
        // Check for new hustle unlocks
        this.checkHustleUnlocks();
        
        if (renderCallback) {
            renderCallback();
        }
    }

    checkHustleUnlocks() {
        this.hustleConfig.forEach((config, index) => {
            const state = this.gameState.hustles[config.id];
            if (!state) return;
            
            if (!state.isUnlocked && index > 0) {
                const previousHustle = this.gameState.hustles[this.hustleConfig[index - 1].id];
                // Unlock next hustle when previous one reaches level 5
                if (previousHustle && previousHustle.level >= 5) {
                    state.canUnlock = true;
                    console.log(`${config.name} can now be unlocked!`);
                }
            }
        });
    }
    
    earnMoney(amount, showAnimation = false, element = null) {
        this.gameState.money += amount;
        this.gameState.totalEarnings += amount; // Track total earnings
        if (showAnimation && element) {
            this.showCoinAnimation(`+${this.formatMoney(amount)}`, element);
        }
    }

    manualHustle(hustleId, element) {
        const state = this.gameState.hustles[hustleId];
        const config = this.hustleConfig.find(h => h.id === hustleId);
        if (!config || !state || !state.isUnlocked) return;
        
        // Manual income is 10% of one automated cycle income
        const baseManualIncome = state.level > 0 ? 
            this.getHustleIncome(hustleId) * 0.1 : 
            config.baseIncome * 0.1;
        
        const eventMultiplier = state.eventMultiplier || 1;
        const manualIncome = baseManualIncome * eventMultiplier;
        
        this.earnMoney(manualIncome, true, element);
    }
    
    buyHustle(hustleId) {
        const config = this.hustleConfig.find(h => h.id === hustleId);
        let state = this.gameState.hustles[hustleId];
        const cost = this.getHustleCost(hustleId);

        if (this.gameState.money >= cost) {
            this.gameState.money -= cost;
            
            if (!state.isUnlocked) {
                // Unlocking the hustle
                state.isUnlocked = true;
                state.level = 1;
                state.canUnlock = false; // Reset the unlock flag
                
                // Show unlock notification
                Swal.fire({
                    title: 'New Hustle Unlocked! 🎉',
                    text: `${config.icon} ${config.name} is now available!`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            } else {
                // Upgrading existing hustle
                state.level += 1;
            }
            
            // Check for automation unlock
            if (!state.isAutomated && state.level >= config.automation.unlockRequirement) {
                state.isAutomated = true;
                
                Swal.fire({
                    title: 'Automation Unlocked! 🤖',
                    text: `${config.name} is now automated!`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
            
            console.log(`${config.name} upgraded to level ${state.level}`);
        }
    }

    // NEW: Show detailed earnings statistics
    showEarningsStats() {
        const sessionTime = Date.now() - this.gameState.sessionStartTime;
        const totalGameTime = Date.now() - this.gameState.gameStartTime;
        
        const formatTime = (ms) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) return `${hours}h ${minutes % 60}m`;
            if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
            return `${seconds}s`;
        };

        // Calculate hustle breakdown
        const hustleStats = this.hustleConfig.map(config => {
            const state = this.gameState.hustles[config.id];
            const income = this.getHustleIncome(config.id);
            return {
                name: config.name,
                icon: config.icon,
                level: state.level,
                income: income,
                isAutomated: state.isAutomated,
                isUnlocked: state.isUnlocked
            };
        }).filter(hustle => hustle.isUnlocked);

        const hustleStatsHtml = hustleStats.map(hustle => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #333;">
                <span>${hustle.icon} ${hustle.name} (Lvl ${hustle.level})</span>
                <span style="color: #4CAF50;">UGX ${this.formatMoney(hustle.income)}${hustle.isAutomated ? ' 🤖' : ''}</span>
            </div>
        `).join('');

        Swal.fire({
            title: '📊 Earnings Statistics',
            html: `
                <div style="text-align: left; margin: 20px 0;">
                    <div style="background: #2a2a2a; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #FFC700;">💰 Financial Summary</h3>
                        <p><strong>Current Cash:</strong> UGX ${this.formatMoney(this.gameState.money)}</p>
                        <p><strong>Total Earned:</strong> UGX ${this.formatMoney(this.gameState.totalEarnings)}</p>
                        <p><strong>Income Per Second:</strong> UGX ${this.formatMoney(this.calculateIncomePerSecond())}/s</p>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #FFC700;">⏱️ Time Statistics</h3>
                        <p><strong>Session Time:</strong> ${formatTime(sessionTime)}</p>
                        <p><strong>Total Game Time:</strong> ${formatTime(totalGameTime)}</p>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 15px; border-radius: 10px;">
                        <h3 style="margin: 0 0 15px 0; color: #FFC700;">🏪 Active Hustles</h3>
                        ${hustleStatsHtml || '<p style="color: #888;">No hustles unlocked yet.</p>'}
                    </div>
                </div>
            `,
            confirmButtonText: 'Back to Hustling!',
            confirmButtonColor: '#4CAF50',
            width: '90%',
            maxWidth: '500px'
        });
    }

    // NEW: Exit game with confirmation
    exitGame() {
        Swal.fire({
            title: 'Leave the Streets? 🚪',
            text: "Your progress will be saved automatically. Are you sure you want to exit?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#FFC700',
            cancelButtonColor: '#3c3c3c',
            confirmButtonText: 'Yes, Exit Game',
            cancelButtonText: 'Keep Hustling'
        }).then((result) => {
            if (result.isConfirmed) {
                // Auto-save before exit
                this.saveGame();
                
                // Show goodbye message
                Swal.fire({
                    title: 'Thanks for Playing! 👋',
                    text: 'Your hustle empire has been saved. Come back soon to continue building your wealth!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    // Stop the game loop first
                    if (this.gameLoopInterval) {
                        clearInterval(this.gameLoopInterval);
                        this.gameLoopInterval = null;
                    }
                    
                    // Return to welcome screen
                    document.getElementById('game-container').style.display = 'none';
                    document.getElementById('welcome-screen').style.display = 'flex';
                    document.body.classList.add('show-welcome');
                    
                    // CRITICAL: Check for save and show continue button
                    this.checkAndShowContinueButton();
                    
                    // Re-setup welcome screen event listeners if needed
                    this.setupWelcomeScreenFromExit();
                });
            }
        });
    }

    // NEW: Helper method to check for saves and show continue button
    checkAndShowContinueButton() {
        // Use the global function instead of local logic
        if (window.checkForExistingSave) {
            window.checkForExistingSave();
        } else {
            // Fallback if global function isn't available
            const hasSave = localStorage.getItem('streetHustleSave_v1');
            const continueButton = document.getElementById('load-game');
            if (hasSave && continueButton) {
                continueButton.style.display = 'block';
                console.log('Continue button shown - save file found');
            }
        }
    }

    // NEW: Setup welcome screen when returning from exit
    setupWelcomeScreenFromExit() {
        // Remove any existing event listeners to prevent duplicates
        const startButton = document.getElementById('start-game');
        const continueButton = document.getElementById('load-game');
        
        if (startButton) {
            // Clone button to remove existing event listeners
            const newStartButton = startButton.cloneNode(true);
            startButton.parentNode.replaceChild(newStartButton, startButton);
            
            // Add fresh event listener
            newStartButton.addEventListener('click', () => {
                localStorage.removeItem('streetHustleSave_v1');
                this.restartGameFromWelcome();
            });
        }
        
        if (continueButton) {
            // Clone button to remove existing event listeners
            const newContinueButton = continueButton.cloneNode(true);
            continueButton.parentNode.replaceChild(newContinueButton, continueButton);
            
            // Add fresh event listener
            newContinueButton.addEventListener('click', () => {
                this.restartGameFromWelcome();
            });
        }
    }

    // NEW: Restart game from welcome screen (used by both start and continue)
    restartGameFromWelcome() {
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';
        document.body.classList.remove('show-welcome');
        
        // Reinitialize the game
        this.init().then(() => {
            // Restart game systems
            window.eventManager = new EventManager(this);
            window.adviceService = new AdviceService(this);
            
            // Recreate hustle cards
            window.createAllHustleCards();
            
            // Start game systems
            window.eventManager.start();
            this.startGameLoop(window.renderUI);
            
            console.log('Game restarted from welcome screen');
        });
    }

    showHustleDetails(hustleId) {
        const config = this.hustleConfig.find(h => h.id === hustleId);
        const state = this.gameState.hustles[hustleId];
        
        const nextLevelIncome = (state.level + 1) * config.baseIncome;
        const automationStatus = state.isAutomated ? 
            '<p><strong>Status:</strong> <span style="color: #4CAF50;">✅ Automated</span></p>' : 
            state.level >= config.automation.unlockRequirement ?
            '<p><strong>Status:</strong> <span style="color: #FFC700;">🤖 Ready to Automate!</span></p>' :
            `<p><strong>Automation:</strong> Unlocks at level ${config.automation.unlockRequirement}</p>`;
        
        Swal.fire({
            title: `${config.icon} ${config.name}`,
            html: `
                <div style="text-align: left; margin: 20px 0;">
                    <p><strong>Description:</strong><br>${config.description}</p>
                    <hr style="margin: 15px 0;">
                    <p><strong>Current Level:</strong> ${state.level}</p>
                    <p><strong>Current Income:</strong> UGX ${this.formatMoney(this.getHustleIncome(hustleId))}</p>
                    <p><strong>Next Level Income:</strong> UGX ${this.formatMoney(nextLevelIncome * (state.eventMultiplier || 1))}</p>
                    <p><strong>Upgrade Cost:</strong> UGX ${this.formatMoney(this.getHustleCost(hustleId))}</p>
                    ${automationStatus}
                    <hr style="margin: 15px 0;">
                    <p style="font-size: 0.9em; color: #888;"><strong>💡 Tip:</strong> Manual clicks give you 10% of one automated cycle!</p>
                    ${!state.isUnlocked ? '<p style="color: #FFC700;"><strong>🔓 Unlock Requirement:</strong> Get previous hustle to level 5</p>' : ''}
                </div>
            `,
            confirmButtonText: 'Got It!',
            confirmButtonColor: '#4CAF50',
            width: '90%',
            maxWidth: '500px'
        });
    }

    formatMoney(amount) {
        const value = Math.floor(amount);
        if (value < 1e3) return value.toLocaleString('en-US');
        if (value >= 1e3 && value < 1e6) return (value / 1e3).toFixed(1) + "K";
        if (value >= 1e6 && value < 1e9) return (value / 1e6).toFixed(2) + "M";
        if (value >= 1e9 && value < 1e12) return (value / 1e9).toFixed(2) + "B";
        return (value / 1e12).toFixed(2) + "T";
    }

    showCoinAnimation(text, element) {
        const coin = document.createElement('div');
        coin.className = 'coin-animation';
        coin.textContent = text;
        
        const rect = element.getBoundingClientRect();
        coin.style.left = `${rect.left + (rect.width/4)}px`;
        coin.style.top = `${rect.top}px`;
        coin.style.position = 'fixed';
        coin.style.zIndex = '9999';
        
        document.body.appendChild(coin);
        setTimeout(() => coin.remove(), 1000);
    }

    saveGame() {
        try {
            localStorage.setItem('streetHustleSave_v1', JSON.stringify(this.gameState));
            Swal.fire({
                title: 'Progress Saved! 💾', 
                text: 'Your hustle empire is safe!', 
                icon: 'success', 
                timer: 1500, 
                showConfirmButton: false, 
                toast: true, 
                position: 'top-end'
            });
        } catch (e) {
            Swal.fire({title: 'Error!', text: 'Could not save progress.', icon: 'error'});
        }
    }

    loadGame() {
        const savedState = localStorage.getItem('streetHustleSave_v1');
        if (savedState) {
            try {
                Object.assign(this.gameState, JSON.parse(savedState));
                console.log("Game loaded successfully");
            } catch (e) {
                console.error("Save file corrupted, starting fresh:", e);
            }
        }
        
        this.gameState.lastUpdate = Date.now();
        
        // Ensure new properties exist
        if (!this.gameState.hasOwnProperty('totalEarnings')) {
            this.gameState.totalEarnings = 0;
        }
        if (!this.gameState.hasOwnProperty('gameStartTime')) {
            this.gameState.gameStartTime = Date.now();
        }
        
        // Ensure all hustles from config have a state
        this.hustleConfig.forEach(hustle => {
            if (!this.gameState.hustles[hustle.id]) {
                this.gameState.hustles[hustle.id] = this.getInitialHustleState(hustle.id);
            } else {
                // Ensure eventMultiplier exists on loaded states
                if (!this.gameState.hustles[hustle.id].hasOwnProperty('eventMultiplier')) {
                    this.gameState.hustles[hustle.id].eventMultiplier = 1;
                }
                // Ensure canUnlock exists
                if (!this.gameState.hustles[hustle.id].hasOwnProperty('canUnlock')) {
                    this.gameState.hustles[hustle.id].canUnlock = hustle.baseCost === 0;
                }
            }
        });
        
        console.log("Game state after load:", this.gameState);
    }

    resetGame() {
        Swal.fire({
            title: 'Are you sure?',
            text: "You'll lose all your progress and start from scratch!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#F44336',
            cancelButtonColor: '#3c3c3c',
            confirmButtonText: 'Yes, reset everything!'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('streetHustleSave_v1');
                window.location.reload();
            }
        });
    }
}