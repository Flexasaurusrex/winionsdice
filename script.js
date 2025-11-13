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

// 🔥 FOMO COUNTER - DISABLED (CORS issues with public RPC)
// TODO: Re-enable after adding CORS-enabled RPC or using user's wallet provider
async function loadFomoCounter(isAutoRefresh = false) {
    console.log('⚠️ FOMO counter disabled - requires CORS-enabled RPC endpoint');
    // Silently skip loading to prevent console spam
    return;
}

// Don't auto-load FOMO counter on page load
// window.addEventListener('load', () => {
//     loadFomoCounter();
//     setInterval(() => loadFomoCounter(true), 30000);
// });

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
            "function getHouseInventoryCount(string houseName) view returns (uint256)",
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
        
        console.log('🔍 Checking for pending claims FIRST...');
        checkPendingClaim();  // ✅ DO THIS FIRST to set hasPendingClaim flag!
        
        console.log('📥 Loading user rolls...');
        await loadUserRolls();  // ✅ This will verify pending claim if it exists
        
        console.log('💰 Loading prices...');
        await loadPrices();
        
        console.log('🎉 Connection successful!');
        
        // ✅ CRITICAL: Only show rolls screen if NO pending claim
        // If there's a pending claim, checkPendingClaim() already showed dice screen
        if (!hasPendingClaim) {
            console.log('✅ No pending claim - showing rolls screen');
            showScreen('rollsScreen');
        } else {
            console.log('🔒 Pending claim active - staying on dice screen');
            console.log('   User MUST claim before rolling again!');
        }
        
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
        
        // ✅ ESCAPE HATCH: If there's a pending claim, verify the house still has NFTs
        if (hasPendingClaim && currentHouseName) {
            console.log(`🔍 Verifying pending claim for ${currentHouseName}...`);
            
            try {
                const houseCount = await distributionContract.getHouseInventoryCount(currentHouseName);
                const count = Number(houseCount.toString());
                
                if (count === 0) {
                    console.error(`🚨 ESCAPE HATCH ACTIVATED!`);
                    console.error(`   House "${currentHouseName}" has 0 NFTs!`);
                    console.error(`   Clearing stuck pending claim...`);
                    
                    // Clear the stuck pending claim
                    hasPendingClaim = false;
                    localStorage.removeItem('winions_pending_claim');
                    currentSchool = null;
                    currentRollTotal = 0;
                    currentHouseName = '';
                    
                    showToast('🚨 Your pending house is sold out!', 'error');
                    showToast('✅ Pending claim cleared - you can roll again!', 'success');
                    
                    // Return to rolls screen
                    showScreen('rollsScreen');
                    document.getElementById('houseResult').style.display = 'none';
                    
                    console.log('✅ Escape hatch successful - user can now roll again');
                } else {
                    console.log(`✅ House "${currentHouseName}" has ${count} NFTs - claim is VALID`);
                    console.log(`🔒 ANTI-REFRESH PROTECTION ACTIVE: User must claim before rolling again!`);
                    
                    // Update the NFT count display
                    const countDisplay = document.createElement('p');
                    countDisplay.className = 'nft-count';
                    countDisplay.style.cssText = 'color: #00ff00; margin-top: 10px; font-size: 18px;';
                    countDisplay.textContent = `${count} NFT${count !== 1 ? 's' : ''} remaining in this house`;
                    
                    const houseResult = document.getElementById('houseResult');
                    const existingCount = houseResult.querySelector('.nft-count');
                    if (existingCount) existingCount.remove();
                    houseResult.appendChild(countDisplay);
                }
            } catch (error) {
                console.error('Error checking pending claim house:', error);
                console.log('⚠️ Could not verify house inventory, keeping pending claim active');
                // If we can't check, keep the pending claim active (safer)
            }
        }
        
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
    // 🔒 CRITICAL: HARD BLOCK if there's an unclaimed Winion
    if (hasPendingClaim) {
        showToast('🚨 YOU MUST CLAIM YOUR WINION BEFORE SELECTING A SCHOOL!', 'error');
        showToast('⚠️ Refreshing the page will not bypass this!', 'warning');
        console.error('❌ BLOCKED: User has pending claim, cannot select school');
        return; // HARD BLOCK
    }
    
    // ✅ VALIDATE USER HAS ROLLS
    const freeRolls = parseInt(document.getElementById('freeRollsCount').textContent || '0');
    const paidRolls = parseInt(document.getElementById('paidRollsCount').textContent || '0');
    const totalRolls = freeRolls + paidRolls;
    
    if (totalRolls <= 0) {
        showToast('⚠️ You need to purchase rolls first!', 'warning');
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

// 🎲 WEIGHTED DICE ROLL SYSTEM - WITH INVENTORY CHECK!
function generateWeightedRoll(school, availableHouses) {
    if (!school || !SCHOOL_WEIGHTS[school]) {
        console.error('Invalid school:', school);
        return Math.floor(Math.random() * 331) + 66;
    }
    
    if (!availableHouses || Object.keys(availableHouses).length === 0) {
        console.error('⚠️ No houses available!');
        return null;
    }
    
    const schoolConfig = SCHOOL_WEIGHTS[school];
    const random = Math.random() * 100;
    
    console.log(`🎲 Rolling for school: ${school.toUpperCase()}`);
    console.log(`Random number: ${random.toFixed(2)}%`);
    
    // Filter commons to only available houses
    const availableCommons = schoolConfig.commons.filter(h => availableHouses[h]);
    
    // Filter boosted rares to only available houses
    const availableBoostedRares = {};
    for (const [houseName, weight] of Object.entries(schoolConfig.boostedRares)) {
        if (availableHouses[houseName]) {
            availableBoostedRares[houseName] = weight;
        }
    }
    
    // Filter other rares to only available houses
    const availableOtherRares = schoolConfig.otherRares.filter(h => availableHouses[h]);
    
    console.log(`📦 Available commons: ${availableCommons.length}/${schoolConfig.commons.length}`);
    console.log(`📦 Available boosted rares: ${Object.keys(availableBoostedRares).length}/${Object.keys(schoolConfig.boostedRares).length}`);
    console.log(`📦 Available other rares: ${availableOtherRares.length}/${schoolConfig.otherRares.length}`);
    
    // 75% chance for commons (if any available)
    if (random < schoolConfig.commonsWeight && availableCommons.length > 0) {
        const commonHouse = availableCommons[Math.floor(Math.random() * availableCommons.length)];
        const range = HOUSE_RANGES[commonHouse];
        const roll = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        console.log(`✅ COMMON (${random.toFixed(2)}% < 75%): ${commonHouse} - Roll: ${roll}`);
        return roll;
    }
    
    // Boosted rares: 13.5% total (if any available)
    if (Object.keys(availableBoostedRares).length > 0) {
        let boostedStart = schoolConfig.commonsWeight;
        for (const [houseName, weight] of Object.entries(availableBoostedRares)) {
            if (random >= boostedStart && random < boostedStart + weight) {
                const range = HOUSE_RANGES[houseName];
                const roll = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
                console.log(`🌟 BOOSTED RARE (${boostedStart.toFixed(2)}% - ${(boostedStart + weight).toFixed(2)}%): ${houseName} - Roll: ${roll}`);
                return roll;
            }
            boostedStart += weight;
        }
    }
    
    // Other rares: remaining % (if any available)
    if (availableOtherRares.length > 0) {
        const otherRareHouse = availableOtherRares[Math.floor(Math.random() * availableOtherRares.length)];
        const range = HOUSE_RANGES[otherRareHouse];
        const roll = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        console.log(`💎 OTHER RARE: ${otherRareHouse} - Roll: ${roll}`);
        return roll;
    }
    
    // Fallback: If preferred categories empty, pick ANY available house
    console.warn('⚠️ All preferred categories empty, picking from any available house');
    const allAvailable = Object.keys(availableHouses);
    if (allAvailable.length > 0) {
        const fallbackHouse = allAvailable[Math.floor(Math.random() * allAvailable.length)];
        const range = HOUSE_RANGES[fallbackHouse];
        const roll = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        console.log(`🎲 FALLBACK: ${fallbackHouse} - Roll: ${roll}`);
        return roll;
    }
    
    console.error('❌ NO HOUSES AVAILABLE AT ALL!');
    return null;
}

// Helper to get house from roll
function getHouseFromRoll(total) {
    for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
        if (total >= range.min && total <= range.max) {
            return houseName;
        }
    }
    return 'Unknown House';
}

