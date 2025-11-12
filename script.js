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

// House ranges from golden backup
const HOUSE_RANGES = {
    'House of Havoc': { min: 66, max: 99 },
    'House of Misfits': { min: 100, max: 132 },
    'House of Frog': { min: 133, max: 165 },
    'House of Theory': { min: 166, max: 198 },
    'House of Spectrum': { min: 199, max: 231 },
    'House of Clay': { min: 232, max: 264 },
    'House of Stencil': { min: 265, max: 297 },
    'House of Royal': { min: 298, max: 330 },
    'House of Shadows': { min: 331, max: 363 },
    'House of Hellish': { min: 364, max: 385 },
    'House of Hologram': { min: 386, max: 392 },
    'House of Gold': { min: 393, max: 395 },
    'House of Death': { min: 396, max: 396 }
};

// Helper function to get house from roll total
function getHouseFromRoll(total) {
    for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
        if (total >= range.min && total <= range.max) {
            return houseName;
        }
    }
    return 'Unknown House';
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

// 🔥 LOAD FOMO COUNTER (Total remaining Winions) - NO WALLET NEEDED!
async function loadFomoCounter(isAutoRefresh = false) {
    try {
        // Show refresh indicator if auto-refreshing
        const fomoCounter = document.getElementById('fomoCounter');
        if (isAutoRefresh && fomoCounter) {
            fomoCounter.style.opacity = '0.6';
            fomoCounter.innerHTML = `
                <div class="fomo-text" style="font-size: 18px;">
                    🔄 UPDATING...
                </div>
            `;
        }
        
        console.log('🔥 Loading FOMO counter...');
        
        // ✅ USE READ-ONLY PROVIDER - NO WALLET CONNECTION NEEDED!
        // This won't trigger any wallet popups
        const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
        
        const contractABI = [
            "function getHouseInventoryCount(string houseName) view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            contractABI,
            provider
        );
        
        // Sum up all houses
        let totalRemaining = 0;
        const houses = Object.keys(HOUSE_RANGES);
        
        for (const houseName of houses) {
            try {
                const count = await contract.getHouseInventoryCount(houseName);
                totalRemaining += Number(count.toString());
            } catch (error) {
                console.error(`Error loading ${houseName}:`, error.message);
            }
        }
        
        console.log(`✅ Total remaining: ${totalRemaining}/666`);
        
        // Update display
        if (fomoCounter) {
            fomoCounter.style.opacity = '1';
            fomoCounter.innerHTML = `
                <div class="fomo-text">
                    ONLY <span class="fomo-number">${totalRemaining}/666</span> REMAINING!
                </div>
            `;
            
            // Add last updated timestamp
            const timestamp = new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const timestampEl = document.createElement('div');
            timestampEl.style.cssText = 'font-size: 12px; color: #666; margin-top: 8px;';
            timestampEl.textContent = `Last updated: ${timestamp}`;
            fomoCounter.appendChild(timestampEl);
        }
        
        // Extra FOMO if low supply!
        if (totalRemaining < 100) {
            fomoCounter.style.borderColor = '#ff0000';
            fomoCounter.style.background = 'rgba(255, 0, 0, 0.2)';
            fomoCounter.style.animation = 'pulseFomo 1s ease-in-out infinite';
        } else if (totalRemaining < 200) {
            // Medium urgency for < 200
            fomoCounter.style.borderColor = '#ff6600';
            fomoCounter.style.background = 'rgba(255, 102, 0, 0.15)';
        }
        
        // Show confetti emoji if it dropped from last check
        if (isAutoRefresh && window.lastFomoCount && window.lastFomoCount > totalRemaining) {
            const dropped = window.lastFomoCount - totalRemaining;
            console.log(`🎉 Supply dropped by ${dropped}! Someone just minted!`);
            
            // Brief flash effect
            fomoCounter.style.animation = 'flashFomo 0.5s ease-in-out';
            setTimeout(() => {
                fomoCounter.style.animation = 'pulseFomo 2s ease-in-out infinite';
            }, 500);
        }
        
        // Store current count for next comparison
        window.lastFomoCount = totalRemaining;
        
    } catch (error) {
        console.error('Error loading FOMO counter:', error);
        const fomoCounter = document.getElementById('fomoCounter');
        if (fomoCounter) {
            fomoCounter.style.opacity = '1';
            fomoCounter.innerHTML = `
                <div class="fomo-text" style="font-size: 20px;">
                    LIMITED SUPPLY - CONNECT TO SEE REMAINING!
                </div>
            `;
        }
    }
}

