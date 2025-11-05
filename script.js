// Winions Dice Roller - Complete with Roll Validation & Custom Toasts
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

let provider;
let signer;
let userAddress;
let distributionContract;
let currentSchool = null;
let currentRollTotal = 0;
let currentHouseName = '';
let availableHouses = {};
let userTotalRolls = 0;

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

// Custom Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        claim: '🎁'
    };
    return icons[type] || 'ℹ️';
}

// Add toast styles dynamically
function injectToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .custom-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1a0000 0%, #330000 100%);
            border: 2px solid #ff1a1a;
            border-radius: 10px;
            padding: 20px 25px;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 10px 40px rgba(255, 26, 26, 0.5), 0 0 20px rgba(255, 26, 26, 0.3);
            transform: translateX(600px);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            z-index: 10000;
            font-family: 'Courier New', monospace;
            backdrop-filter: blur(10px);
        }
        
        .custom-toast.show {
            transform: translateX(0);
        }
        
        .toast-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .toast-icon {
            font-size: 24px;
            animation: pulse 2s infinite;
        }
        
        .toast-message {
            color: #fff;
            font-size: 16px;
            line-height: 1.5;
            flex: 1;
        }
        
        .toast-success {
            border-color: #00ff00;
            box-shadow: 0 10px 40px rgba(0, 255, 0, 0.3), 0 0 20px rgba(0, 255, 0, 0.2);
        }
        
        .toast-error {
            border-color: #ff4444;
            box-shadow: 0 10px 40px rgba(255, 68, 68, 0.3), 0 0 20px rgba(255, 68, 68, 0.2);
        }
        
        .toast-warning {
            border-color: #ffd700;
            box-shadow: 0 10px 40px rgba(255, 215, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.2);
        }
        
        .toast-claim {
            border-color: #4a90e2;
            box-shadow: 0 10px 40px rgba(74, 144, 226, 0.3), 0 0 20px rgba(74, 144, 226, 0.2);
            animation: celebrateToast 0.5s ease-out;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes celebrateToast {
            0% { transform: translateX(600px) scale(0.8); }
            50% { transform: translateX(-20px) scale(1.05); }
            100% { transform: translateX(0) scale(1); }
        }
        
        @media (max-width: 768px) {
            .custom-toast {
                top: 10px;
                right: 10px;
                left: 10px;
                min-width: unset;
                max-width: unset;
            }
        }
    `;
    document.head.appendChild(style);
}

window.addEventListener('load', async () => {
    injectToastStyles();
    
    document.getElementById('connectButton').addEventListener('click', connectWallet);
    document.getElementById('continueToSchool').addEventListener('click', validateAndContinue);
    
    document.querySelectorAll('.school-button').forEach(button => {
        button.addEventListener('click', () => selectSchool(button.dataset.school));
    });
    
    document.getElementById('rollButton').addEventListener('click', rollDice);
    document.getElementById('claimButton').addEventListener('click', claimWinion);
});

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            showToast('Please install MetaMask to use this app!', 'error');
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
        
        distributionContract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            DISTRIBUTION_CONTRACT_ABI,
            signer
        );
        
        const network = await provider.getNetwork();
        if (network.chainId !== CONFIG.CHAIN_ID) {
            throw new Error('Please switch to Ethereum Mainnet');
        }
        
        document.getElementById('walletStatus').textContent = `Connected: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        
        showToast('Wallet connected successfully!', 'success');
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        
        if (error.code === 4001) {
            showToast('Connection rejected. Please approve the connection in your wallet.', 'error');
        } else if (error.message && error.message.includes('ethereum')) {
            showToast('Multiple wallet extensions detected. Please disable all except MetaMask and refresh.', 'error');
        } else {
            showToast(error.message || 'Connection failed', 'error');
        }
        
        document.getElementById('connectButton').disabled = false;
        document.getElementById('walletStatus').style.display = 'none';
    }
}