// ✅ NEW: Check which houses have NFTs available
let availableHousesCache = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

async function checkAvailableHouses() {
    // Use cache if recent
    if (Date.now() - cacheTimestamp < CACHE_DURATION && Object.keys(availableHousesCache).length > 0) {
        console.log('📦 Using cached house inventory');
        return availableHousesCache;
    }
    
    console.log('🔍 Checking house inventory from contract...');
    
    availableHousesCache = {};
    
    for (const houseName of Object.keys(HOUSE_RANGES)) {
        try {
            const count = await distributionContract.getHouseInventoryCount(houseName);
            const countNum = Number(count.toString());
            
            if (countNum > 0) {
                availableHousesCache[houseName] = countNum;
                console.log(`✅ ${houseName}: ${countNum} NFTs available`);
            } else {
                console.log(`❌ ${houseName}: SOLD OUT`);
            }
        } catch (error) {
            console.error(`Error checking ${houseName}:`, error.message);
        }
    }
    
    cacheTimestamp = Date.now();
    
    console.log(`📊 Total houses with NFTs: ${Object.keys(availableHousesCache).length}`);
    
    return availableHousesCache;
}

// ✅ VALIDATION FIX #3 - Roll with contract call + weighted distribution
async function rollDice() {
    rollAudio.currentTime = 0;
    rollAudio.play().catch(err => console.log('Audio blocked:', err));
    
    // 🔒 CRITICAL ANTI-REFRESH PROTECTION
    if (hasPendingClaim) {
        showToast('🚨 YOU CANNOT ROLL AGAIN! CLAIM YOUR WINION FIRST!', 'error');
        showToast('⚠️ Refreshing the page will NOT bypass this!', 'warning');
        console.error('❌ BLOCKED: User has unclaimed Winion, cannot roll again');
        console.error(`   Pending house: ${currentHouseName}`);
        console.error(`   Pending total: ${currentRollTotal}`);
        return; // ABSOLUTE HARD BLOCK
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
        rollButton.textContent = '🎲 CHECKING INVENTORY...';
        
        // ✅ CHECK WHICH HOUSES HAVE NFTS AVAILABLE
        const availableHouses = await checkAvailableHouses();
        
        if (Object.keys(availableHouses).length === 0) {
            showToast('❌ No NFTs available in any house! All sold out!', 'error');
            rollButton.disabled = false;
            rollButton.textContent = '🎲 ROLL THE DICE 🎲';
            return;
        }
        
        rollButton.textContent = '🎲 ROLLING...';
        
        const spinningNumber = document.getElementById('spinningNumber');
        spinningNumber.classList.add('rolling');
        
        console.log(`🎲 Rolling with school: ${currentSchool}`);
        console.log(`📊 User has ${totalRolls} rolls available`);
        console.log(`⚠️ Roll will be deducted when claiming, not now`);
        
        // ✅ USE CLIENT-SIDE WEIGHTED DISTRIBUTION WITH INVENTORY CHECK
        const targetTotal = generateWeightedRoll(currentSchool, availableHouses);
        
        if (targetTotal === null) {
            showToast('❌ Could not generate valid roll. Please try again.', 'error');
            rollButton.disabled = false;
            rollButton.textContent = '🎲 ROLL THE DICE 🎲';
            return;
        }
        
        currentRollTotal = targetTotal;
        console.log('🎲 Final weighted roll result:', targetTotal);
        
        // Verify the house has NFTs
        const rolledHouse = getHouseFromRoll(targetTotal);
        if (!availableHouses[rolledHouse]) {
            console.error(`❌ ERROR: Rolled into ${rolledHouse} but it has no NFTs!`);
            showToast('❌ Error: Rolled into empty house. Please try again.', 'error');
            rollButton.disabled = false;
            rollButton.textContent = '🎲 ROLL THE DICE 🎲';
            return;
        }
        
        console.log(`✅ Rolled house "${rolledHouse}" has ${availableHouses[rolledHouse]} NFTs available`);
        
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
    
    // Show remaining NFTs if available
    if (availableHousesCache[currentHouseName]) {
        const remaining = availableHousesCache[currentHouseName];
        const countDisplay = document.createElement('p');
        countDisplay.className = 'nft-count';
        countDisplay.style.cssText = 'color: #00ff00; margin-top: 10px; font-size: 18px;';
        countDisplay.textContent = `${remaining} NFT${remaining !== 1 ? 's' : ''} remaining in this house`;
        
        const houseResult = document.getElementById('houseResult');
        const existingCount = houseResult.querySelector('.nft-count');
        if (existingCount) existingCount.remove();
        houseResult.appendChild(countDisplay);
    }
    
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
                // ✅ RESTORE PENDING CLAIM IMMEDIATELY
                hasPendingClaim = true;
                currentHouseName = data.houseName;
                currentSchool = data.school;
                currentRollTotal = data.rollTotal;
                
                console.log('📋 Restored pending claim:', data);
                console.log('🔒 ANTI-REFRESH PROTECTION: User cannot bypass claim!');
                
                // Show the dice screen with the pending claim
                showScreen('diceScreen');
                document.getElementById('chosenSchool').textContent = currentSchool.toUpperCase();
                document.getElementById('totalValue').textContent = currentRollTotal;
                document.getElementById('rolledHouseName').textContent = currentHouseName;
                document.getElementById('houseResult').style.display = 'block';
                
                // ✅ CRITICAL: Disable roll button
                const rollButton = document.getElementById('rollButton');
                if (rollButton) {
                    rollButton.disabled = true;
                    rollButton.textContent = '🚫 CLAIM YOUR WINION FIRST';
                    console.log('🔒 Roll button DISABLED - user must claim first');
                }
                
                // ✅ CRITICAL: Show spinning number with the result
                createDiceDisplay();
                const spinningNumber = document.getElementById('spinningNumber');
                if (spinningNumber) {
                    spinningNumber.textContent = currentRollTotal;
                    spinningNumber.classList.remove('rolling', 'landing');
                }
                
                // We'll verify inventory in loadUserRolls (after contract is ready)
                console.log('⏳ Will verify house inventory after contract loads...');
                
                showToast('🔒 You have an unclaimed Winion!', 'warning');
                showToast('⚠️ You must claim it before rolling again!', 'warning');
            } else {
                console.log('📋 Pending claim is for different wallet, clearing');
                localStorage.removeItem('winions_pending_claim');
            }
        } catch (error) {
            console.error('Error restoring pending claim:', error);
            localStorage.removeItem('winions_pending_claim');
        }
    } else {
        console.log('✅ No pending claims - user can roll freely');
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
        
        // ✅ HIDE BROKEN IMAGE (we don't need it)
        const claimedImage = document.getElementById('claimedNFTImage');
        if (claimedImage) {
            claimedImage.style.display = 'none';
        }
        
        // ✅ ADD/UPDATE OPENSEA BUTTON
        let openSeaButton = document.getElementById('openSeaButton');
        if (!openSeaButton) {
            openSeaButton = document.createElement('a');
            openSeaButton.id = 'openSeaButton';
            openSeaButton.className = 'opensea-button';
            openSeaButton.target = '_blank';
            openSeaButton.rel = 'noopener noreferrer';
            openSeaButton.style.cssText = `
                display: inline-block;
                margin: 15px 10px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #2081e2 0%, #1868b7 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                border: 2px solid #2081e2;
                transition: all 0.3s ease;
                cursor: pointer;
            `;
            openSeaButton.onmouseover = function() {
                this.style.background = 'linear-gradient(135deg, #1868b7 0%, #145a9e 100%)';
                this.style.transform = 'scale(1.05)';
            };
            openSeaButton.onmouseout = function() {
                this.style.background = 'linear-gradient(135deg, #2081e2 0%, #1868b7 100%)';
                this.style.transform = 'scale(1)';
            };
            
            // Insert after etherscan link
            const etherscanLink = document.getElementById('etherscanLink');
            if (etherscanLink && etherscanLink.parentNode) {
                etherscanLink.parentNode.insertBefore(openSeaButton, etherscanLink.nextSibling);
            }
        }
        
        // Update OpenSea link with token ID
        openSeaButton.href = `https://opensea.io/assets/ethereum/${CONFIG.WINIONS_NFT_CONTRACT}/${tokenId}`;
        openSeaButton.textContent = '👀 VIEW ON OPENSEA';
        openSeaButton.style.display = 'inline-block';
        
        document.getElementById('successModal').style.display = 'flex';
        
        showToast(`Winion #${tokenId} claimed successfully!`, 'success');
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Error claiming Winion:', error);
        
        // ✅ ESCAPE HATCH: If house has no NFTs, clear pending claim
        if (error.message && error.message.includes('No NFTs available')) {
            console.error('🚨 ESCAPE HATCH: House has no NFTs!');
            showToast('❌ This house is sold out!', 'error');
            showToast('✅ Clearing pending claim so you can roll again...', 'success');
            
            // Clear the stuck pending claim
            hasPendingClaim = false;
            localStorage.removeItem('winions_pending_claim');
            currentSchool = null;
            currentRollTotal = 0;
            currentHouseName = '';
            
            // Go back to rolls screen after 2 seconds
            setTimeout(() => {
                showScreen('rollsScreen');
                document.getElementById('houseResult').style.display = 'none';
                loadUserRolls();
            }, 2000);
        } else {
            showToast('Error claiming Winion. Please try again.', 'error');
        }
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

// 🚨 ESCAPE HATCH: Manual function to clear stuck pending claims
window.clearStuckClaim = function() {
    console.log('🚨 MANUAL ESCAPE HATCH ACTIVATED');
    console.log('   Clearing pending claim from localStorage...');
    
    localStorage.removeItem('winions_pending_claim');
    hasPendingClaim = false;
    currentSchool = null;
    currentRollTotal = 0;
    currentHouseName = '';
    
    console.log('✅ Pending claim cleared!');
    console.log('🔄 Reloading page...');
    
    setTimeout(() => {
        location.reload();
    }, 1000);
    
    return '✅ Clearing stuck claim and reloading...';
};

// 🔍 DEBUG: Check inventory for a specific house
window.checkHouseInventory = async function(houseName) {
    if (!distributionContract) {
        return '❌ Please connect wallet first!';
    }
    
    try {
        console.log(`🔍 Checking inventory for: ${houseName}`);
        
        const count = await distributionContract.getHouseInventoryCount(houseName);
        const countNum = Number(count.toString());
        
        console.log(`📊 ${houseName}: ${countNum} NFTs available`);
        
        // Also check cache
        if (availableHousesCache[houseName]) {
            const cachedCount = availableHousesCache[houseName];
            console.log(`💾 Cached count: ${cachedCount}`);
            
            if (cachedCount !== countNum) {
                console.warn('⚠️ CACHE MISMATCH!');
                console.warn(`   Contract: ${countNum}`);
                console.warn(`   Cache: ${cachedCount}`);
            } else {
                console.log('✅ Cache matches contract');
            }
        } else {
            console.log('❌ House not in cache');
        }
        
        return `${houseName}: ${countNum} NFTs`;
    } catch (error) {
        console.error('Error checking house:', error);
        return `❌ Error: ${error.message}`;
    }
};

// 🔍 DEBUG: Check ALL houses inventory
window.checkAllHouses = async function() {
    if (!distributionContract) {
        return '❌ Please connect wallet first!';
    }
    
    console.log('🔍 Checking ALL 13 houses...');
    console.log('═══════════════════════════════════════');
    
    const results = {};
    let totalNFTs = 0;
    
    for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
        try {
            const count = await distributionContract.getHouseInventoryCount(houseName);
            const countNum = Number(count.toString());
            results[houseName] = countNum;
            totalNFTs += countNum;
            
            const status = countNum > 0 ? '✅' : '❌';
            const cached = availableHousesCache[houseName] || 'not cached';
            
            console.log(`${status} ${houseName.padEnd(25)} ${countNum} NFTs (cached: ${cached})`);
        } catch (error) {
            console.error(`❌ ${houseName}: Error - ${error.message}`);
            results[houseName] = 'ERROR';
        }
    }
    
    console.log('═══════════════════════════════════════');
    console.log(`📊 TOTAL NFTS REMAINING: ${totalNFTs}/666`);
    console.log('');
    
    // Compare with cache
    console.log('💾 CACHE STATUS:');
    const cacheKeys = Object.keys(availableHousesCache);
    console.log(`   Houses in cache: ${cacheKeys.length}`);
    console.log(`   Cache age: ${Date.now() - cacheTimestamp}ms`);
    
    if (cacheKeys.length !== Object.keys(results).filter(k => results[k] > 0).length) {
        console.warn('⚠️ Cache may be stale or incorrect!');
    } else {
        console.log('✅ Cache appears accurate');
    }
    
    return results;
};

