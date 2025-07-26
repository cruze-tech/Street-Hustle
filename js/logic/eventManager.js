class EventManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.eventTimer = null;
        this.activeEvents = new Map(); // Track active events by hustleId

        this.events = [
            {
                id: 'power-outage',
                hustleId: 'charging',
                title: "Power Outage!",
                text: "Your charging booth is offline for 15 seconds. No income!",
                icon: "error",
                duration: 15000,
                multiplier: 0
            },
            {
                id: 'festival-crowd',
                hustleId: 'rolex',
                title: "Festival Crowd!",
                text: "Snack sales are booming! x2 income for 30 seconds!",
                icon: "success",
                duration: 30000,
                multiplier: 2
            },
            {
                id: 'sudden-downpour',
                hustleId: 'boda',
                title: "Sudden Downpour!",
                text: "The rain is ruining your Boda Boda rides. -50% income for 20 seconds.",
                icon: "warning",
                duration: 20000,
                multiplier: 0.5
            }
        ];
    }

    start() {
        // Start events after 30 seconds, then every 45-75 seconds
        setTimeout(() => {
            this.scheduleNextEvent();
        }, 30000);
    }

    scheduleNextEvent() {
        const delay = 45000 + Math.random() * 30000; // 45-75 seconds
        setTimeout(() => {
            this.triggerRandomEvent();
            this.scheduleNextEvent(); // Schedule the next event
        }, delay);
    }
    
    triggerRandomEvent() {
        const availableEvents = this.events.filter(event => {
            const hustleState = this.gameEngine.gameState.hustles[event.hustleId];
            const isUnlocked = hustleState?.isUnlocked && hustleState?.level > 0;
            const isNotActive = !this.activeEvents.has(event.hustleId);
            return isUnlocked && isNotActive;
        });

        if (availableEvents.length === 0) return;

        const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        
        Swal.fire({
            title: event.title,
            text: event.text,
            icon: event.icon,
            timer: event.duration,
            timerProgressBar: true,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
        });

        this.applyEventEffect(event);
    }
    
    applyEventEffect(event) {
        const hustleState = this.gameEngine.gameState.hustles[event.hustleId];
        if (!hustleState || !hustleState.isUnlocked) return;

        console.log(`Event started: ${event.id}. Applying x${event.multiplier} to ${event.hustleId}`);
        
        // Store original multiplier and apply event multiplier
        const originalMultiplier = hustleState.eventMultiplier || 1;
        hustleState.eventMultiplier = event.multiplier;
        
        // Track this active event
        this.activeEvents.set(event.hustleId, {
            eventId: event.id,
            originalMultiplier: originalMultiplier,
            endTime: Date.now() + event.duration
        });

        // Set timeout to revert the effect
        setTimeout(() => {
            this.revertEventEffect(event.hustleId);
        }, event.duration);

        // Trigger UI update to show effect
        window.dispatchEvent(new CustomEvent('updateUI'));
    }

    revertEventEffect(hustleId) {
        const eventData = this.activeEvents.get(hustleId);
        if (!eventData) return;

        const hustleState = this.gameEngine.gameState.hustles[hustleId];
        if (hustleState) {
            console.log(`Event ended for ${hustleId}. Reverting multiplier.`);
            hustleState.eventMultiplier = eventData.originalMultiplier;
        }

        this.activeEvents.delete(hustleId);
        window.dispatchEvent(new CustomEvent('updateUI'));
    }

    // Clean up method for when game is reset
    clearAllEvents() {
        this.activeEvents.clear();
        if (this.eventTimer) {
            clearInterval(this.eventTimer);
            this.eventTimer = null;
        }
    }
}