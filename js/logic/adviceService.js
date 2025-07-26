class AdviceService {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    getAdvice() {
        const { money, hustles } = this.gameEngine.gameState;
        const incomePerSecond = this.gameEngine.calculateIncomePerSecond();
        const unlockedHustles = Object.keys(hustles).filter(id => hustles[id].isUnlocked);

        let advice = "Keep hustling! Every little bit counts.";

        if (incomePerSecond === 0 && money < 50000) {
            advice = "You're just starting out. Focus on upgrading your first hustle to build a steady income stream. Manual clicks are key right now!";
        } else if (unlockedHustles.length === 1) {
            advice = "Your first hustle is running! Try to unlock the next one to diversify your income streams and grow your empire faster.";
        } else if (incomePerSecond > 10000 && unlockedHustles.length > 1) {
            // Fix: Find the hustle ID with highest income, then get its config
            const topHustleId = unlockedHustles.reduce((maxId, hustleId) => 
                this.gameEngine.getHustleIncome(hustleId) > this.gameEngine.getHustleIncome(maxId) ? hustleId : maxId
            );
            const config = this.gameEngine.hustleConfig.find(c => c.id === topHustleId);
            advice = `Your income is growing steadily! Your "${config.name}" hustle is your top earner. Keep upgrading it for maximum profit.`;
        } else if (money > 1000000) {
            advice = "You're making serious cash! Remember to reinvest in your hustles. Automation is the key to passive income. Make sure your top earners are automated.";
        } else {
            advice = "The streets are tough, but you're tougher. Look for the hustle with the best return on investment and focus your upgrades there.";
        }

        // Display with SweetAlert2
        Swal.fire({
            title: 'Hustle AI Says...',
            text: advice,
            icon: 'info',
            confirmButtonText: 'Got It!'
        });
    }
}