async function loadUserRolls() {
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        
        const freeNum = Number(freeRolls.toString());
        const paidNum = Number(paidRolls.toString());
        userTotalRolls = freeNum + paidNum;
        
        document.getElementById('freeRollsCount').textContent = freeNum;
        document.getElementById('paidRollsCount').textContent = paidNum;
        
        const [single, three, five] = await distributionContract.getPrices();
        document.getElementById('price1').textContent = `${ethers.utils.formatEther(single)} ETH`;
        document.getElementById('price3').textContent = `${ethers.utils.formatEther(three)} ETH`;
        document.getElementById('price5').textContent = `${ethers.utils.formatEther(five)} ETH`;
        
        document.getElementById('walletScreen').style.display = 'none';
        document.getElementById('rollsScreen').style.display = 'block';
        
        const isActive = await distributionContract.distributionActive();
        if (!isActive) {
            showToast('Distribution is not currently active. Check back soon!', 'warning');
        }
        
    } catch (error) {
        console.error('Error loading rolls:', error);
        showToast('Error loading your rolls. Please refresh and try again.', 'error');
    }
}

// Validate user has rolls before continuing
function validateAndContinue() {
    if (userTotalRolls === 0) {
        showToast('You need to purchase rolls before you can play! Choose a package below.', 'warning');
        
        // Highlight purchase section
        const purchaseSection = document.querySelector('.purchase-section');
        if (purchaseSection) {
            purchaseSection.style.animation = 'pulse 1s ease-in-out 3';
            setTimeout(() => {
                purchaseSection.style.animation = '';
            }, 3000);
        }
        
        return;
    }
    
    showSchoolScreen();
}

async function purchaseRolls(numberOfRolls) {
    try {
        showToast('Preparing transaction...', 'info');
        
        const [single, three, five] = await distributionContract.getPrices();
        let price;
        
        if (numberOfRolls === 1) price = single;
        else if (numberOfRolls === 3) price = three;
        else if (numberOfRolls === 5) price = five;
        
        const tx = await distributionContract.purchaseRolls(numberOfRolls, {
            value: price
        });
        
        showToast('Transaction sent! Waiting for confirmation...', 'info');
        
        await tx.wait();
        
        showToast(`Successfully purchased ${numberOfRolls} roll${numberOfRolls > 1 ? 's' : ''}!`, 'success');
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Purchase error:', error);
        
        if (error.code === 'ACTION_REJECTED') {
            showToast('Transaction rejected', 'error');
        } else {
            showToast(error.message || 'Purchase failed', 'error');
        }
    }
}

function showSchoolScreen() {
    document.getElementById('rollsScreen').style.display = 'none';
    document.getElementById('schoolScreen').style.display = 'block';
}

async function selectSchool(school) {
    currentSchool = school;
    document.getElementById('schoolScreen').style.display = 'none';
    document.getElementById('diceScreen').style.display = 'block';
    document.getElementById('chosenSchool').textContent = school.toUpperCase();
    document.getElementById('rollButton').disabled = true;
    document.getElementById('rollButton').textContent = 'CHECKING INVENTORY...';
    
    const schoolColors = {
        anarchy: '#ff6b35',
        mischief: '#4a90e2',
        luck: '#50c878'
    };
    
    document.body.style.setProperty('--school-color', schoolColors[school] || '#ff1a1a');
    
    showToast(`Selected School of ${school.charAt(0).toUpperCase() + school.slice(1)}`, 'info');
    
    await checkAvailableHouses();
    
    createDice();
    
    document.getElementById('rollButton').disabled = false;
    document.getElementById('rollButton').textContent = '🎲 ROLL THE DICE 🎲';
}

