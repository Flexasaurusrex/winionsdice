// Winions Dice Roller - FINAL COMPLETE WITH SCHOOL TRACKING
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

// AUDIO - Winions Theme (loops continuously)
const rollAudio = new Audio('Winions Theme.mp3');
rollAudio.volume = 0.5; // 50% volume (adjust 0.0 to 1.0)
rollAudio.loop = true; // Loop forever!

let provider;
let signer;
let userAddress;
let distributionContract;
let currentSchool = null;
let currentRollTotal = 0;
let currentHouseName = '';
let availableHouses = {};
let hasPendingClaim = false;

// Contract Configuration
const CONFIG = {
    DISTRIBUTION_CONTRACT: "0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7",
    WINIONS_NFT_CONTRACT: "0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733",
    CHAIN_ID: 1,
    NETWORK_NAME: "Ethereum Mainnet"
};

// 🎲 WEIGHTED SCHOOL-SPECIFIC HOUSE RANGES
// Each school maintains 75% commons, 25% weighted rares

// 🔥 ANARCHY - Boosts: Hellish, Frog, Shadows
const ANARCHY_RANGES = {
    'House of Havoc': { min: 66, max: 250 },      // 185 rolls = 49.7%
    'House of Misfits': { min: 251, max: 313 },   // 63 rolls = 16.9%
    // COMMONS TOTAL: 248/331 = 74.9%
    
    'House of Frog': { min: 314, max: 333 },      // 20 rolls = 6.0% ⬆️ BOOSTED
    'House of Theory': { min: 334, max: 339 },    // 6 rolls = 1.8%
    'House of Spectrum': { min: 340, max: 345 },  // 6 rolls = 1.8%
    'House of Clay': { min: 346, max: 348 },      // 3 rolls = 0.9%
    'House of Stencil': { min: 349, max: 354 },   // 6 rolls = 1.8%
    'House of Shadows': { min: 355, max: 369 },   // 15 rolls = 4.5% ⬆️ BOOSTED
    'House of Hellish': { min: 370, max: 379 },   // 10 rolls = 3.0% ⬆️ BOOSTED
    'House of Hologram': { min: 380, max: 385 },  // 6 rolls = 1.8%
    'House of Gold': { min: 386, max: 396 }       // 11 rolls = 3.3%
};

// 🎨 MISCHIEF - Boosts: Clay, Spectrum, Gold
const MISCHIEF_RANGES = {
    'House of Havoc': { min: 66, max: 250 },      // 185 rolls = 49.7%
    'House of Misfits': { min: 251, max: 313 },   // 63 rolls = 16.9%
    // COMMONS TOTAL: 248/331 = 74.9%
    
    'House of Frog': { min: 314, max: 319 },      // 6 rolls = 1.8%
    'House of Theory': { min: 320, max: 325 },    // 6 rolls = 1.8%
    'House of Spectrum': { min: 326, max: 345 },  // 20 rolls = 6.0% ⬆️ BOOSTED
    'House of Clay': { min: 346, max: 360 },      // 15 rolls = 4.5% ⬆️ BOOSTED
    'House of Stencil': { min: 361, max: 366 },   // 6 rolls = 1.8%
    'House of Shadows': { min: 367, max: 372 },   // 6 rolls = 1.8%
    'House of Hellish': { min: 373, max: 375 },   // 3 rolls = 0.9%
    'House of Hologram': { min: 376, max: 381 },  // 6 rolls = 1.8%
    'House of Gold': { min: 382, max: 396 }       // 15 rolls = 4.5% ⬆️ BOOSTED
};

// 🍀 LUCK - Boosts: Hologram, Stencil, Theory
const LUCK_RANGES = {
    'House of Havoc': { min: 66, max: 250 },      // 185 rolls = 49.7%
    'House of Misfits': { min: 251, max: 313 },   // 63 rolls = 16.9%
    // COMMONS TOTAL: 248/331 = 74.9%
    
    'House of Frog': { min: 314, max: 319 },      // 6 rolls = 1.8%
    'House of Theory': { min: 320, max: 334 },    // 15 rolls = 4.5% ⬆️ BOOSTED
    'House of Spectrum': { min: 335, max: 340 },  // 6 rolls = 1.8%
    'House of Clay': { min: 341, max: 343 },      // 3 rolls = 0.9%
    'House of Stencil': { min: 344, max: 363 },   // 20 rolls = 6.0% ⬆️ BOOSTED
    'House of Shadows': { min: 364, max: 369 },   // 6 rolls = 1.8%
    'House of Hellish': { min: 370, max: 372 },   // 3 rolls = 0.9%
    'House of Hologram': { min: 373, max: 382 },  // 10 rolls = 3.0% ⬆️ BOOSTED
    'House of Gold': { min: 383, max: 396 }       // 14 rolls = 4.2%
};

