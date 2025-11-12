// Winions Dice Roller - COMPLETE VERSION MATCHING HTML
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

// 🛡️ WRAP IN IIFE TO PREVENT DUPLICATE LOADING ERRORS
(function() {
    'use strict';

// AUDIO - Winions Theme (loops continuously)
const rollAudio = new Audio('Winions Theme.mp3');
rollAudio.volume = 0.5;
rollAudio.loop = true;

let provider;
let signer;
let userAddress;
let distributionContract;
let currentSchool = null;
let currentRollTotal = 0;
let currentHouseName = '';
let hasPendingClaim = false;

// Contract Configuration
const CONFIG = {
    DISTRIBUTION_CONTRACT: "0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7",
    WINIONS_NFT_CONTRACT: "0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733",
    CHAIN_ID: 1,
    NETWORK_NAME: "Ethereum Mainnet"
};

// 🎲 WEIGHTED SCHOOL-SPECIFIC HOUSE RANGES

// 🔥 ANARCHY - Boosts: Hellish, Frog, Shadows
const ANARCHY_RANGES = {
    'House of Havoc': { min: 66, max: 250 },
    'House of Misfits': { min: 251, max: 313 },
    'House of Frog': { min: 314, max: 333 },
    'House of Theory': { min: 334, max: 339 },
    'House of Spectrum': { min: 340, max: 345 },
    'House of Clay': { min: 346, max: 348 },
    'House of Stencil': { min: 349, max: 354 },
    'House of Shadows': { min: 355, max: 369 },
    'House of Hellish': { min: 370, max: 379 },
    'House of Hologram': { min: 380, max: 385 },
    'House of Gold': { min: 386, max: 396 }
};

// 🎨 MISCHIEF - Boosts: Clay, Spectrum, Gold
const MISCHIEF_RANGES = {
    'House of Havoc': { min: 66, max: 250 },
    'House of Misfits': { min: 251, max: 313 },
    'House of Frog': { min: 314, max: 319 },
    'House of Theory': { min: 320, max: 325 },
    'House of Spectrum': { min: 326, max: 345 },
    'House of Clay': { min: 346, max: 360 },
    'House of Stencil': { min: 361, max: 366 },
    'House of Shadows': { min: 367, max: 372 },
    'House of Hellish': { min: 373, max: 375 },
    'House of Hologram': { min: 376, max: 381 },
    'House of Gold': { min: 382, max: 396 }
};

// 🍀 LUCK - Boosts: Hologram, Stencil, Theory
const LUCK_RANGES = {
    'House of Havoc': { min: 66, max: 250 },
    'House of Misfits': { min: 251, max: 313 },
    'House of Frog': { min: 314, max: 319 },
    'House of Theory': { min: 320, max: 334 },
    'House of Spectrum': { min: 335, max: 340 },
    'House of Clay': { min: 341, max: 343 },
    'House of Stencil': { min: 344, max: 363 },
    'House of Shadows': { min: 364, max: 369 },
    'House of Hellish': { min: 370, max: 372 },
    'House of Hologram': { min: 373, max: 382 },
    'House of Gold': { min: 383, max: 396 }
};

// Helper function to get house from roll total
function getHouseFromRoll(rollTotal) {
    let ranges;
    
    if (currentSchool === 'anarchy') {
        ranges = ANARCHY_RANGES;
    } else if (currentSchool === 'mischief') {
        ranges = MISCHIEF_RANGES;
    } else if (currentSchool === 'luck') {
        ranges = LUCK_RANGES;
    } else {
        ranges = ANARCHY_RANGES;
    }
    
    for (const [house, range] of Object.entries(ranges)) {
        if (rollTotal >= range.min && rollTotal <= range.max) {
            return house;
        }
    }
    
    return null;
}

// Generate weighted dice rolls
function generateSmartDiceRolls() {
    const dice = [];
    const weightedFaces = [1, 2, 2, 3, 3, 4];
    
    for (let i = 0; i < 66; i++) {
        const randomIndex = Math.floor(Math.random() * weightedFaces.length);
        dice.push(weightedFaces[randomIndex]);
    }
    
    return dice;
}

// Version check
const APP_VERSION = 4;

function checkVersion() {
    const savedVersion = localStorage.getItem('winions_app_version');
    
    if (savedVersion !== String(APP_VERSION)) {
        console.log('🔄 App version updated, clearing old data');
        localStorage.removeItem('winions_pending_claim');
        localStorage.removeItem('winions_roll_data');
        localStorage.setItem('winions_app_version', String(APP_VERSION));
    }
}

checkVersion();

// Screen Navigation
function showScreen(screenId) {
    const screens = ['walletScreen', 'rollsScreen', 'schoolScreen', 'diceScreen'];
    screens.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(screenId).style.display = 'block';
}

// Wallet Connection
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask to use this app!');
            return;
        }

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        userAddress = accounts[0];
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        // Initialize contract
        const contractABI = [
            "function distributionActive() view returns (bool)",
            "function getUserRolls(address user) view returns (uint256 freeRolls, uint256 paidRolls)",
            "function getPrices() view returns (uint256 singlePrice, uint256 threePrice, uint256 fivePrice)",
            "function purchaseRolls(uint256 rollType) payable",
            "function rollForWinion(string school) returns (uint256 rollTotal)",
            "function claimWinion() returns (uint256 tokenId)",
            "function getAvailableHouses(uint256 rollTotal) view returns (string[] memory houses)"
        ];
        
        distributionContract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            contractABI,
            signer
        );
        
        // Check network
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== CONFIG.CHAIN_ID) {
            alert(`Please switch to ${CONFIG.NETWORK_NAME}`);
            return;
        }
        
        // Check if distribution is active
        const isActive = await distributionContract.distributionActive();
        if (!isActive) {
            alert('Distribution is not currently active. Please check back later!');
            return;
        }
        
        // Load user data
        await loadUserRolls();
        await loadPrices();
        
        // Check for pending claim
        checkPendingClaim();
        
        // Show rolls screen
        showScreen('rollsScreen');
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Error connecting wallet. Please try again.');
    }
}