// 🔍 DEBUG: Force refresh cache
window.refreshCache = async function() {
    if (!distributionContract) {
        return '❌ Please connect wallet first!';
    }
    
    console.log('🔄 FORCING CACHE REFRESH...');
    
    // Clear cache
    availableHousesCache = {};
    cacheTimestamp = 0;
    
    // Reload
    const results = await checkAvailableHouses();
    
    console.log('✅ Cache refreshed!');
    console.log(`   Houses with NFTs: ${Object.keys(results).length}`);
    
    return results;
};

// 🔍 DEBUG: See cache contents
window.viewCache = function() {
    console.log('💾 CURRENT CACHE:');
    console.log('═══════════════════════════════════════');
    
    if (Object.keys(availableHousesCache).length === 0) {
        console.log('❌ Cache is empty');
    } else {
        for (const [house, count] of Object.entries(availableHousesCache)) {
            console.log(`   ${house.padEnd(25)} ${count} NFTs`);
        }
    }
    
    const age = Date.now() - cacheTimestamp;
    const ageSeconds = (age / 1000).toFixed(1);
    
    console.log('═══════════════════════════════════════');
    console.log(`Cache age: ${ageSeconds}s (expires after 30s)`);
    console.log(`Cache timestamp: ${new Date(cacheTimestamp).toLocaleTimeString()}`);
    
    return availableHousesCache;
};

