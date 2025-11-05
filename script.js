// Winions Dice Roller - Complete Integration Script
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

let provider;
let signer;
let userAddress;
let distributionContract;
let currentSchool = null;
let currentRollTotal = 0;
let currentHouseName = '';

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
        
        // Setup ethers provider - FIXED FOR V5
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
        
        // Get prices - FIXED FOR V5
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
function selectSchool(school) {
    currentSchool = school;
    document.getElementById('schoolScreen').style.display = 'none';
    document.getElementById('diceScreen').style.display = 'block';
    document.getElementById('chosenSchool').textContent = school.toUpperCase();
    
    // Set theme color based on school
    const schoolColors = {
        anarchy: '#ff6b35',
        mischief: '#4a90e2',
        luck: '#50c878'
    };
    
    document.body.style.setProperty('--school-color', schoolColors[school] || '#ff1a1a');
    
    createDice();
}

// Create 66 Dice
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

// Roll Dice
function rollDice() {
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = true;
    
    const dice = document.querySelectorAll('.die');
    const rolls = [];
    
    // Animate and roll each die
    dice.forEach((die, index) => {
        die.classList.add('rolling');
        
        setTimeout(() => {
            const roll = Math.floor(Math.random() * 6) + 1;
            rolls.push(roll);
            die.textContent = roll;
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
    
    document.getElementById('rolledHouseName').textContent = houseName;
    document.getElementById('houseResult').style.display = 'block';
    
    document.getElementById('rollButton').disabled = false;
}

// Get House From Roll Total
function getHouseFromRoll(total) {
    if (total >= 66 && total <= 99) return 'House of Havoc';
    if (total >= 100 && total <= 132) return 'House of Misfits';
    if (total >= 133 && total <= 165) return 'House of Frog';
    if (total >= 166 && total <= 198) return 'House of Theory';
    if (total >= 199 && total <= 231) return 'House of Spectrum';
    if (total >= 232 && total <= 264) return 'House of Clay';
    if (total >= 265 && total <= 297) return 'House of Stencil';
    if (total >= 298 && total <= 330) return 'House of Royal';
    if (total >= 331 && total <= 363) return 'House of Shadows';
    if (total >= 364 && total <= 385) return 'House of Hellish';
    if (total >= 386 && total <= 392) return 'House of Hologram';
    if (total >= 393 && total <= 395) return 'House of Gold';
    if (total === 396) return 'House of Death';
    return 'Unknown House';
}

// Claim Winion
async function claimWinion() {
    try {
        const claimButton = document.getElementById('claimButton');
        claimButton.disabled = true;
        claimButton.textContent = 'CLAIMING...';
        
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