// Load user rolls
async function loadUserRolls() {
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        const free = Number(freeRolls);
        const paid = Number(paidRolls);
        
        document.getElementById('freeRollsCount').textContent = free;
        document.getElementById('paidRollsCount').textContent = paid;
        
    } catch (error) {
        console.error('Error loading rolls:', error);
    }
}

// Load prices
async function loadPrices() {
    try {
        const [single, three, five] = await distributionContract.getPrices();
        
        document.getElementById('price1').textContent = ethers.formatEther(single) + ' ETH';
        document.getElementById('price3').textContent = ethers.formatEther(three) + ' ETH';
        document.getElementById('price5').textContent = ethers.formatEther(five) + ' ETH';
        
    } catch (error) {
        console.error('Error loading prices:', error);
    }
}

// Purchase rolls
async function purchaseRolls(rollType) {
    try {
        const [single, three, five] = await distributionContract.getPrices();
        let price;
        
        if (rollType === 1) price = single;
        else if (rollType === 3) price = three;
        else if (rollType === 5) price = five;
        
        const tx = await distributionContract.purchaseRolls(rollType, { value: price });
        
        showToast('Transaction sent! Waiting for confirmation...', 'info');
        
        await tx.wait();
        
        showToast('Rolls purchased successfully!', 'success');
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Error purchasing rolls:', error);
        showToast('Error purchasing rolls. Please try again.', 'error');
    }
}

// Track school selection
function selectSchool(school) {
    currentSchool = school;
    
    // Track in localStorage for analytics
    const storageKey = `winions_school_${school}`;
    const currentCount = parseInt(localStorage.getItem(storageKey) || '0');
    localStorage.setItem(storageKey, String(currentCount + 1));
    
    console.log(`🎲 School selected: ${school} (Total: ${currentCount + 1})`);
    
    // Update UI
    document.getElementById('chosenSchool').textContent = school.toUpperCase();
    
    // Show dice screen
    showScreen('diceScreen');
    
    // Initialize dice display
    initializeDiceDisplay();
}