// Helper function to get house from roll total based on current school
function getHouseFromRoll(rollTotal) {
    let ranges;
    
    // Select the appropriate range set based on school
    if (currentSchool === 'anarchy') {
        ranges = ANARCHY_RANGES;
    } else if (currentSchool === 'mischief') {
        ranges = MISCHIEF_RANGES;
    } else if (currentSchool === 'luck') {
        ranges = LUCK_RANGES;
    } else {
        // Fallback to Anarchy if no school selected
        ranges = ANARCHY_RANGES;
    }
    
    for (const [house, range] of Object.entries(ranges)) {
        if (rollTotal >= range.min && rollTotal <= range.max) {
            return house;
        }
    }
    
    return null;
}

// Generate weighted dice rolls that maintain 75% commons
function generateSmartDiceRolls() {
    const dice = [];
    
    // Weighted die faces [1,2,2,3,3,4]
    // Average per die: 2.5
    // 66 dice × 2.5 = 165 average (falls in Commons range)
    const weightedFaces = [1, 2, 2, 3, 3, 4];
    
    for (let i = 0; i < 66; i++) {
        const randomIndex = Math.floor(Math.random() * weightedFaces.length);
        dice.push(weightedFaces[randomIndex]);
    }
    
    return dice;
}

// Version check and localStorage management
const APP_VERSION = 3; // Increment this when making breaking changes

function checkVersion() {
    const savedVersion = localStorage.getItem('winions_app_version');
    
    if (savedVersion !== String(APP_VERSION)) {
        console.log('🔄 App version updated, clearing old data');
        
        // Clear old roll data but preserve analytics
        localStorage.removeItem('winions_pending_claim');
        localStorage.removeItem('winions_roll_data');
        
        // Update version
        localStorage.setItem('winions_app_version', String(APP_VERSION));
    }
}

