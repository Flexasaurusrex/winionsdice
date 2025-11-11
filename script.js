// Winions Dice Roller - COMPLETE WITH WEIGHTED SCHOOLS
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

let provider;
let signer;
let userAddress;
let distributionContract;
let currentSchool = null;
let currentRollTotal = 0;
let currentHouseName = '';
let availableHouses = {};
let hasPendingClaim = false;

// LOCALSTORAGE VERSION
const LOCALSTORAGE_VERSION = 2;

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
    'House of Gold': { min: 393, max: 395 }
    // Death removed - no supply
};

// ============================================
// WEIGHTED DICE SYSTEM
// ============================================

function rollWeightedDie(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < weights.length; i++) {
        if (random < weights[i]) {
            return i + 1; // Return 1-6
        }
        random -= weights[i];
    }
    return 6;
}

function rollAnarchy() {
    // Heavily weighted toward commons (matches 63% supply)
    // [1:3x, 2:4x, 3:4x, 4:2x, 5:1x, 6:1x]
    const weights = [3, 4, 4, 2, 1, 1];
    return rollWeightedDie(weights);
}

function rollMischief() {
    // Balanced toward middle - 50% commons, boosts uncommon
    // [1:2x, 2:3x, 3:4x, 4:3x, 5:2x, 6:1x]
    const weights = [2, 3, 4, 3, 2, 1];
    return rollWeightedDie(weights);
}

function rollLuck() {
    // Balanced with high bias - 32% commons, 30% rares
    // [1:1x, 2:2x, 3:3x, 4:4x, 5:3x, 6:2x]
    // Gold chance: ~1.8% (best odds!)
    const weights = [1, 2, 3, 4, 3, 2];
    return rollWeightedDie(weights);
}

function rollSingleDie() {
    if (currentSchool === 'anarchy') {
        return rollAnarchy();
    } else if (currentSchool === 'mischief') {
        return rollMischief();
    } else if (currentSchool === 'luck') {
        return rollLuck();
    }
    // Default to anarchy if no school selected
    return rollAnarchy();
}

function generateWeightedDiceRolls() {
    // Roll 66 weighted dice based on selected school
    let total = 0;
    for (let i = 0; i < 66; i++) {
        total += rollSingleDie();
    }
    
    // Cap at 395 (Gold max) since Death has no supply
    if (total > 395) {
        total = 395;
    }
    
    console.log(`School: ${currentSchool}, Rolled: ${total}`);
    return total;
}

// ============================================
// LOCALSTORAGE & ANTI-REFRESH
// ============================================

function checkLocalStorageVersion() {
    const storedVersion = localStorage.getItem('winions_version');
    
    if (!storedVersion || parseInt(storedVersion) < LOCALSTORAGE_VERSION) {
        console.log('🔄 OLD LOCALSTORAGE DETECTED - Clearing all data...');
        localStorage.removeItem('winions_pending_claim');
        localStorage.removeItem('winions_version');
        localStorage.setItem('winions_version', LOCALSTORAGE_VERSION.toString());
        console.log('✅ localStorage cleared and updated');
        showToast('🔄 App updated! Old data cleared.', 'info');
    }
}

function checkForPendingClaim() {
    const pendingClaim = localStorage.getItem('winions_pending_claim');
    
    if (pendingClaim) {
        try {
            const claimData = JSON.parse(pendingClaim);
            hasPendingClaim = true;
            currentRollTotal = claimData.rollTotal;
            currentHouseName = claimData.houseName;
            currentSchool = claimData.school;
            
            console.log('🚨 ANTI-REFRESH PROTECTION ACTIVATED!');
            console.log('Restored pending claim:', claimData);
            
            setTimeout(() => {
                showToast('🚨 YOU HAVE AN UNCLAIMED WINION!', 'error');
                showToast('You must claim your previous Winion before rolling again!', 'warning');
            }, 1000);
        } catch (error) {
            console.error('Error parsing pending claim:', error);
            localStorage.removeItem('winions_pending_claim');
        }
    }
}