async function checkAvailableHouses() {
    try {
        availableHouses = {};
        
        for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
            try {
                const count = await distributionContract.getHouseInventoryCount(houseName);
                const countNum = Number(count.toString());
                
                if (countNum > 0) {
                    availableHouses[houseName] = {
                        count: countNum,
                        range: range
                    };
                }
            } catch (error) {
                console.error(`Error checking ${houseName}:`, error);
            }
        }
        
        if (Object.keys(availableHouses).length === 0) {
            showToast('No NFTs available in any house! Please contact admin.', 'error');
            document.getElementById('rollButton').disabled = true;
        }
        
    } catch (error) {
        console.error('Error checking houses:', error);
    }
}

function createDice() {
    const diceDisplay = document.getElementById('diceDisplay');
    diceDisplay.innerHTML = '';
    
    for (let i = 0; i < 66; i++) {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = '?';
        die.id = `die-${i}`;
        diceDisplay.appendChild(die);
    }
}

function generateSmartDiceRolls() {
    const availableHousesList = Object.values(availableHouses);
    
    if (availableHousesList.length === 0) {
        const rolls = [];
        for (let i = 0; i < 66; i++) {
            rolls.push(Math.floor(Math.random() * 6) + 1);
        }
        return rolls;
    }
    
    const randomHouse = availableHousesList[Math.floor(Math.random() * availableHousesList.length)];
    const target = Math.floor(Math.random() * (randomHouse.range.max - randomHouse.range.min + 1)) + randomHouse.range.min;
    
    const rolls = [];
    let remaining = target;
    
    for (let i = 0; i < 65; i++) {
        const diceLeft = 66 - i;
        const minPossible = diceLeft;
        const maxPossible = diceLeft * 6;
        
        let minDie = Math.max(1, remaining - maxPossible + 6);
        let maxDie = Math.min(6, remaining - minPossible + 1);
        
        const roll = Math.floor(Math.random() * (maxDie - minDie + 1)) + minDie;
        rolls.push(roll);
        remaining -= roll;
    }
    
    rolls.push(remaining);
    
    return rolls;
}

async function rollDice() {
    // CRITICAL: Check rolls before allowing dice roll
    if (userTotalRolls === 0) {
        showToast('You have no rolls left! Purchase more rolls to continue.', 'warning');
        
        // Take them back to purchase screen
        document.getElementById('diceScreen').style.display = 'none';
        document.getElementById('schoolScreen').style.display = 'none';
        document.getElementById('rollsScreen').style.display = 'block';
        
        return;
    }
    
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = true;
    
    const dice = document.querySelectorAll('.die');
    
    if (dice.length !== 66) {
        console.error(`ERROR: Found ${dice.length} dice, should be 66!`);
        showToast('Dice loading error. Please refresh the page.', 'error');
        rollButton.disabled = false;
        return;
    }
    
    const rolls = generateSmartDiceRolls();
    
    showToast('Rolling the dice...', 'info');
    
    dice.forEach((die, index) => {
        die.classList.add('rolling');
        
        setTimeout(() => {
            die.textContent = rolls[index];
            die.classList.remove('rolling');
            
            if (index === 65) {
                setTimeout(() => {
                    calculateTotal(rolls);
                }, 500);
            }
        }, index * 30);
    });
}

function calculateTotal(rolls) {
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    currentRollTotal = total;
    
    let currentCount = 0;
    const increment = Math.ceil(total / 50);
    const counter = setInterval(() => {
        currentCount += increment;
        if (currentCount >= total) {
            currentCount = total;
            clearInterval(counter);
            setTimeout(() => {
                revealHouse(total);
            }, 500);
        }
        document.getElementById('totalValue').textContent = currentCount;
    }, 20);
}

