// Winions Dice Roller - Smart Rolling with Inventory Check
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

let provider;
let signer;
let userAddress;
let distributionContract;
let currentSchool = null;
let currentRollTotal = 0;
let currentHouseName = '';
let availableHouses = {}; // Store houses with available NFTs

// House roll ranges
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

// Initialize on page load
window.addEventListener('load', async () => {
    document.getElementById('connectButton').addEventListener('click', connectWallet);
    document.getElementById('continueToSchool').addEventListener('click', showSchoolScreen);
    
    // School selection
    document.querySelectorAll('.school-button').forEach(button => {
        button.addEventListener('click', () => selectSchool(button.dataset.school));
    });
    
    // Dice rolling
    document.getElementById('rollButton').addEventListener('click', rollDice);
    
    // Claim button
    document.getElementById('claimButton').addEventListener('click', claimWinion);
});

// Connect Wallet
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask to use this app!');
            return;
        }

        document.getElementById('walletStatus').style.display = 'block';
        document.getElementById('walletStatus').textContent = 'Opening wallet connection...';
        document.getElementById('connectButton').disabled = true;

        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        userAddress = accounts[0];
        
        // Setup ethers provider - V5 syntax
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Initialize contract
        distributionContract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            DISTRIBUTION_CONTRACT_ABI,
            signer
        );
        
        // Check if on correct network
        const network = await provider.getNetwork();
        if (network.chainId !== CONFIG.CHAIN_ID) {
            throw new Error('Please switch to Ethereum Mainnet');
        }
        
        document.getElementById('walletStatus').textContent = `Connected: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        
        // Load user's rolls
        await loadUserRolls();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        
        if (error.code === 4001) {
            document.getElementById('verificationStatus').innerHTML = 
                '<p class="error">❌ Connection rejected. Please try again and approve the connection in your wallet.</p>';
        } else if (error.message && error.message.includes('ethereum')) {
            document.getElementById('verificationStatus').innerHTML = 
                '<p class="error">❌ Wallet Conflict Detected<br>You have multiple wallet extensions installed that are conflicting.<br><strong>Quick Fix:</strong> Disable all wallet extensions except one (keep MetaMask), then refresh the page.</p>';
        } else {
            document.getElementById('verificationStatus').innerHTML = 
                `<p class="error">❌ ${error.message || 'Connection failed'}</p>`;
        }
        
        document.getElementById('connectButton').disabled = false;
        document.getElementById('walletStatus').style.display = 'none';
    }
}

// Load User's Rolls
async function loadUserRolls() {
    try {
        // Get user's rolls from contract
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        
        document.getElementById('freeRollsCount').textContent = freeRolls.toString();
        document.getElementById('paidRollsCount').textContent = paidRolls.toString();
        
        // Get prices - V5 syntax
        const [single, three, five] = await distributionContract.getPrices();
        document.getElementById('price1').textContent = `${ethers.utils.formatEther(single)} ETH`;
        document.getElementById('price3').textContent = `${ethers.utils.formatEther(three)} ETH`;
        document.getElementById('price5').textContent = `${ethers.utils.formatEther(five)} ETH`;
        
        // Show rolls screen
        document.getElementById('walletScreen').style.display = 'none';
        document.getElementById('rollsScreen').style.display = 'block';
        
        // Check if distribution is active
        const isActive = await distributionContract.distributionActive();
        if (!isActive) {
            alert('⚠️ Distribution is not currently active. Please check back later!');
        }
        
    } catch (error) {
        console.error('Error loading rolls:', error);
        alert('Error loading your rolls. Please refresh and try again.');
    }
}

// Purchase Rolls
async function purchaseRolls(numberOfRolls) {
    try {
        document.getElementById('verificationStatus').innerHTML = 
            '<p class="info">⏳ Preparing transaction...</p>';
        
        // Get price from contract
        const [single, three, five] = await distributionContract.getPrices();
        let price;
        
        if (numberOfRolls === 1) price = single;
        else if (numberOfRolls === 3) price = three;
        else if (numberOfRolls === 5) price = five;
        
        // Send transaction
        const tx = await distributionContract.purchaseRolls(numberOfRolls, {
            value: price
        });
        
        document.getElementById('verificationStatus').innerHTML = 
            '<p class="info">⏳ Transaction sent! Waiting for confirmation...</p>';
        
        await tx.wait();
        
        document.getElementById('verificationStatus').innerHTML = 
            '<p class="success">✅ Rolls purchased successfully!</p>';
        
        // Reload rolls
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

// Show School Selection Screen
function showSchoolScreen() {
    document.getElementById('rollsScreen').style.display = 'none';
    document.getElementById('schoolScreen').style.display = 'block';
}

// Select School
async function selectSchool(school) {
    currentSchool = school;
    document.getElementById('schoolScreen').style.display = 'none';
    
    // Show loading state
    document.getElementById('diceScreen').style.display = 'block';
    document.getElementById('chosenSchool').textContent = school.toUpperCase();
    document.getElementById('rollButton').disabled = true;
    document.getElementById('rollButton').textContent = 'CHECKING INVENTORY...';
    
    // Set theme color based on school
    const schoolColors = {
        anarchy: '#ff6b35',
        mischief: '#4a90e2',
        luck: '#50c878'
    };
    
    document.body.style.setProperty('--school-color', schoolColors[school] || '#ff1a1a');
    
    // Check house inventory BEFORE creating dice
    await checkAvailableHouses();
    
    createDice();
    
    document.getElementById('rollButton').disabled = false;
    document.getElementById('rollButton').textContent = '🎲 ROLL THE DICE 🎲';
}

// Check Available Houses
async function checkAvailableHouses() {
    try {
        availableHouses = {};
        
        // Check each house's inventory
        for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
            try {
                const count = await distributionContract.getHouseInventoryCount(houseName);
                const countNum = Number(count);
                
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
        
        console.log('Available houses:', availableHouses);
        
        if (Object.keys(availableHouses).length === 0) {
            alert('⚠️ No NFTs available in any house! Please contact admin.');
            document.getElementById('rollButton').disabled = true;
        }
        
    } catch (error) {
        console.error('Error checking houses:', error);
    }
}

// Create 66 Dice
function createDice() {
    const diceDisplay = document.getElementById('diceDisplay');
    diceDisplay.innerHTML = '';
    
    // Create exactly 66 dice
    for (let i = 0; i < 66; i++) {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = '?';
        die.id = `die-${i}`;
        diceDisplay.appendChild(die);
    }
    
    console.log('Created 66 dice');
}

// Smart Roll - ensures landing in available house
function generateSmartRoll() {
    const availableRanges = Object.values(availableHouses).map(h => h.range);
    
    if (availableRanges.length === 0) {
        // Fallback to random if no houses available
        return Math.floor(Math.random() * 331) + 66; // 66-396
    }
    
    // Pick a random available house
    const randomHouse = availableRanges[Math.floor(Math.random() * availableRanges.length)];
    
    // Generate roll within that house's range
    const roll = Math.floor(Math.random() * (randomHouse.max - randomHouse.min + 1)) + randomHouse.min;
    
    return roll;
}

// Roll Dice
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
    
    // Generate smart roll total
    const targetTotal = generateSmartRoll();
    console.log('Target roll total:', targetTotal);
    
    // Calculate what each die should roll to hit target
    // Average per die needed
    const avgNeeded = targetTotal / 66;
    
    const rolls = [];
    let currentSum = 0;
    
    // Roll all dice except the last one
    for (let i = 0; i < 65; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        rolls.push(roll);
        currentSum += roll;
    }
    
    // Calculate last die to hit target (or get as close as possible)
    const neededForLast = targetTotal - currentSum;
    let lastDie;
    
    if (neededForLast >= 1 && neededForLast <= 6) {
        lastDie = neededForLast;
    } else if (neededForLast < 1) {
        lastDie = 1;
    } else {
        lastDie = 6;
    }
    
    rolls.push(lastDie);
    
    console.log('Dice rolls:', rolls);
    console.log('Final total:', rolls.reduce((a, b) => a + b, 0));
    
    // Animate and display each die
    dice.forEach((die, index) => {
        die.classList.add('rolling');
        
        setTimeout(() => {
            die.textContent = rolls[index];
            die.classList.remove('rolling');
            
            // Calculate total after all dice are rolled
            if (index === 65) {
                setTimeout(() => {
                    calculateTotal(rolls);
                }, 500);
            }
        }, index * 30);
    });
}

// Calculate Total
function calculateTotal(rolls) {
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    currentRollTotal = total;
    
    console.log('Total calculated:', total);
    
    // Animate counting up
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

// Reveal House
function revealHouse(total) {
    const houseName = getHouseFromRoll(total);
    currentHouseName = houseName;
    
    // Check if this house has NFTs available
    if (!availableHouses[houseName]) {
        console.error('Rolled into house with no NFTs:', houseName);
        alert('⚠️ Error: This house has no NFTs available. Please try again.');
        document.getElementById('rollButton').disabled = false;
        return;
    }
    
    document.getElementById('rolledHouseName').textContent = houseName;
    document.getElementById('houseResult').style.display = 'block';
    
    // Show how many NFTs are left in this house
    const remaining = availableHouses[houseName].count;
    const countDisplay = document.createElement('p');
    countDisplay.style.color = '#00ff00';
    countDisplay.style.marginTop = '10px';
    countDisplay.textContent = `${remaining} NFT${remaining !== 1 ? 's' : ''} remaining in this house`;
    
    const houseResult = document.getElementById('houseResult');
    const existingCount = houseResult.querySelector('.nft-count');
    if (existingCount) {
        existingCount.remove();
    }
    countDisplay.className = 'nft-count';
    houseResult.appendChild(countDisplay);
    
    document.getElementById('rollButton').disabled = false;
}

// Get House From Roll Total
function getHouseFromRoll(total) {
    for (const [houseName, range] of Object.entries(HOUSE_RANGES)) {
        if (total >= range.min && total <= range.max) {
            return houseName;
        }
    }
    return 'Unknown House';
}

// Claim Winion
async function claimWinion() {
    try {
        const claimButton = document.getElementById('claimButton');
        claimButton.disabled = true;
        claimButton.textContent = 'CLAIMING...';
        
        // Double-check house has NFTs before claiming
        const count = await distributionContract.getHouseInventoryCount(currentHouseName);
        if (Number(count) === 0) {
            throw new Error('No NFTs available in this house');
        }
        
        // Call contract
        const tx = await distributionContract.claimWinion(
            currentRollTotal,
            currentHouseName
        );
        
        claimButton.textContent = 'WAITING FOR CONFIRMATION...';
        
        const receipt = await tx.wait();
        
        // Find the NFTDistributed event
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
        
        // Show success modal
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
            alert('❌ No NFTs available for this house. Please try again or contact support.');
        } else if (error.message.includes('Distribution is not active')) {
            alert('❌ Distribution is not currently active.');
        } else {
            alert(`❌ ${error.message || 'Claim failed. Please try again.'}`);
        }
    }
}

// Show Success Modal
function showSuccessModal(tokenId, txHash) {
    document.getElementById('claimedHouseName').textContent = currentHouseName;
    document.getElementById('claimedTokenId').textContent = tokenId;
    document.getElementById('claimedRollTotal').textContent = currentRollTotal;
    document.getElementById('etherscanLink').href = `${CONFIG.ETHERSCAN_URL}/tx/${txHash}`;
    
    // Set house image if available
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

// Reset to Rolls Screen
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

// Handle account changes
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
