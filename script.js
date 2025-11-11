// Winions Dice Roller with School Weighting System
// This replaces the existing dice roller logic

const diceRoller = {
    selectedSchool: null,
    
    houseData: {
        'havoc': { min: 66, max: 175, image: 'havoc.gif', rarity: 'COMMON', class: 'common-badge' },
        'misfits': { min: 176, max: 230, image: 'misfit.gif', rarity: 'COMMON', class: 'common-badge' },
        'frog': { min: 231, max: 263, image: 'frog.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
        'theory': { min: 264, max: 290, image: 'theory.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
        'spectrum': { min: 291, max: 312, image: 'spectrum.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
        'clay': { min: 313, max: 329, image: 'clay.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
        'stencil': { min: 330, max: 345, image: 'stencil.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
        'royal': { min: 346, max: 356, image: 'royal.gif', rarity: 'RARE', class: 'rare-badge' },
        'shadows': { min: 357, max: 367, image: 'shadow.gif', rarity: 'RARE', class: 'rare-badge' },
        'hellish': { min: 368, max: 378, image: 'hellish.gif', rarity: 'RARE', class: 'rare-badge' },
        'hologram': { min: 379, max: 389, image: 'hologram.gif', rarity: 'ULTRA RARE', class: 'ultra-rare-badge' },
        'gold': { min: 390, max: 394, image: 'gold.gif', rarity: 'ULTRA RARE', class: 'ultra-rare-badge' }
        // Death (0 supply) removed - only rolls 66-394 now
    },

    init() {
        this.rollButton = document.getElementById('rollButton');
        this.rollAgainButton = document.getElementById('rollAgainButton');
        this.diceDisplay = document.getElementById('diceDisplay');
        this.totalValue = document.getElementById('totalValue');
        this.houseReveal = document.getElementById('houseReveal');
        this.houseImage = document.getElementById('houseImage');
        this.houseName = document.getElementById('houseName');
        this.houseRarity = document.getElementById('houseRarity');
        this.schoolButtons = document.querySelectorAll('.school-button');
        this.schoolSelection = document.getElementById('schoolSelection');
        this.diceRolling = document.getElementById('diceRolling');
        this.chosenSchool = document.getElementById('chosenSchool');

        // School selection
        if (this.schoolButtons) {
            this.schoolButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const school = e.currentTarget.getAttribute('data-school');
                    this.selectSchool(school);
                });
            });
        }

        // Roll button
        if (this.rollButton) {
            this.rollButton.addEventListener('click', () => this.rollDice());
        }

        // Roll again button
        if (this.rollAgainButton) {
            this.rollAgainButton.addEventListener('click', () => this.resetGame());
        }
    },

    selectSchool(school) {
        this.selectedSchool = school;
        
        // Hide school selection, show dice rolling
        if (this.schoolSelection) this.schoolSelection.style.display = 'none';
        if (this.diceRolling) this.diceRolling.style.display = 'block';
        if (this.chosenSchool) this.chosenSchool.textContent = school.toUpperCase();
        
        // Set theme color based on school
        this.setSchoolTheme(school);
        
        // Create dice
        this.createDice();
    },

    setSchoolTheme(school) {
        const root = document.documentElement;
        if (school === 'anarchy') {
            root.style.setProperty('--school-color', '#ff8c42'); // Orange
        } else if (school === 'mischief') {
            root.style.setProperty('--school-color', '#4287f5'); // Blue
        } else if (school === 'luck') {
            root.style.setProperty('--school-color', '#42f554'); // Green
        }
    },

    createDice() {
        if (!this.diceDisplay) return;
        this.diceDisplay.innerHTML = '';
        for (let i = 0; i < 66; i++) {
            const die = document.createElement('div');
            die.className = 'die';
            die.textContent = '?';
            die.id = `die-${i}`;
            this.diceDisplay.appendChild(die);
        }
    },

    // Core dice rolling with school weighting
    rollWeightedDie(weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < weights.length; i++) {
            if (random < weights[i]) {
                return i + 1; // Return 1-6
            }
            random -= weights[i];
        }
        return 6;
    },

    rollAnarchy() {
        // Heavily weighted toward commons to match 63% supply
        // [1:3x, 2:4x, 3:4x, 4:2x, 5:1x, 6:1x]
        // This produces ~48% Havoc, ~18% Misfits (matches your 45.7% + 17.7% supply)
        const weights = [3, 4, 4, 2, 1, 1];
        return this.rollWeightedDie(weights);
    },

    rollMischief() {
        // Balanced toward middle - still 50% commons, boosts uncommon
        // [1:2x, 2:3x, 3:4x, 4:3x, 5:2x, 6:1x]
        // Produces ~35% Havoc, ~15% Misfits, higher uncommon %
        // WARNING: This will deplete Clay (3) and Royal (2) faster!
        const weights = [2, 3, 4, 3, 2, 1];
        return this.rollWeightedDie(weights);
    },

    rollLuck() {
        // Balanced with high bias - still 32% commons, 30% rares
        // [1:1x, 2:2x, 3:3x, 4:4x, 5:3x, 6:2x]
        // Produces ~22% Havoc, ~10% Misfits, much higher rare %
        // Gold (1 NFT): ~1.8% chance with Luck (BEST ODDS!)
        // CRITICAL WARNING: Gold (1), Royal (2), Clay (3), Hellish (3) will deplete FAST!
        const weights = [1, 2, 3, 4, 3, 2];
        return this.rollWeightedDie(weights);
    },

    getSingleDieRoll() {
        if (this.selectedSchool === 'anarchy') {
            return this.rollAnarchy();
        } else if (this.selectedSchool === 'mischief') {
            return this.rollMischief();
        } else if (this.selectedSchool === 'luck') {
            return this.rollLuck();
        }
        return this.rollAnarchy(); // Default
    },

    rollDice() {
        this.rollButton.disabled = true;
        this.houseReveal.style.display = 'none';
        
        const dice = document.querySelectorAll('.die');
        const rolls = [];
        
        // Animate and roll each die with school weighting
        dice.forEach((die, index) => {
            die.classList.add('rolling');
            
            setTimeout(() => {
                const roll = this.getSingleDieRoll(); // Use weighted roll based on school
                rolls.push(roll);
                die.textContent = roll;
                die.classList.remove('rolling');
                
                // Calculate total after all dice are rolled
                if (index === 65) {
                    setTimeout(() => {
                        this.calculateTotal(rolls);
                    }, 500);
                }
            }, index * 30); // Stagger the rolls
        });
    },

    calculateTotal(rolls) {
        let total = rolls.reduce((sum, roll) => sum + roll, 0);
        
        // Cap at 394 (Gold max) since Death still has 0 supply
        if (total > 394) {
            total = 394;
        }
        
        // Animate the total counting up
        let currentTotal = 0;
        const increment = Math.ceil(total / 50);
        const counter = setInterval(() => {
            currentTotal += increment;
            if (currentTotal >= total) {
                currentTotal = total;
                clearInterval(counter);
                setTimeout(() => {
                    this.revealHouse(total);
                }, 500);
            }
            this.totalValue.textContent = currentTotal;
        }, 20);
    },

    revealHouse(total) {
        // Determine which house based on total
        let houseName = '';
        for (const [name, data] of Object.entries(this.houseData)) {
            if (total >= data.min && total <= data.max) {
                houseName = name;
                this.houseImage.src = data.image;
                this.houseImage.alt = name;
                this.houseName.textContent = `House of ${name.charAt(0).toUpperCase() + name.slice(1)}`;
                this.houseRarity.textContent = data.rarity;
                this.houseRarity.className = `rarity-badge ${data.class}`;
                break;
            }
        }
        
        // Show the reveal
        this.houseReveal.style.display = 'block';
        this.rollButton.disabled = false;
    },

    resetGame() {
        this.houseReveal.style.display = 'none';
        this.totalValue.textContent = '0';
        this.selectedSchool = null;
        
        // Back to school selection
        if (this.schoolSelection) this.schoolSelection.style.display = 'block';
        if (this.diceRolling) this.diceRolling.style.display = 'none';
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => diceRoller.init());
} else {
    diceRoller.init();
}