function savePendingClaim(rollTotal, houseName, school) {
    const claimData = {
        rollTotal: rollTotal,
        houseName: houseName,
        school: school,
        timestamp: Date.now(),
        userAddress: userAddress
    };
    localStorage.setItem('winions_pending_claim', JSON.stringify(claimData));
    console.log('🔒 PENDING CLAIM LOCKED IN LOCALSTORAGE');
}

function clearPendingClaim() {
    localStorage.removeItem('winions_pending_claim');
    hasPendingClaim = false;
    console.log('✅ Pending claim cleared');
}

// ============================================
// WALLET CONNECTION
// ============================================

window.addEventListener('load', async () => {
    checkLocalStorageVersion();
    checkForPendingClaim();
    
    document.getElementById('connectButton').addEventListener('click', connectWallet);
    document.getElementById('continueToSchool').addEventListener('click', handleContinueToSchool);
    
    document.querySelectorAll('.school-button').forEach(button => {
        button.addEventListener('click', () => selectSchool(button.dataset.school));
    });
    
    document.getElementById('rollButton').addEventListener('click', rollDice);
    document.getElementById('claimButton').addEventListener('click', claimWinion);
});

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            if (isMobile()) {
                showMobileInstructions();
            } else {
                alert('Please install MetaMask or another Web3 wallet!');
            }
            return;
        }

        document.getElementById('walletStatus').style.display = 'block';
        document.getElementById('walletStatus').textContent = 'Opening wallet connection...';
        document.getElementById('connectButton').disabled = true;

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        const walletName = window.ethereum.isMetaMask ? 'MetaMask' :
                          window.ethereum.isCoinbaseWallet ? 'Coinbase Wallet' :
                          window.ethereum.isRainbow ? 'Rainbow' :
                          window.ethereum.isTrust ? 'Trust Wallet' : 'Web3 Wallet';
        
        distributionContract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            DISTRIBUTION_CONTRACT_ABI,
            signer
        );
        
        const network = await provider.getNetwork();
        if (network.chainId !== CONFIG.CHAIN_ID) {
            await switchToMainnet();
            return;
        }
        
        document.getElementById('walletStatus').textContent = `Connected: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        document.getElementById('connectButton').disabled = false;
        document.getElementById('walletStatus').style.display = 'none';
        
        if (error.code === 4001) {
            showToast('Connection rejected. Please try again.', 'error');
        } else {
            showToast('Failed to connect wallet.', 'error');
        }
    }
}

async function switchToMainnet() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }],
        });
        setTimeout(connectWallet, 1000);
    } catch (error) {
        console.error('Network switch error:', error);
        showToast('Please switch to Ethereum Mainnet.', 'error');
    }
}

function showMobileInstructions() {
    const modal = document.createElement('div');
    modal.className = 'mobile-modal';
    modal.innerHTML = `
        <div class="mobile-modal-content">
            <h2>📱 Connect on Mobile</h2>
            <div class="mobile-steps">
                <div class="mobile-step">
                    <span class="step-number">1</span>
                    <p>Open your wallet app (MetaMask, Coinbase Wallet, etc.)</p>
                </div>
                <div class="mobile-step">
                    <span class="step-number">2</span>
                    <p>Tap the Browser tab</p>
                </div>
                <div class="mobile-step">
                    <span class="step-number">3</span>
                    <p>Paste this URL:</p>
                    <div class="url-box">
                        <span id="copyUrl">${window.location.hostname}</span>
                        <button onclick="copyToClipboard('${window.location.hostname}')" class="copy-btn">COPY</button>
                    </div>
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="close-mobile-btn">CLOSE</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('URL copied!', 'success');
}