// Initialize dice display
function initializeDiceDisplay() {
    const display = document.getElementById('diceDisplay');
    display.innerHTML = '';
    
    // Create 66 placeholder dice
    for (let i = 0; i < 66; i++) {
        const die = document.createElement('div');
        die.className = 'die-placeholder';
        die.textContent = '?';
        display.appendChild(die);
    }
}

// Roll dice animation
async function rollDice() {
    // Play audio
    rollAudio.currentTime = 0;
    rollAudio.play().catch(err => console.log('Audio blocked:', err));
    
    // Check for pending claim
    if (hasPendingClaim) {
        showToast('You must claim your Winion before rolling again!', 'error');
        return;
    }
    
    if (!currentSchool) {
        showToast('Please select a school first!', 'error');
        return;
    }
    
    try {
        // Generate dice
        const diceRolls = generateSmartDiceRolls();
        currentRollTotal = diceRolls.reduce((sum, val) => sum + val, 0);
        
        console.log('🎲 Generated dice:', diceRolls);
        console.log('📊 Roll total:', currentRollTotal);
        
        // Disable roll button
        const rollBtn = document.getElementById('rollButton');
        rollBtn.disabled = true;
        rollBtn.textContent = '🎲 ROLLING...';
        
        // Animate dice
        await animateDiceRoll(diceRolls);
        
        // Update total
        document.getElementById('totalValue').textContent = currentRollTotal;
        
        // Determine house
        currentHouseName = getHouseFromRoll(currentRollTotal);
        
        if (!currentHouseName) {
            showToast('Error determining house. Please try again.', 'error');
            rollBtn.disabled = false;
            rollBtn.textContent = '🎲 ROLL THE DICE 🎲';
            return;
        }
        
        console.log('🏠 Assigned house:', currentHouseName);
        
        // Set pending claim
        hasPendingClaim = true;
        savePendingClaim(currentHouseName);
        
        // Show result
        document.getElementById('rolledHouseName').textContent = currentHouseName;
        document.getElementById('houseResult').style.display = 'block';
        
        // Re-enable button for next roll
        rollBtn.disabled = false;
        rollBtn.textContent = '🎲 ROLL THE DICE 🎲';
        
    } catch (error) {
        console.error('Error rolling dice:', error);
        showToast('Error rolling dice. Please try again.', 'error');
        
        const rollBtn = document.getElementById('rollButton');
        rollBtn.disabled = false;
        rollBtn.textContent = '🎲 ROLL THE DICE 🎲';
    }
}

// Animate dice roll
async function animateDiceRoll(diceRolls) {
    const display = document.getElementById('diceDisplay');
    const dice = display.querySelectorAll('.die-placeholder');
    
    // Animate each die
    for (let i = 0; i < diceRolls.length; i++) {
        setTimeout(() => {
            dice[i].textContent = diceRolls[i];
            dice[i].classList.add('rolled');
        }, i * 15);
    }
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 2000));
}

// Save pending claim
function savePendingClaim(houseName) {
    const claimData = {
        user: userAddress,
        houseName: houseName,
        school: currentSchool,
        rollTotal: currentRollTotal,
        timestamp: Date.now()
    };
    
    localStorage.setItem('winions_pending_claim', JSON.stringify(claimData));
    console.log('💾 Saved pending claim:', claimData);
}

// Check for pending claim
function checkPendingClaim() {
    const pendingData = localStorage.getItem('winions_pending_claim');
    
    if (pendingData) {
        try {
            const data = JSON.parse(pendingData);
            
            if (data.user.toLowerCase() === userAddress.toLowerCase()) {
                hasPendingClaim = true;
                currentHouseName = data.houseName;
                currentSchool = data.school;
                currentRollTotal = data.rollTotal;
                
                console.log('📋 Restored pending claim:', data);
                
                // Show the dice screen with result
                showScreen('diceScreen');
                document.getElementById('chosenSchool').textContent = currentSchool.toUpperCase();
                document.getElementById('totalValue').textContent = currentRollTotal;
                document.getElementById('rolledHouseName').textContent = currentHouseName;
                document.getElementById('houseResult').style.display = 'block';
            } else {
                localStorage.removeItem('winions_pending_claim');
            }
        } catch (error) {
            console.error('Error restoring pending claim:', error);
            localStorage.removeItem('winions_pending_claim');
        }
    }
}