function revealHouse(total) {
    const houseName = getHouseFromRoll(total);
    currentHouseName = houseName;
    
    if (!availableHouses[houseName]) {
        console.error(`ERROR: Rolled into ${houseName} with 0 NFTs!`);
        showToast('Rolled into house with no NFTs. Please try again.', 'error');
        document.getElementById('rollButton').disabled = false;
        return;
    }
    
    document.getElementById('rolledHouseName').textContent = houseName;
    document.getElementById('houseResult').style.display = 'block';
    
    const remaining = availableHouses[houseName].count;
    const countDisplay = document.createElement('p');
    countDisplay.style.color = '#00ff00';
    countDisplay.style.marginTop = '10px';
    countDisplay.textContent = `${remaining} NFT${remaining !== 1 ? 's' : ''} remaining`;
    countDisplay.className = 'nft-count';
    
    const houseResult = document.getElementById('houseResult');
    const existingCount = houseResult.querySelector('.nft-count');
    if (existingCount) existingCount.remove();
    houseResult.appendChild(countDisplay);
    
    showToast(`You rolled into ${houseName}!`, 'success');
    
    document.getElementById('rollButton').disabled = false;
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
        
        showToast('Claiming your Winion...', 'claim');
        
        const tx = await distributionContract.claimWinion(
            currentRollTotal,
            currentHouseName
        );
        
        claimButton.textContent = 'WAITING FOR CONFIRMATION...';
        showToast('Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        const event = receipt.logs.find(log => {
            try {
                const parsed = distributionContract.interface.parseLog(log);
                return parsed.name === 'NFTDistributed';
            } catch {
                return false;
            }
        });
        
        let tokenId = 'Unknown';
        if (event) {
            const parsed = distributionContract.interface.parseLog(event);
            tokenId = parsed.args.tokenId.toString();
        }
        
        showToast(`🎉 Claimed Winion #${tokenId}!`, 'success');
        
        showSuccessModal(tokenId, tx.hash);
        
    } catch (error) {
        console.error('Claim error:', error);
        
        const claimButton = document.getElementById('claimButton');
        claimButton.disabled = false;
        claimButton.textContent = 'CLAIM YOUR WINION';
        
        if (error.code === 'ACTION_REJECTED') {
            showToast('Transaction rejected', 'error');
        } else if (error.message.includes('No rolls available')) {
            showToast('No rolls available. Please purchase rolls first.', 'warning');
        } else if (error.message.includes('No NFTs available')) {
            showToast('No NFTs available for this house.', 'error');
        } else if (error.message.includes('Distribution is not active')) {
            showToast('Distribution is not currently active.', 'error');
        } else {
            showToast(error.message || 'Claim failed. Please try again.', 'error');
        }
    }
}

function showSuccessModal(tokenId, txHash) {
    document.getElementById('claimedHouseName').textContent = currentHouseName;
    document.getElementById('claimedTokenId').textContent = tokenId;
    document.getElementById('claimedRollTotal').textContent = currentRollTotal;
    document.getElementById('etherscanLink').href = `${CONFIG.ETHERSCAN_URL}/tx/${txHash}`;
    
    const houseImages = {
        'House of Havoc': 'havoc.gif',
        'House of Misfits': 'misfit.gif',
        'House of Frog': 'frog.gif',
        'House of Theory': 'theory.gif',
        'House of Spectrum': 'spectrum.gif',
        'House of Clay': 'clay.gif',
        'House of Stencil': 'stencil.gif',
        'House of Royal': 'royal.gif',
        'House of Shadows': 'shadow.gif',
        'House of Hellish': 'hellish.gif',
        'House of Hologram': 'hologram.gif',
        'House of Gold': 'gold.gif',
        'House of Death': 'winionswhat.gif'
    };
    
    const img = document.getElementById('claimedNFTImage');
    img.src = houseImages[currentHouseName] || 'havoc.gif';
    
    document.getElementById('successModal').style.display = 'flex';
}

function resetToRollsScreen() {
    document.getElementById('successModal').style.display = 'none';
    document.getElementById('diceScreen').style.display = 'none';
    document.getElementById('schoolScreen').style.display = 'none';
    document.getElementById('houseResult').style.display = 'none';
    document.getElementById('totalValue').textContent = '0';
    
    currentSchool = null;
    currentRollTotal = 0;
    currentHouseName = '';
    
    loadUserRolls();
}

if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else {
            userAddress = accounts[0];
            showToast('Wallet changed', 'info');
            loadUserRolls();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}