async function loadUserRolls() {
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        
        document.getElementById('freeRollsCount').textContent = freeRolls.toString();
        document.getElementById('paidRollsCount').textContent = paidRolls.toString();
        
        const [single, three, five] = await distributionContract.getPrices();
        document.getElementById('price1').textContent = `${ethers.utils.formatEther(single)} ETH`;
        document.getElementById('price3').textContent = `${ethers.utils.formatEther(three)} ETH`;
        document.getElementById('price5').textContent = `${ethers.utils.formatEther(five)} ETH`;
        
        document.getElementById('walletScreen').style.display = 'none';
        document.getElementById('rollsScreen').style.display = 'block';
        
        const continueButton = document.getElementById('continueToSchool');
        if (hasPendingClaim) {
            continueButton.textContent = '🚫 CLAIM YOUR WINION FIRST';
            continueButton.style.background = 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)';
            continueButton.style.animation = 'pulse 1.5s ease-in-out infinite';
        } else {
            continueButton.textContent = 'CONTINUE TO ROLL →';
            continueButton.style.background = '';
            continueButton.style.animation = '';
        }
        
        const isActive = await distributionContract.distributionActive();
        if (!isActive) {
            showToast('⚠️ Distribution not active. Check back later!', 'warning');
        }
        
    } catch (error) {
        console.error('Error loading rolls:', error);
        showToast('Error loading rolls. Please refresh.', 'error');
    }
}

async function purchaseRolls(numberOfRolls) {
    try {
        showToast('Preparing transaction...', 'info');
        
        const [single, three, five] = await distributionContract.getPrices();
        let price = numberOfRolls === 1 ? single : numberOfRolls === 3 ? three : five;
        
        const tx = await distributionContract.purchaseRolls(numberOfRolls, { value: price });
        showToast('Waiting for confirmation...', 'info');
        await tx.wait();
        showToast(`✅ ${numberOfRolls} rolls purchased!`, 'success');
        await loadUserRolls();
    } catch (error) {
        console.error('Purchase error:', error);
        showToast(error.code === 4001 ? 'Transaction rejected' : 'Purchase failed', 'error');
    }
}

async function handleContinueToSchool() {
    if (hasPendingClaim) {
        console.log('🔒 Restoring pending claim...');
        restorePendingClaimScreen();
        return;
    }
    
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        const totalRolls = Number(freeRolls) + Number(paidRolls);
        
        if (totalRolls === 0) {
            showToast('⚠️ Purchase rolls first!', 'warning');
            return;
        }
        
        showSchoolScreen();
    } catch (error) {
        console.error('Error checking rolls:', error);
        showToast('Error checking rolls.', 'error');
    }
}

async function restorePendingClaimScreen() {
    await checkAvailableHouses();
    
    if (!availableHouses[currentHouseName] || availableHouses[currentHouseName].count === 0) {
        console.error('⚠️ ESCAPE HATCH: House has no NFTs!');
        clearPendingClaim();
        showToast('⚠️ House ran out of NFTs! Claim cleared.', 'error');
        await loadUserRolls();
        return;
    }
    
    document.getElementById('rollsScreen').style.display = 'none';
    document.getElementById('diceScreen').style.display = 'block';
    document.getElementById('chosenSchool').textContent = (currentSchool || 'UNKNOWN').toUpperCase();
    
    const schoolColors = { anarchy: '#ff6b35', mischief: '#4a90e2', luck: '#50c878' };
    document.body.style.setProperty('--school-color', schoolColors[currentSchool] || '#ff1a1a');
    
    createDiceDisplay();
    document.getElementById('totalValue').textContent = currentRollTotal;
    document.getElementById('rollButton').disabled = true;
    document.getElementById('rollButton').textContent = '⚠️ CLAIM YOUR WINION FIRST';
    document.getElementById('rolledHouseName').textContent = currentHouseName;
    document.getElementById('houseResult').style.display = 'block';
    
    showToast('✅ Restored - claim your Winion!', 'success');
}

function showSchoolScreen() {
    document.getElementById('rollsScreen').style.display = 'none';
    document.getElementById('schoolScreen').style.display = 'block';
}

async function selectSchool(school) {
    if (hasPendingClaim) {
        showToast('⚠️ CLAIM YOUR WINION FIRST!', 'error');
        return;
    }
    
    currentSchool = school;
    document.getElementById('schoolScreen').style.display = 'none';
    document.getElementById('diceScreen').style.display = 'block';
    document.getElementById('chosenSchool').textContent = school.toUpperCase();
    document.getElementById('rollButton').disabled = true;
    document.getElementById('rollButton').textContent = 'CHECKING INVENTORY...';
    
    const schoolColors = { anarchy: '#ff6b35', mischief: '#4a90e2', luck: '#50c878' };
    document.body.style.setProperty('--school-color', schoolColors[school] || '#ff1a1a');
    
    if (Object.keys(availableHouses).length === 0) {
        await checkAvailableHouses();
    }
    
    createDiceDisplay();
    
    if (Object.keys(availableHouses).length === 0) {
        document.getElementById('rollButton').disabled = true;
        document.getElementById('rollButton').textContent = '❌ NO NFTS AVAILABLE';
        showToast('⚠️ No NFTs available!', 'error');
    } else {
        document.getElementById('rollButton').disabled = false;
        document.getElementById('rollButton').textContent = '🎲 ROLL THE DICE 🎲';
    }
}