// Load FOMO counter when page loads (NO WALLET NEEDED!)
window.addEventListener('load', () => {
    console.log('🚀 Page loaded, initializing FOMO counter...');
    
    // ✅ ALWAYS load FOMO counter - uses public RPC, no wallet needed!
    loadFomoCounter();
    
    // 🔥 AUTO-REFRESH EVERY 30 SECONDS
    setInterval(() => {
        console.log('🔄 Auto-refreshing FOMO counter...');
        loadFomoCounter(true); // Pass true to indicate it's an auto-refresh
    }, 30000); // 30 seconds
    
    console.log('✅ Auto-refresh enabled (every 30 seconds)');
});

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
        console.log('🔌 Attempting to connect wallet...');
        
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            console.error('❌ MetaMask not detected');
            alert('Please install MetaMask to use this app!\n\nVisit: https://metamask.io');
            return;
        }
        
        console.log('✅ MetaMask detected');
        
        // Check if already connected
        let accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length === 0) {
            // Request connection
            console.log('🔐 Requesting account access...');
            accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
        } else {
            console.log('✅ Already connected to:', accounts[0]);
        }
        
        userAddress = accounts[0];
        console.log('✅ User address:', userAddress);
        
        console.log('🔧 Initializing ethers provider...');
        provider = new ethers.BrowserProvider(window.ethereum);
        
        console.log('✍️ Getting signer...');
        signer = await provider.getSigner();
        
        console.log('📝 Initializing contract...');
        
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
        console.log('🌐 Checking network...');
        const network = await provider.getNetwork();
        console.log('📡 Connected to chain ID:', Number(network.chainId));
        
        if (Number(network.chainId) !== CONFIG.CHAIN_ID) {
            console.error(`❌ Wrong network! Expected ${CONFIG.CHAIN_ID}, got ${Number(network.chainId)}`);
            alert(`Please switch to ${CONFIG.NETWORK_NAME}`);
            return;
        }
        
        console.log('✅ Correct network!');
        
        // Check if distribution is active
        console.log('🔍 Checking if distribution is active...');
        const isActive = await distributionContract.distributionActive();
        console.log('📊 Distribution active:', isActive);
        
        if (!isActive) {
            console.error('❌ Distribution not active');
            alert('Distribution is not currently active. Please check back later!');
            return;
        }
        
        console.log('✅ Distribution is active!');
        
        // Load user data
        console.log('📥 Loading user rolls...');
        await loadUserRolls();
        
        console.log('💰 Loading prices...');
        await loadPrices();
        
        console.log('🔍 Checking for pending claims...');
        checkPendingClaim();
        
        console.log('🎉 Connection successful! Showing rolls screen...');
        
        // Show rolls screen
        showScreen('rollsScreen');
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        
        // Handle specific error codes
        if (error.code === 4001) {
            // User rejected the request
            showToast('Connection request rejected. Please approve in MetaMask to continue.', 'error');
        } else if (error.code === -32002) {
            // Request already pending
            showToast('Connection request already pending. Please check MetaMask.', 'info');
        } else {
            showToast('Error connecting wallet. Please try again.', 'error');
        }
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
    
    // Initialize dice display with cool spinning number
    createDiceDisplay();
}

