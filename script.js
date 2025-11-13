// Winions Dice Roller - COMPLETE WITH WEIGHTED SCHOOLS + VALIDATION
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

(function() {
    'use strict';

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

const CONFIG = {
    DISTRIBUTION_CONTRACT: "0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7",
    WINIONS_NFT_CONTRACT: "0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733",
    CHAIN_ID: 1,
    NETWORK_NAME: "Ethereum Mainnet"
};

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

// 🎲 WEIGHTED SCHOOL DISTRIBUTION SYSTEM
const SCHOOL_WEIGHTS = {
    anarchy: {
        commons: ['House of Havoc', 'House of Misfits', 'House of Royal'],
        commonsWeight: 75, // 75% chance
        boostedRares: {
            'House of Hellish': 3,
            'House of Frog': 6,
            'House of Shadows': 4.5
        },
        // Other rares split the remaining 11.5%
        otherRares: ['House of Theory', 'House of Spectrum', 'House of Clay', 
                     'House of Stencil', 'House of Hologram', 'House of Gold', 'House of Death']
    },
    mischief: {
        commons: ['House of Havoc', 'House of Misfits', 'House of Royal'],
        commonsWeight: 75,
        boostedRares: {
            'House of Clay': 4.5,
            'House of Spectrum': 6,
            'House of Gold': 3
        },
        otherRares: ['House of Theory', 'House of Frog', 'House of Shadows',
                     'House of Stencil', 'House of Hellish', 'House of Hologram', 'House of Death']
    },
    luck: {
        commons: ['House of Havoc', 'House of Misfits', 'House of Royal'],
        commonsWeight: 75,
        boostedRares: {
            'House of Hologram': 3,
            'House of Stencil': 6,
            'House of Theory': 4.5
        },
        otherRares: ['House of Frog', 'House of Shadows', 'House of Clay',
                     'House of Spectrum', 'House of Hellish', 'House of Gold', 'House of Death']
    }
};

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

// 🔥 FOMO COUNTER
async function loadFomoCounter(isAutoRefresh = false) {
    try {
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
        
        const provider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
        
        const contractABI = [
            "function getHouseInventoryCount(string houseName) view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            contractABI,
            provider
        );
        
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
        
        if (fomoCounter) {
            fomoCounter.style.opacity = '1';
            fomoCounter.innerHTML = `
                <div class="fomo-text">
                    ONLY <span class="fomo-number">${totalRemaining}/666</span> REMAINING!
                </div>
            `;
            
            const timestamp = new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const timestampEl = document.createElement('div');
            timestampEl.style.cssText = 'font-size: 12px; color: #666; margin-top: 8px;';
            timestampEl.textContent = `Last updated: ${timestamp}`;
            fomoCounter.appendChild(timestampEl);
        }
        
        if (totalRemaining < 100) {
            fomoCounter.style.borderColor = '#ff0000';
            fomoCounter.style.background = 'rgba(255, 0, 0, 0.2)';
            fomoCounter.style.animation = 'pulseFomo 1s ease-in-out infinite';
        } else if (totalRemaining < 200) {
            fomoCounter.style.borderColor = '#ff6600';
            fomoCounter.style.background = 'rgba(255, 102, 0, 0.15)';
        }
        
        if (isAutoRefresh && window.lastFomoCount && window.lastFomoCount > totalRemaining) {
            const dropped = window.lastFomoCount - totalRemaining;
            console.log(`🎉 Supply dropped by ${dropped}! Someone just minted!`);
            
            fomoCounter.style.animation = 'flashFomo 0.5s ease-in-out';
            setTimeout(() => {
                fomoCounter.style.animation = 'pulseFomo 2s ease-in-out infinite';
            }, 500);
        }
        
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

window.addEventListener('load', () => {
    console.log('🚀 Page loaded, initializing FOMO counter...');
    loadFomoCounter();
    
    setInterval(() => {
        console.log('🔄 Auto-refreshing FOMO counter...');
        loadFomoCounter(true);
    }, 30000);
    
    console.log('✅ Auto-refresh enabled (every 30 seconds)');
});

function showScreen(screenId) {
    const screens = ['walletScreen', 'rollsScreen', 'schoolScreen', 'diceScreen'];
    screens.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(screenId).style.display = 'block';
}

async function connectWallet() {
    try {
        console.log('🔌 Attempting to connect wallet...');
        
        if (typeof window.ethereum === 'undefined') {
            console.error('❌ MetaMask not detected');
            alert('Please install MetaMask to use this app!\n\nVisit: https://metamask.io');
            return;
        }
        
        console.log('✅ MetaMask detected');
        
        let accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length === 0) {
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
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        console.log('✍️ Getting signer...');
        signer = await provider.getSigner();
        
        console.log('📝 Initializing contract...');
        
        const contractABI = [
            "function distributionActive() view returns (bool)",
            "function getUserRolls(address user) view returns (uint256 freeRolls, uint256 paidRolls)",
            "function getPrices() view returns (uint256 singlePrice, uint256 threePrice, uint256 fivePrice)",
            "function purchaseRolls(uint256 rollType) payable",
            "function rollForWinion(string school) returns (uint256 rollTotal)",
            "function claimWinion(uint256 rollTotal, string houseName) returns (uint256 tokenId)",
            "function getAvailableHouses(uint256 rollTotal) view returns (string[] memory houses)",
            "event NFTDistributed(address indexed recipient, uint256 indexed tokenId, string houseName)"
        ];
        
        distributionContract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            contractABI,
            signer
        );
        
        console.log('🌐 Checking network...');
        const network = await provider.getNetwork();
        console.log('📡 Connected to chain ID:', Number(network.chainId));
        
        if (Number(network.chainId) !== CONFIG.CHAIN_ID) {
            console.error(`❌ Wrong network! Expected ${CONFIG.CHAIN_ID}, got ${Number(network.chainId)}`);
            alert(`Please switch to ${CONFIG.NETWORK_NAME}`);
            return;
        }
        
        console.log('✅ Correct network!');
        
        console.log('🔍 Checking if distribution is active...');
        const isActive = await distributionContract.distributionActive();
        console.log('📊 Distribution active:', isActive);
        
        if (!isActive) {
            console.error('❌ Distribution not active');
            alert('Distribution is not currently active. Please check back later!');
            return;
        }
        
        console.log('✅ Distribution is active!');
        
        console.log('📥 Loading user rolls...');
        await loadUserRolls();
        
        console.log('💰 Loading prices...');
        await loadPrices();
        
        console.log('🔍 Checking for pending claims...');
        checkPendingClaim();
        
        console.log('🎉 Connection successful! Showing rolls screen...');
        
        showScreen('rollsScreen');
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        
        if (error.code === 4001) {
            showToast('Connection request rejected. Please approve in MetaMask to continue.', 'error');
        } else if (error.code === -32002) {
            showToast('Connection request already pending. Please check MetaMask.', 'info');
        } else {
            showToast('Error connecting wallet. Please try again.', 'error');
        }
    }
}

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

async function loadPrices() {
    try {
        const [single, three, five] = await distributionContract.getPrices();
        
        document.getElementById('price1').textContent = ethers.utils.formatEther(single) + ' ETH';
        document.getElementById('price3').textContent = ethers.utils.formatEther(three) + ' ETH';
        document.getElementById('price5').textContent = ethers.utils.formatEther(five) + ' ETH';
        
    } catch (error) {
        console.error('Error loading prices:', error);
    }
}

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

// ✅ VALIDATION FIX #2
async function selectSchool(school) {
    // ✅ VALIDATE USER HAS ROLLS
    const freeRolls = parseInt(document.getElementById('freeRollsCount').textContent || '0');
    const paidRolls = parseInt(document.getElementById('paidRollsCount').textContent || '0');
    const totalRolls = freeRolls + paidRolls;
    
    if (totalRolls <= 0) {
        showToast('⚠️ You need rolls to select a school!', 'error');
        console.log('❌ No rolls available for school selection');
        return;
    }
    
    currentSchool = school;
    
    const storageKey = `winions_school_${school}`;
    const currentCount = parseInt(localStorage.getItem(storageKey) || '0');
    localStorage.setItem(storageKey, String(currentCount + 1));
    
    console.log(`🎲 School selected: ${school} (Total: ${currentCount + 1})`);
    console.log(`✅ User has ${totalRolls} rolls available`);
    
    document.getElementById('chosenSchool').textContent = school.toUpperCase();
    
    showScreen('diceScreen');
    
    createDiceDisplay();
}

function createDiceDisplay() {
    const diceDisplay = document.getElementById('diceDisplay');
    diceDisplay.innerHTML = '<div class="spinning-number" id="spinningNumber">0</div>';
    
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

// 🎲 WEIGHTED DICE ROLL SYSTEM - NEW!
function generateWeightedRoll(school) {
    if (!school || !SCHOOL_WEIGHTS[school]) {
        console.error('Invalid school:', school);
        return Math.floor(Math.random() * 331) + 66;
    }
    
    const schoolConfig = SCHOOL_WEIGHTS[school];
    const random = Math.random() * 100; // 0-100
    
    console.log(`🎲 Rolling for school: ${school.toUpperCase()}`);
    console.log(`Random number: ${random.toFixed(2)}%`);
    
    // 75% chance for commons
    if (random < schoolConfig.commonsWeight) {
        const commonHouse = schoolConfig.commons[Math.floor(Math.random() * schoolConfig.commons.length)];
        const range = HOUSE_RANGES[commonHouse];
        const roll = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        console.log(`✅ COMMON (${random.toFixed(2)}% < 75%): ${commonHouse} - Roll: ${roll}`);
        return roll;
    }
    
    // Boosted rares: 13.5% total
    let boostedStart = schoolConfig.commonsWeight;
    for (const [houseName, weight] of Object.entries(schoolConfig.boostedRares)) {
        if (random >= boostedStart && random < boostedStart + weight) {
            const range = HOUSE_RANGES[houseName];
            const roll = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            console.log(`🌟 BOOSTED RARE (${boostedStart.toFixed(2)}% - ${(boostedStart + weight).toFixed(2)}%): ${houseName} - Roll: ${roll}`);
            return roll;
        }
        boostedStart += weight;
    }
    
    // Other rares: remaining 11.5%
    const otherRareHouse = schoolConfig.otherRares[Math.floor(Math.random() * schoolConfig.otherRares.length)];
    const range = HOUSE_RANGES[otherRareHouse];
    const roll = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    console.log(`💎 OTHER RARE (${boostedStart.toFixed(2)}% - 100%): ${otherRareHouse} - Roll: ${roll}`);
    return roll;
}

function getHouseFromRoll(total) {
    for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
        if (total >= range.min && total <= range.max) {
            return houseName;
        }
    }
    return 'Unknown House';
}

// ✅ VALIDATION FIX #3 - Roll with contract call + weighted distribution
async function rollDice() {
    rollAudio.currentTime = 0;
    rollAudio.play().catch(err => console.log('Audio blocked:', err));
    
    if (hasPendingClaim) {
        showToast('You must claim your Winion before rolling again!', 'error');
        return;
    }
    
    if (!currentSchool) {
        showToast('Please select a school first!', 'error');
        return;
    }
    
    // ✅ VALIDATE ROLLS
    const freeRolls = parseInt(document.getElementById('freeRollsCount').textContent || '0');
    const paidRolls = parseInt(document.getElementById('paidRollsCount').textContent || '0');
    const totalRolls = freeRolls + paidRolls;
    
    if (totalRolls <= 0) {
        showToast('⚠️ You need rolls to roll the dice!', 'error');
        console.log('❌ No rolls available');
        return;
    }
    
    try {
        const rollButton = document.getElementById('rollButton');
        rollButton.disabled = true;
        rollButton.textContent = '🎲 ROLLING...';
        
        const spinningNumber = document.getElementById('spinningNumber');
        spinningNumber.classList.add('rolling');
        
        console.log(`🎲 Rolling with school: ${currentSchool}`);
        console.log(`📊 User has ${totalRolls} rolls available`);
        console.log(`⚠️ Roll will be deducted when claiming, not now`);
        
        // ✅ USE CLIENT-SIDE WEIGHTED DISTRIBUTION
        // Roll deduction happens when user claims, not here!
        const targetTotal = generateWeightedRoll(currentSchool);
        currentRollTotal = targetTotal;
        console.log('🎲 Weighted roll result:', targetTotal);
        
        // Animate spinning
        let elapsed = 0;
        const duration = 2000;
        const interval = 50;
        
        const roller = setInterval(() => {
            const randomNum = Math.floor(Math.random() * 331) + 66;
            spinningNumber.textContent = randomNum;
            elapsed += interval;
            
            if (elapsed >= duration) {
                clearInterval(roller);
                
                spinningNumber.classList.remove('rolling');
                spinningNumber.classList.add('landing');
                spinningNumber.textContent = targetTotal;
                
                setTimeout(() => {
                    spinningNumber.classList.remove('landing');
                    
                    document.getElementById('totalValue').textContent = targetTotal;
                    
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

function revealHouse(total) {
    currentHouseName = getHouseFromRoll(total);
    
    console.log('🏠 Assigned house:', currentHouseName);
    
    hasPendingClaim = true;
    savePendingClaim(currentHouseName);
    
    document.getElementById('rolledHouseName').textContent = currentHouseName;
    document.getElementById('houseResult').style.display = 'block';
    
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = true;
    rollButton.textContent = '⚠️ CLAIM YOUR WINION FIRST';
}

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

async function claimWinion() {
    try {
        showToast('Claiming your Winion...', 'info');
        
        console.log('🎫 Claiming Winion - this will deduct 1 roll from your balance');
        console.log(`   Roll Total: ${currentRollTotal}`);
        console.log(`   House: ${currentHouseName}`);
        
        const tx = await distributionContract.claimWinion(
            currentRollTotal,
            currentHouseName
        );
        
        showToast('Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        console.log('✅ Claim successful! Roll has been deducted on-chain.');
        
        const claimEvent = receipt.logs.find(log => {
            try {
                const parsed = distributionContract.interface.parseLog(log);
                return parsed.name === 'NFTDistributed';
            } catch {
                return false;
            }
        });
        
        let tokenId = 'Unknown';
        if (claimEvent) {
            const parsed = distributionContract.interface.parseLog(claimEvent);
            tokenId = parsed.args.tokenId.toString();
        }
        
        hasPendingClaim = false;
        localStorage.removeItem('winions_pending_claim');
        
        document.getElementById('claimedHouseName').textContent = currentHouseName;
        document.getElementById('claimedTokenId').textContent = tokenId;
        document.getElementById('claimedRollTotal').textContent = currentRollTotal;
        document.getElementById('etherscanLink').href = `https://etherscan.io/tx/${receipt.hash}`;
        
        document.getElementById('successModal').style.display = 'flex';
        
        showToast(`Winion #${tokenId} claimed successfully!`, 'success');
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Error claiming Winion:', error);
        showToast('Error claiming Winion. Please try again.', 'error');
    }
}

function resetToRollsScreen() {
    document.getElementById('successModal').style.display = 'none';
    
    currentSchool = null;
    currentRollTotal = 0;
    currentHouseName = '';
    
    document.getElementById('houseResult').style.display = 'none';
    
    showScreen('rollsScreen');
}

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

if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => location.reload());
    window.ethereum.on('chainChanged', () => location.reload());
}

window.addEventListener('beforeunload', (e) => {
    if (hasPendingClaim) {
        e.preventDefault();
        e.returnValue = 'You have an unclaimed Winion! Are you sure you want to leave?';
        return e.returnValue;
    }
});

window.connectWallet = connectWallet;
window.purchaseRolls = purchaseRolls;
window.selectSchool = selectSchool;
window.rollDice = rollDice;
window.claimWinion = claimWinion;
window.resetToRollsScreen = resetToRollsScreen;

document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectButton');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
        console.log('✅ Connect button listener attached');
    }
    
    // ✅ VALIDATION FIX #1
    const continueBtn = document.getElementById('continueToSchool');
    if (continueBtn) {
        continueBtn.addEventListener('click', async () => {
            // ✅ CHECK IF USER HAS ROLLS
            const freeRolls = parseInt(document.getElementById('freeRollsCount').textContent || '0');
            const paidRolls = parseInt(document.getElementById('paidRollsCount').textContent || '0');
            const totalRolls = freeRolls + paidRolls;
            
            if (totalRolls <= 0) {
                showToast('⚠️ You need to purchase rolls before continuing!', 'error');
                console.log('❌ No rolls available');
                return;
            }
            
            console.log(`✅ User has ${totalRolls} rolls available, proceeding to school selection`);
            showScreen('schoolScreen');
        });
    }
    
    const schoolButtons = document.querySelectorAll('.school-button');
    schoolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const school = btn.getAttribute('data-school');
            selectSchool(school);
        });
    });
    
    const rollBtn = document.getElementById('rollButton');
    if (rollBtn) {
        rollBtn.addEventListener('click', rollDice);
    }
    
    const claimBtn = document.getElementById('claimButton');
    if (claimBtn) {
        claimBtn.addEventListener('click', claimWinion);
    }
});

console.log('✅ Winions Dice Roller Loaded (v5 - WEIGHTED SCHOOLS + VALIDATION + ETHERS V5)');
console.log('🎲 75% Commons + Boosted Rares System Active');
console.log('🛡️ Roll Validation Active at ALL Checkpoints');
console.log('📊 School-specific weighted distribution enabled');
console.log('📚 Ethers.js v5 compatible');

})();