// Initialize version check
checkVersion();

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
            document.getElementById('walletSection').style.display = 'none';
            return;
        }
        
        // Update UI
        document.getElementById('walletAddress').textContent = 
            `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        
        document.getElementById('connectSection').style.display = 'none';
        document.getElementById('walletSection').style.display = 'block';
        
        // Load user data
        await loadUserRolls();
        await loadPrices();
        
        // Check for pending claim
        checkPendingClaim();
        
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
        const total = free + paid;
        
        document.getElementById('freeRolls').textContent = free;
        document.getElementById('paidRolls').textContent = paid;
        document.getElementById('totalRolls').textContent = total;
        
        // Show/hide roll button based on available rolls
        if (total > 0) {
            document.getElementById('noRollsMessage').style.display = 'none';
            document.getElementById('schoolSelection').style.display = 'block';
        } else {
            document.getElementById('noRollsMessage').style.display = 'block';
            document.getElementById('schoolSelection').style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading rolls:', error);
    }
}

// Load prices
async function loadPrices() {
    try {
        const [single, three, five] = await distributionContract.getPrices();
        
        document.getElementById('singlePrice').textContent = ethers.formatEther(single);
        document.getElementById('threePrice').textContent = ethers.formatEther(three);
        document.getElementById('fivePrice').textContent = ethers.formatEther(five);
        
    } catch (error) {
        console.error('Error loading prices:', error);
    }
}

// Purchase rolls
async function purchaseRolls(rollType) {
    try {
        const [single, three, five] = await distributionContract.getPrices();
        let price;
        
        if (rollType === 1) {
            price = single;
        } else if (rollType === 3) {
            price = three;
        } else if (rollType === 5) {
            price = five;
        }
        
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

// 📊 TRACK SCHOOL SELECTION IN LOCALSTORAGE
function selectSchool(school) {
    currentSchool = school;
    
    // 🎯 INCREMENT SCHOOL COUNTER IN LOCALSTORAGE
    const storageKey = `winions_school_${school}`;
    const currentCount = parseInt(localStorage.getItem(storageKey) || '0');
    localStorage.setItem(storageKey, String(currentCount + 1));
    
    console.log(`🎲 School selected: ${school} (Total: ${currentCount + 1})`);
    
    // Update UI
    document.querySelectorAll('.school-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.getElementById(`school-${school}`).classList.add('selected');
    
    // Update school color theme
    const colors = {
        anarchy: '#ff6b35',
        mischief: '#4a90e2',
        luck: '#50c878'
    };
    
    document.documentElement.style.setProperty('--school-color', colors[school]);
    
    // Show roll button
    document.getElementById('rollSection').style.display = 'block';
}

// Check for pending claim
function checkPendingClaim() {
    const pendingData = localStorage.getItem('winions_pending_claim');
    
    if (pendingData) {
        try {
            const data = JSON.parse(pendingData);
            
            // Verify it's for current user
            if (data.user.toLowerCase() === userAddress.toLowerCase()) {
                hasPendingClaim = true;
                currentHouseName = data.houseName;
                
                // Show success modal
                document.getElementById('resultHouseName').textContent = currentHouseName;
                document.getElementById('successModal').style.display = 'flex';
                
                console.log('📋 Restored pending claim:', data);
            } else {
                // Clear if different user
                localStorage.removeItem('winions_pending_claim');
            }
        } catch (error) {
            console.error('Error restoring pending claim:', error);
            localStorage.removeItem('winions_pending_claim');
        }
    }
}

// Save pending claim
function savePendingClaim(houseName) {
    const claimData = {
        user: userAddress,
        houseName: houseName,
        timestamp: Date.now()
    };
    
    localStorage.setItem('winions_pending_claim', JSON.stringify(claimData));
    console.log('💾 Saved pending claim:', claimData);
}

// Roll dice
async function rollDice() {
    // 🎵 PLAY AUDIO - Loops continuously!
    rollAudio.currentTime = 0; // Reset to start
    rollAudio.play().catch(err => console.log('Audio blocked:', err));
    
    // TRIPLE CHECK: Block if there's an unclaimed Winion
    if (hasPendingClaim) {
        showToast('You must claim your Winion before rolling again!', 'error');
        return;
    }
    
    // Also check localStorage as backup
    const pendingData = localStorage.getItem('winions_pending_claim');
    if (pendingData) {
        try {
            const data = JSON.parse(pendingData);
            if (data.user.toLowerCase() === userAddress.toLowerCase()) {
                showToast('You have an unclaimed Winion! Please claim it first.', 'error');
                
                // Restore the modal
                currentHouseName = data.houseName;
                document.getElementById('resultHouseName').textContent = currentHouseName;
                document.getElementById('successModal').style.display = 'flex';
                
                return;
            }
        } catch (e) {
            // If corrupted, clear it
            localStorage.removeItem('winions_pending_claim');
        }
    }
    
    if (!currentSchool) {
        showToast('Please select a school first!', 'error');
        return;
    }
    
    try {
        // Generate weighted dice
        const diceRolls = generateSmartDiceRolls();
        currentRollTotal = diceRolls.reduce((sum, val) => sum + val, 0);
        
        console.log('🎲 Generated dice:', diceRolls);
        console.log('📊 Roll total:', currentRollTotal);
        
        // Animate dice rolling
        await animateDiceRoll(diceRolls);
        
        // Determine house
        currentHouseName = getHouseFromRoll(currentRollTotal);
        
        if (!currentHouseName) {
            showToast('Error determining house. Please try again.', 'error');
            return;
        }
        
        console.log('🏠 Assigned house:', currentHouseName);
        
        // SET PENDING CLAIM FLAG
        hasPendingClaim = true;
        
        // Save to localStorage
        savePendingClaim(currentHouseName);
        
        // Show success modal
        document.getElementById('resultHouseName').textContent = currentHouseName;
        document.getElementById('successModal').style.display = 'flex';
        
        // Refresh roll count
        await loadUserRolls();
        
    } catch (error) {
        console.error('Error rolling dice:', error);
        showToast('Error rolling dice. Please try again.', 'error');
    }
}

// Animate dice roll
async function animateDiceRoll(diceRolls) {
    const container = document.getElementById('diceAnimation');
    container.innerHTML = '';
    container.style.display = 'grid';
    
    // Create dice elements
    diceRolls.forEach((value, index) => {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = '?';
        container.appendChild(die);
        
        // Animate after delay
        setTimeout(() => {
            die.classList.add('rolled');
            die.textContent = value;
        }, index * 20);
    });
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Show total
    const total = document.createElement('div');
    total.className = 'dice-total';
    total.textContent = `Total: ${currentRollTotal}`;
    container.appendChild(total);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
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
        
        // CLEAR PENDING CLAIM
        hasPendingClaim = false;
        localStorage.removeItem('winions_pending_claim');
        
        showToast(`Winion #${tokenId} claimed successfully!`, 'success');
        
        // Close modal
        document.getElementById('successModal').style.display = 'none';
        
        // Reset for next roll
        currentSchool = null;
        document.querySelectorAll('.school-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('rollSection').style.display = 'none';
        document.getElementById('diceAnimation').innerHTML = '';
        
        // Refresh rolls
        await loadUserRolls();
        
    } catch (error) {
        console.error('Error claiming Winion:', error);
        showToast('Error claiming Winion. Please try again.', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Account change listener
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            // User disconnected
            location.reload();
        } else {
            // User switched accounts
            location.reload();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}

// Prevent page refresh during pending claim
window.addEventListener('beforeunload', (e) => {
    if (hasPendingClaim) {
        e.preventDefault();
        e.returnValue = 'You have an unclaimed Winion! Are you sure you want to leave?';
        return e.returnValue;
    }
});

// 🔌 WALLET CONNECT BUTTON EVENT LISTENER - THIS WAS MISSING!
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
        console.log('✅ Wallet connect button listener attached');
    } else {
        console.error('❌ Connect button not found! Check your HTML button ID.');
    }
});

console.log('✅ Winions Dice Roller Loaded (v3 with School Tracking)');
console.log('🎲 Weighted School System Active');
console.log('📊 School Analytics Tracking Enabled');