// Initialize dice display with cool spinning number
function createDiceDisplay() {
    const diceDisplay = document.getElementById('diceDisplay');
    diceDisplay.innerHTML = '<div class="spinning-number" id="spinningNumber">0</div>';
    
    // Inject styles for spinning number
    if (!document.getElementById('spinningNumberStyles')) {
        const style = document.createElement('style');
        style.id = 'spinningNumberStyles';
        style.textContent = `
            .dice-display {
                position: relative;
                width: 100%;
                min-height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .spinning-number {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 180px;
                font-weight: 900;
                color: #ff1a1a;
                text-shadow: 0 0 40px rgba(255, 26, 26, 1),
                           0 0 80px rgba(255, 26, 26, 0.8),
                           0 0 120px rgba(255, 26, 26, 0.6);
                font-family: 'Arial Black', sans-serif;
                letter-spacing: -5px;
                margin: 0;
                padding: 0;
                line-height: 1;
            }
            
            .spinning-number.rolling {
                animation: spin3d 0.1s linear infinite;
            }
            
            .spinning-number.landing {
                animation: zoomLand 0.5s ease-out forwards;
            }
            
            @keyframes spin3d {
                0% { 
                    transform: translate(-50%, -50%) rotateX(0deg) scale(1);
                }
                100% { 
                    transform: translate(-50%, -50%) rotateX(360deg) scale(1.1);
                }
            }
            
            @keyframes zoomLand {
                0% { 
                    transform: translate(-50%, -50%) scale(1.3) rotateX(0deg);
                    text-shadow: 0 0 60px rgba(255, 26, 26, 1),
                               0 0 120px rgba(255, 26, 26, 0.9),
                               0 0 180px rgba(255, 26, 26, 0.7);
                }
                50% { 
                    transform: translate(-50%, -50%) scale(0.9);
                }
                100% { 
                    transform: translate(-50%, -50%) scale(1);
                    text-shadow: 0 0 40px rgba(255, 26, 26, 1),
                               0 0 80px rgba(255, 26, 26, 0.8),
                               0 0 120px rgba(255, 26, 26, 0.6);
                }
            }
            
            @media (max-width: 768px) {
                .spinning-number {
                    font-size: 120px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Roll dice with cool spinning animation
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
        // Disable roll button
        const rollButton = document.getElementById('rollButton');
        rollButton.disabled = true;
        rollButton.textContent = '🎲 ROLLING...';
        
        // Get the spinning number element
        const spinningNumber = document.getElementById('spinningNumber');
        spinningNumber.classList.add('rolling');
        
        // Generate target total (66-396)
        const targetTotal = Math.floor(Math.random() * 331) + 66;
        currentRollTotal = targetTotal;
        
        console.log('🎲 Rolling to target:', targetTotal);
        
        // Animate spinning through random numbers
        let elapsed = 0;
        const duration = 2000; // 2 seconds of spinning
        const interval = 50; // Update every 50ms
        
        const roller = setInterval(() => {
            const randomNum = Math.floor(Math.random() * 331) + 66;
            spinningNumber.textContent = randomNum;
            elapsed += interval;
            
            if (elapsed >= duration) {
                clearInterval(roller);
                
                // Landing animation
                spinningNumber.classList.remove('rolling');
                spinningNumber.classList.add('landing');
                spinningNumber.textContent = targetTotal;
                
                setTimeout(() => {
                    spinningNumber.classList.remove('landing');
                    
                    // Update total display
                    document.getElementById('totalValue').textContent = targetTotal;
                    
                    // Determine house
                    setTimeout(() => {
                        revealHouse(targetTotal);
                    }, 500);
                }, 500);
            }
        }, interval);
        
    } catch (error) {
        console.error('Error rolling dice:', error);
        showToast('Error rolling dice. Please try again.', 'error');
        
        const rollButton = document.getElementById('rollButton');
        rollButton.disabled = false;
        rollButton.textContent = '🎲 ROLL THE DICE 🎲';
    }
}

// Reveal the house based on roll total
function revealHouse(total) {
    currentHouseName = getHouseFromRoll(total);
    
    console.log('🏠 Assigned house:', currentHouseName);
    
    // Set pending claim
    hasPendingClaim = true;
    savePendingClaim(currentHouseName);
    
    // Show result
    document.getElementById('rolledHouseName').textContent = currentHouseName;
    document.getElementById('houseResult').style.display = 'block';
    
    // Disable roll button
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = true;
    rollButton.textContent = '⚠️ CLAIM YOUR WINION FIRST';
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