// 🔍 DEBUG: Test weighted roll for a school (doesn't save)
window.testWeightedRoll = async function(school, times = 10) {
    if (!distributionContract) {
        return '❌ Please connect wallet first!';
    }
    
    console.log(`🎲 Testing weighted rolls for: ${school.toUpperCase()}`);
    console.log(`   Rolling ${times} times...`);
    console.log('═══════════════════════════════════════');
    
    // Get fresh inventory
    const houses = await checkAvailableHouses();
    
    const results = {};
    
    for (let i = 0; i < times; i++) {
        const roll = generateWeightedRoll(school, houses);
        const house = getHouseFromRoll(roll);
        
        results[house] = (results[house] || 0) + 1;
    }
    
    console.log('');
    console.log('📊 RESULTS:');
    
    // Sort by count
    const sorted = Object.entries(results).sort((a, b) => b[1] - a[1]);
    
    for (const [house, count] of sorted) {
        const percent = ((count / times) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(count / times * 50));
        console.log(`${house.padEnd(25)} ${count.toString().padStart(3)} (${percent}%) ${bar}`);
    }
    
    console.log('═══════════════════════════════════════');
    
    return results;
};

document.addEventListener('DOMContentLoaded', () => {
    // ✅ EARLY CHECK: Look for pending claims before wallet connect
    const pendingData = localStorage.getItem('winions_pending_claim');
    if (pendingData) {
        try {
            const data = JSON.parse(pendingData);
            console.log('🚨 PENDING CLAIM DETECTED ON PAGE LOAD!');
            console.log('   House:', data.houseName);
            console.log('   Roll:', data.rollTotal);
            console.log('   User must connect and claim before rolling again!');
            
            // Show warning on connect screen
            const walletScreen = document.getElementById('walletScreen');
            if (walletScreen) {
                const warning = document.createElement('div');
                warning.style.cssText = `
                    background: rgba(255, 100, 0, 0.2);
                    border: 2px solid #ff6400;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: center;
                    animation: pulse 1.5s ease-in-out infinite;
                `;
                warning.innerHTML = `
                    <p style="color: #ff6400; font-weight: bold; font-size: 18px; margin: 0;">
                        🚨 YOU HAVE AN UNCLAIMED WINION!
                    </p>
                    <p style="color: #ffaa00; margin: 10px 0 0 0;">
                        Connect your wallet to claim it before rolling again
                    </p>
                `;
                walletScreen.insertBefore(warning, walletScreen.querySelector('.gate-content'));
            }
        } catch (error) {
            console.error('Error checking pending claim on load:', error);
        }
    }
    
    const connectBtn = document.getElementById('connectButton');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
        console.log('✅ Connect button listener attached');
    }
    
    // ✅ VALIDATION FIX #1
    const continueBtn = document.getElementById('continueToSchool');
    if (continueBtn) {
        continueBtn.addEventListener('click', async () => {
            // 🔒 CRITICAL: Block if pending claim exists
            if (hasPendingClaim) {
                showToast('🚨 YOU MUST CLAIM YOUR WINION FIRST!', 'error');
                showToast('⚠️ Refreshing will not bypass this!', 'warning');
                console.error('❌ BLOCKED: Cannot continue with unclaimed Winion');
                return;
            }
            
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
console.log('');
console.log('🔍 DEBUG FUNCTIONS AVAILABLE:');
console.log('   checkHouseInventory("House of Havoc") - Check specific house');
console.log('   checkAllHouses() - Check all 13 houses');
console.log('   viewCache() - View cached inventory');
console.log('   refreshCache() - Force cache refresh from contract');
console.log('   testWeightedRoll("anarchy", 100) - Test distribution');
console.log('');
console.log('🚨 STUCK WITH PENDING CLAIM? Run:');
console.log('   clearStuckClaim()');

})();