async function checkAvailableHouses() {
    try {
        availableHouses = {};
        console.log('🔍 Checking houses for NFTs...');
        
        for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
            const count = await distributionContract.getHouseInventoryCount(houseName);
            const countNum = Number(count);
            
            if (countNum > 0) {
                availableHouses[houseName] = { count: countNum, range: range };
                console.log(`✅ ${houseName}: ${countNum} NFTs`);
            }
        }
        
        console.log(`Total houses with NFTs: ${Object.keys(availableHouses).length}`);
    } catch (error) {
        console.error('Error checking houses:', error);
    }
}

function createDiceDisplay() {
    const diceDisplay = document.getElementById('diceDisplay');
    diceDisplay.innerHTML = '<div class="spinning-number" id="spinningNumber">0</div>';
    
    if (!document.getElementById('spinningNumberStyles')) {
        const style = document.createElement('style');
        style.id = 'spinningNumberStyles';
        style.textContent = `
            .spinning-number {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 180px;
                font-weight: 900;
                color: var(--school-color, #ff1a1a);
                text-shadow: 0 0 40px currentColor;
                font-family: 'Arial Black', sans-serif;
            }
            .spinning-number.rolling {
                animation: spin3d 0.1s linear infinite;
            }
            @keyframes spin3d {
                100% { transform: translate(-50%, -50%) rotateX(360deg) scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }
}

async function rollDice() {
    if (hasPendingClaim) {
        showToast('⚠️ CLAIM YOUR WINION FIRST!', 'error');
        return;
    }
    
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        if (Number(freeRolls) + Number(paidRolls) === 0) {
            showToast('⚠️ No rolls available!', 'warning');
            setTimeout(resetToRollsScreen, 2000);
            return;
        }
    } catch (error) {
        console.error('Error checking rolls:', error);
        return;
    }
    
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = true;
    
    const spinningNumber = document.getElementById('spinningNumber');
    spinningNumber.classList.add('rolling');
    
    // Use weighted dice rolls based on school!
    const targetTotal = generateWeightedDiceRolls();
    
    let elapsed = 0;
    const duration = 2000;
    const interval = 50;
    
    const roller = setInterval(() => {
        spinningNumber.textContent = Math.floor(Math.random() * 330) + 66;
        elapsed += interval;
        
        if (elapsed >= duration) {
            clearInterval(roller);
            spinningNumber.classList.remove('rolling');
            spinningNumber.textContent = targetTotal;
            setTimeout(() => calculateTotal(targetTotal), 500);
        }
    }, interval);
}

function calculateTotal(total) {
    currentRollTotal = total;
    document.getElementById('totalValue').textContent = total;
    setTimeout(() => revealHouse(total), 500);
}

function revealHouse(total) {
    const houseName = getHouseFromRoll(total);
    currentHouseName = houseName;
    
    if (!availableHouses[houseName]) {
        console.error(`ERROR: ${houseName} has no NFTs!`);
        showToast('⚠️ Error: House has no NFTs!', 'error');
        document.getElementById('rollButton').disabled = false;
        return;
    }
    
    document.getElementById('rolledHouseName').textContent = houseName;
    document.getElementById('houseResult').style.display = 'block';
    document.getElementById('rollButton').disabled = true;
    document.getElementById('rollButton').textContent = '⚠️ CLAIM YOUR WINION FIRST';
    
    hasPendingClaim = true;
    savePendingClaim(currentRollTotal, currentHouseName, currentSchool);
}

function getHouseFromRoll(total) {
    for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
        if (total >= range.min && total <= range.max) {
            return houseName;
        }
    }
    return 'Unknown House';
}

async function claimWinion() {
    try {
        const claimButton = document.getElementById('claimButton');
        claimButton.disabled = true;
        claimButton.textContent = 'CLAIMING...';
        
        showToast('Claiming your Winion...', 'info');
        
        const tx = await distributionContract.claimWinion(currentRollTotal, currentHouseName);
        claimButton.textContent = 'WAITING...';
        showToast('Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        let tokenId = 'Unknown';
        const event = receipt.logs.find(log => {
            try {
                const parsed = distributionContract.interface.parseLog(log);
                return parsed.name === 'NFTDistributed';
            } catch { return false; }
        });
        
        if (event) {
            tokenId = distributionContract.interface.parseLog(event).args.tokenId.toString();
        }
        
        clearPendingClaim();
        showToast(`🎉 Claimed Winion #${tokenId}!`, 'success');
        await showSuccessModal(tokenId, tx.hash);
        
    } catch (error) {
        console.error('Claim error:', error);
        
        const claimButton = document.getElementById('claimButton');
        claimButton.disabled = false;
        claimButton.textContent = 'CLAIM YOUR WINION';
        
        if (error.code === 4001) {
            showToast('Transaction rejected', 'error');
        } else if (error.message.includes('No rolls')) {
            showToast('❌ No rolls available!', 'error');
            clearPendingClaim();
            setTimeout(resetToRollsScreen, 2000);
        } else if (error.message.includes('No NFTs')) {
            console.error('🚨 House depleted!');
            showToast('❌ House has no NFTs left!', 'error');
            clearPendingClaim();
            setTimeout(resetToRollsScreen, 2000);
        } else {
            showToast(error.message || 'Claim failed', 'error');
        }
    }
}

