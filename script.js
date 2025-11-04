let selectedSchool = '';

const houseData = {
    'House of Havoc': { min: 66, max: 175, image: 'havoc.gif', rarity: 'COMMON', class: 'common-badge' },
    'House of Misfits': { min: 176, max: 230, image: 'misfit.gif', rarity: 'COMMON', class: 'common-badge' },
    'House of Frog': { min: 231, max: 263, image: 'frog.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Theory': { min: 264, max: 290, image: 'theory.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Spectrum': { min: 291, max: 312, image: 'spectrum.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Clay': { min: 313, max: 329, image: 'clay.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Stencil': { min: 330, max: 345, image: 'stencil.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Royal': { min: 346, max: 356, image: 'royal.gif', rarity: 'RARE', class: 'rare-badge' },
    'House of Shadows': { min: 357, max: 367, image: 'shadow.gif', rarity: 'RARE', class: 'rare-badge' },
    'House of Hellish': { min: 368, max: 378, image: 'hellish.gif', rarity: 'RARE', class: 'rare-badge' },
    'House of Hologram': { min: 379, max: 389, image: 'hologram.gif', rarity: 'ULTRA RARE', class: 'ultra-rare-badge' },
    'House of Gold': { min: 390, max: 394, image: 'gold.gif', rarity: 'ULTRA RARE', class: 'ultra-rare-badge' },
    'House of Death': { min: 395, max: 396, image: 'winionswhat.gif', rarity: 'MYTHIC', class: 'mythic-badge' }
};

// DOM Elements
const schoolButtons = document.querySelectorAll('.school-button');
const schoolSelection = document.getElementById('schoolSelection');
const diceRolling = document.getElementById('diceRolling');
const chosenSchoolSpan = document.getElementById('chosenSchool');
const rollButton = document.getElementById('rollButton');
const closeButton = document.getElementById('closeButton');
const diceDisplay = document.getElementById('diceDisplay');
const totalValue = document.getElementById('totalValue');
const modal = document.getElementById('modal');
const housePlaceholder = document.getElementById('housePlaceholder');
const houseName = document.getElementById('houseName');
const houseRarity = document.getElementById('houseRarity');
const rollTotal = document.getElementById('rollTotal');

// School Selection
schoolButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedSchool = button.dataset.school;
        
        // Update the chosen school display
        chosenSchoolSpan.textContent = selectedSchool.toUpperCase();
        
        // Transition to dice rolling screen
        schoolSelection.style.display = 'none';
        diceRolling.style.display = 'block';
        
        // Initialize dice
        createDice();
    });
});

// Create 66 dice
function createDice() {
    diceDisplay.innerHTML = '';
    for (let i = 0; i < 66; i++) {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = '?';
        diceDisplay.appendChild(die);
    }
}

// Roll all 66 dice
function rollDice() {
    rollButton.disabled = true;
    modal.classList.remove('show');
    
    const dice = document.querySelectorAll('.die');
    const rolls = [];
    
    dice.forEach((die, index) => {
        die.classList.add('rolling');
        
        setTimeout(() => {
            const roll = Math.floor(Math.random() * 6) + 1;
            rolls.push(roll);
            die.textContent = roll;
            die.classList.remove('rolling');
            
            if (index === 65) {
                setTimeout(() => {
                    calculateTotal(rolls);
                }, 500);
            }
        }, index * 30);
    });
}

// Calculate total and animate counter
function calculateTotal(rolls) {
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    
    let currentTotal = 0;
    const increment = Math.ceil(total / 50);
    const counter = setInterval(() => {
        currentTotal += increment;
        if (currentTotal >= total) {
            currentTotal = total;
            clearInterval(counter);
            setTimeout(() => {
                revealHouse(total);
            }, 800);
        }
        totalValue.textContent = currentTotal;
    }, 20);
}

// Reveal which house based on total
function revealHouse(total) {
    for (const [name, data] of Object.entries(houseData)) {
        if (total >= data.min && total <= data.max) {
            // Check if image exists, otherwise show text placeholder
            const img = new Image();
            img.onload = function() {
                housePlaceholder.innerHTML = `<img src="${data.image}" alt="${name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 10px;">`;
            };
            img.onerror = function() {
                housePlaceholder.textContent = data.image.split('.')[0].toUpperCase();
            };
            img.src = data.image;
            
            houseName.textContent = name;
            houseRarity.textContent = data.rarity;
            houseRarity.className = `rarity-badge ${data.class}`;
            rollTotal.textContent = total;
            
            // Add school info to modal
            const schoolInfo = document.createElement('p');
            schoolInfo.style.cssText = 'margin-top: 10px; font-size: 16px; color: #999;';
            schoolInfo.textContent = `School of ${selectedSchool.toUpperCase()}`;
            
            // Insert before rarity badge if not already there
            if (!document.querySelector('.school-info')) {
                schoolInfo.className = 'school-info';
                houseRarity.parentElement.insertBefore(schoolInfo, houseRarity);
            }
            
            break;
        }
    }
    
    modal.classList.add('show');
    rollButton.disabled = false;
}

// Reset game
function resetGame() {
    modal.classList.remove('show');
    
    // Remove school info if it exists
    const schoolInfo = document.querySelector('.school-info');
    if (schoolInfo) schoolInfo.remove();
    
    // Go back to school selection
    diceRolling.style.display = 'none';
    schoolSelection.style.display = 'block';
    totalValue.textContent = '0';
    selectedSchool = '';
}

// Event Listeners
if (rollButton) {
    rollButton.addEventListener('click', rollDice);
}
if (closeButton) {
    closeButton.addEventListener('click', resetGame);
}