// Claim Winion
async function claimWinion() {
    try {
        showToast('Claiming your Winion...', 'info');
        
        const tx = await distributionContract.claimWinion();
        
        showToast('Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        // Parse event to get token ID
        const claimEvent = receipt.logs.find(log => {
            try {
                const parsed = distributionContract.interface.parseLog(log);
                return parsed.name === 'WinionClaimed';
            } catch {
                return false;
            }
        });
        
        let tokenId = 'Unknown';
        if (claimEvent) {
            const parsed = distributionContract.interface.parseLog(claimEvent);
            tokenId = parsed.args.tokenId.toString();
        }
        
        // Clear pending claim
        hasPendingClaim = false;
        localStorage.removeItem('winions_pending_claim');
        
        // Show success modal
        document.getElementById('claimedHouseName').textContent = currentHouseName;
        document.getElementById('claimedTokenId').textContent = tokenId;
        document.getElementById('claimedRollTotal').textContent = currentRollTotal;
        document.getElementById('etherscanLink').href = `https://etherscan.io/tx/${receipt.hash}`;
        
        // Set NFT image (if you have a base URL)
        // document.getElementById('claimedNFTImage').src = `https://yourcdn.com/winions/${tokenId}.png`;
        
        document.getElementById('successModal').style.display = 'flex';
        
        showToast(`Winion #${tokenId} claimed successfully!`, 'success');
        
        // Refresh rolls
        await loadUserRolls();
        
    } catch (error) {
        console.error('Error claiming Winion:', error);
        showToast('Error claiming Winion. Please try again.', 'error');
    }
}

// Reset to rolls screen
function resetToRollsScreen() {
    document.getElementById('successModal').style.display = 'none';
    
    // Reset state
    currentSchool = null;
    currentRollTotal = 0;
    currentHouseName = '';
    
    // Hide house result
    document.getElementById('houseResult').style.display = 'none';
    
    // Show rolls screen
    showScreen('rollsScreen');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Account change listener
if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => location.reload());
    window.ethereum.on('chainChanged', () => location.reload());
}

// Prevent page refresh during pending claim
window.addEventListener('beforeunload', (e) => {
    if (hasPendingClaim) {
        e.preventDefault();
        e.returnValue = 'You have an unclaimed Winion! Are you sure you want to leave?';
        return e.returnValue;
    }
});

// 🌍 EXPOSE FUNCTIONS GLOBALLY FOR HTML
window.connectWallet = connectWallet;
window.purchaseRolls = purchaseRolls;
window.selectSchool = selectSchool;
window.rollDice = rollDice;
window.claimWinion = claimWinion;
window.resetToRollsScreen = resetToRollsScreen;

// 🔌 EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    // Connect button
    const connectBtn = document.getElementById('connectButton');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
        console.log('✅ Connect button listener attached');
    }
    
    // Continue to school button
    const continueBtn = document.getElementById('continueToSchool');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => showScreen('schoolScreen'));
    }
    
    // School buttons
    const schoolButtons = document.querySelectorAll('.school-button');
    schoolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const school = btn.getAttribute('data-school');
            selectSchool(school);
        });
    });
    
    // Roll button
    const rollBtn = document.getElementById('rollButton');
    if (rollBtn) {
        rollBtn.addEventListener('click', rollDice);
    }
    
    // Claim button
    const claimBtn = document.getElementById('claimButton');
    if (claimBtn) {
        claimBtn.addEventListener('click', claimWinion);
    }
});

console.log('✅ Winions Dice Roller Loaded (v4 - HTML Matched)');
console.log('🎲 Weighted School System Active');
console.log('📊 School Analytics Tracking Enabled');

})(); // 🛡️ END OF IIFE WRAPPER