async function showSuccessModal(tokenId, txHash) {
    document.getElementById('claimedHouseName').textContent = currentHouseName;
    document.getElementById('claimedTokenId').textContent = tokenId;
    document.getElementById('claimedRollTotal').textContent = currentRollTotal;
    document.getElementById('etherscanLink').href = `${CONFIG.ETHERSCAN_URL}/tx/${txHash}`;
    
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        const totalRolls = Number(freeRolls) + Number(paidRolls);
        
        const closeButton = document.querySelector('.close-button');
        
        if (totalRolls > 0) {
            closeButton.textContent = `🎲 ROLL AGAIN (${totalRolls} remaining)`;
            closeButton.onclick = async () => {
                document.getElementById('successModal').style.display = 'none';
                hasPendingClaim = false;
                currentSchool = null;
                availableHouses = {};
                await checkAvailableHouses();
                document.getElementById('diceScreen').style.display = 'none';
                document.getElementById('schoolScreen').style.display = 'block';
            };
        } else {
            closeButton.textContent = '💎 BUY MORE ROLLS';
            closeButton.onclick = () => {
                document.getElementById('successModal').style.display = 'none';
                hasPendingClaim = false;
                resetToRollsScreen();
            };
        }
    } catch (error) {
        console.error('Error checking remaining rolls:', error);
    }
    
    document.getElementById('successModal').style.display = 'flex';
}

function resetToRollsScreen() {
    clearPendingClaim();
    document.getElementById('successModal').style.display = 'none';
    document.getElementById('diceScreen').style.display = 'none';
    document.getElementById('schoolScreen').style.display = 'none';
    document.getElementById('rollsScreen').style.display = 'block';
    currentSchool = null;
    loadUserRolls();
}

function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    toast.style.cssText = `
        background: rgba(0,0,0,0.95);
        border: 2px solid ${colors[type]};
        border-radius: 12px;
        padding: 16px 24px;
        color: white;
        display: flex;
        gap: 12px;
        margin-bottom: 10px;
        animation: slideIn 0.3s ease-out;
    `;
    
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

if (window.ethereum) {
    window.ethereum.on('accountsChanged', accounts => {
        if (accounts.length === 0) location.reload();
        else { userAddress = accounts[0]; loadUserRolls(); }
    });
    window.ethereum.on('chainChanged', () => location.reload());
}

console.log('🎲 Winions Dice Roller with Weighted Schools Loaded!');
console.log('Schools: Anarchy (commons), Mischief (uncommon), Luck (rares+gold)');
