// Winions Dice Roller - FIXED Smart Rolling
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

let provider;
let signer;
let userAddress;
let distributionContract;
let currentSchool = null;
let currentRollTotal = 0;
let currentHouseName = '';
let availableHouses = {};

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

window.addEventListener('load', async () => {
    document.getElementById('connectButton').addEventListener('click', connectWallet);
    document.getElementById('continueToSchool').addEventListener('click', showSchoolScreen);
    
    document.querySelectorAll('.school-button').forEach(button => {
        button.addEventListener('click', () => selectSchool(button.dataset.school));
    });
    
    document.getElementById('rollButton').addEventListener('click', rollDice);
    document.getElementById('claimButton').addEventListener('click', claimWinion);
});

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask to use this app!');
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
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        document.getElementById('connectButton').disabled = false;
        document.getElementById('walletStatus').style.display = 'none';
    }
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
        
        const isActive = await distributionContract.distributionActive();
        if (!isActive) {
            alert('⚠️ Distribution is not currently active. Please check back later!');
        }
        
    } catch (error) {
        console.error('Error loading rolls:', error);
        alert('Error loading your rolls. Please refresh and try again.');
    }
}

async function purchaseRolls(numberOfRolls) {
    try {
        document.getElementById('verificationStatus').innerHTML = 
            '<p class="info">⏳ Preparing transaction...</p>';
        
        const [single, three, five] = await distributionContract.getPrices();
        let price;
        
        if (numberOfRolls === 1) price = single;
        else if (numberOfRolls === 3) price = three;
        else if (numberOfRolls === 5) price = five;
        
        const tx = await distributionContract.purchaseRolls(numberOfRolls, {
            value: price
        });
        
        document.getElementById('verificationStatus').innerHTML = 
            '<p class="info">⏳ Transaction sent! Waiting for confirmation...</p>';
        
        await tx.wait();
        
        document.getElementById('verificationStatus').innerHTML = 
            '<p class="success">✅ Rolls purchased successfully!</p>';
        
        await loadUserRolls();
        
        setTimeout(() => {
            document.getElementById('verificationStatus').innerHTML = '';
        }, 3000);
        
    } catch (error) {
        console.error('Purchase error:', error);
        
        if (error.code === 'ACTION_REJECTED') {
            document.getElementById('verificationStatus').innerHTML = 
                '<p class="error">❌ Transaction rejected</p>';
        } else {
            document.getElementById('verificationStatus').innerHTML = 
                `<p class="error">❌ ${error.message || 'Purchase failed'}</p>`;
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
                    console.log(`✅ ${houseName}: ${countNum} NFTs`);
                }
            } catch (error) {
                console.error(`Error checking ${houseName}:`, error);
            }
        }
        
        console.log('Available houses:', Object.keys(availableHouses));
        
        if (Object.keys(availableHouses).length === 0) {
            alert('⚠️ No NFTs available in any house! Please contact admin.');
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

// FIXED: Generate dice that actually sum to target
function generateSmartDiceRolls() {
    const availableHousesList = Object.values(availableHouses);
    
    if (availableHousesList.length === 0) {
        // Fallback: random roll
        const rolls = [];
        for (let i = 0; i < 66; i++) {
            rolls.push(Math.floor(Math.random() * 6) + 1);
        }
        return rolls;
    }
    
    // Pick random house with NFTs
    const randomHouse = availableHousesList[Math.floor(Math.random() * availableHousesList.length)];
    
    // Pick random target within house range
    const target = Math.floor(Math.random() * (randomHouse.range.max - randomHouse.range.min + 1)) + randomHouse.range.min;
    
    console.log(`🎯 Target: ${target} (${Object.keys(availableHouses).find(k => availableHouses[k] === randomHouse)})`);
    
    // Generate 66 dice that sum to target
    const rolls = [];
    let remaining = target;
    
    // Roll first 65 dice
    for (let i = 0; i < 65; i++) {
        // Calculate how much we have left to distribute
        const diceLeft = 66 - i;
        const minPossible = diceLeft; // All remaining dice are 1
        const maxPossible = diceLeft * 6; // All remaining dice are 6
        
        // Find valid range for this die
        let minDie = Math.max(1, remaining - maxPossible + 6);
        let maxDie = Math.min(6, remaining - minPossible + 1);
        
        // Roll within valid range
        const roll = Math.floor(Math.random() * (maxDie - minDie + 1)) + minDie;
        rolls.push(roll);
        remaining -= roll;
    }
    
    // Last die is whatever's remaining
    rolls.push(remaining);
    
    // Validate
    const sum = rolls.reduce((a, b) => a + b, 0);
    console.log(`Rolls sum to: ${sum}, valid: ${rolls.every(r => r >= 1 && r <= 6)}`);
    
    return rolls;
}

function rollDice() {
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = true;
    
    const dice = document.querySelectorAll('.die');
    
    if (dice.length !== 66) {
        console.error(`ERROR: Found ${dice.length} dice, should be 66!`);
        alert('Dice loading error. Please refresh the page.');
        rollButton.disabled = false;
        return;
    }
    
    // Generate smart rolls that sum to target
    const rolls = generateSmartDiceRolls();
    
    console.log('Final rolls:', rolls);
    console.log('Sum:', rolls.reduce((a, b) => a + b, 0));
    
    // Animate
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
    
    // Check if house has NFTs
    if (!availableHouses[houseName]) {
        console.error(`ERROR: Rolled into ${houseName} with 0 NFTs!`);
        alert('⚠️ Error: Rolled into house with no NFTs. Please try again.');
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
        
        const tx = await distributionContract.claimWinion(
            currentRollTotal,
            currentHouseName
        );
        
        claimButton.textContent = 'WAITING FOR CONFIRMATION...';
        
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
        
        showSuccessModal(tokenId, tx.hash);
        
    } catch (error) {
        console.error('Claim error:', error);
        
        const claimButton = document.getElementById('claimButton');
        claimButton.disabled = false;
        claimButton.textContent = 'CLAIM YOUR WINION';
        
        if (error.code === 'ACTION_REJECTED') {
            alert('❌ Transaction rejected');
        } else if (error.message.includes('No rolls available')) {
            alert('❌ No rolls available. Please purchase rolls first.');
        } else if (error.message.includes('No NFTs available')) {
            alert('❌ No NFTs available for this house.');
        } else if (error.message.includes('Distribution is not active')) {
            alert('❌ Distribution is not currently active.');
        } else {
            alert(`❌ ${error.message || 'Claim failed. Please try again.'}`);
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
            loadUserRolls();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}
