// Winions Contract Address
const WINIONS_CONTRACT = CONFIG.CONTRACT_ADDRESS;
const ETHEREUM_MAINNET = CONFIG.CHAIN_ID;
const DEVELOPMENT_MODE = CONFIG.DEVELOPMENT_MODE;
const SKIP_VERIFICATION = CONFIG.SKIP_VERIFICATION;

// Web3 Variables
let provider = null;
let signer = null;
let userAddress = null;
let selectedSchool = '';

// ERC721 ABI (just the balanceOf function we need)
const ERC721_ABI = [
    "function balanceOf(address owner) view returns (uint256)"
];

const houseData = {
    'House of Havoc': { min: 66, max: 175, image: 'havoc.gif', rarity: 'COMMON', class: 'common-badge' },
    'House of Misfits': { min: 176, max: 230, image: 'misfit.gif', rarity: 'COMMON', class: 'common-badge' },
    'House of Frog': { min: 231, max: 263, image: 'frog.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Theory': { min: 264, max: 290, image: 'theory.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Spectrum': { min: 291, max: 312, image: 'spectrum.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Clay': { min: 313, max: 329, image: 'clay.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Stencil': { min: 330, max: 345, image: 'stencil.gif', rarity: 'UNCOMMON', class: 'uncommon-badge' },
    'House of Royal': { min: 346, max: 356, image: 'royal.gif', rarity: 'RARE', class: 'rare-badge' },
    'House of Shadows': { min: 357, max: 367, image: 'shadow.gif', rarity: 'RARE', class: 'rare-badge' },
    'House of Hellish': { min: 368, max: 378, image: 'hellish.gif', rarity: 'RARE', class: 'rare-badge' },
    'House of Hologram': { min: 379, max: 389, image: 'hologram.gif', rarity: 'ULTRA RARE', class: 'ultra-rare-badge' },
    'House of Gold': { min: 390, max: 394, image: 'gold.gif', rarity: 'ULTRA RARE', class: 'ultra-rare-badge' },
    'House of Death': { min: 395, max: 396, image: 'winionswhat.gif', rarity: 'MYTHIC', class: 'mythic-badge' }
};

// DOM Elements
const walletGate = document.getElementById('walletGate');
const schoolButtons = document.querySelectorAll('.school-button');
const schoolSelection = document.getElementById('schoolSelection');
const diceRolling = document.getElementById('diceRolling');
const chosenSchoolSpan = document.getElementById('chosenSchool');
const rollButton = document.getElementById('rollButton');
const closeButton = document.getElementById('closeButton');
const diceDisplay = document.getElementById('diceDisplay');
const totalValue = document.getElementById('totalValue');
const modal = document.getElementById('modal');
const housePlaceholder = document.getElementById('housePlaceholder');
const houseName = document.getElementById('houseName');
const houseRarity = document.getElementById('houseRarity');
const rollTotal = document.getElementById('rollTotal');

// Wallet Gate Elements
const connectButton = document.getElementById('connectButton');
const walletStatus = document.getElementById('walletStatus');
const verificationStatus = document.getElementById('verificationStatus');

// Initialize Wallet Connection
async function initWallet() {
    connectButton.addEventListener('click', connectWallet);
}

// Connect Wallet
async function connectWallet() {
    try {
        connectButton.disabled = true;
        connectButton.textContent = 'CONNECTING...';
        walletStatus.textContent = 'Opening wallet connection...';
        
        // Check if MetaMask or other Web3 provider exists
        if (typeof window.ethereum !== 'undefined') {
            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            userAddress = accounts[0];
            
            // Create provider
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            
            // Show connected address
            const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            walletStatus.textContent = `Connected: ${shortAddress}`;
            
            // Check network
            const network = await provider.getNetwork();
            if (Number(network.chainId) !== ETHEREUM_MAINNET) {
                verificationStatus.className = 'verification-status error';
                verificationStatus.innerHTML = '⚠️ Please switch to Ethereum Mainnet';
                connectButton.disabled = false;
                connectButton.textContent = 'CONNECT WALLET';
                return;
            }
            
            // Verify NFT ownership
            await verifyNFTOwnership();
            
        } else {
            throw new Error('No Web3 wallet found. Please install MetaMask or another Web3 wallet.');
        }
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        verificationStatus.className = 'verification-status error';
        verificationStatus.innerHTML = `❌ ${error.message || 'Failed to connect wallet'}`;
        connectButton.disabled = false;
        connectButton.textContent = 'CONNECT WALLET';
    }
}

// Verify NFT Ownership
async function verifyNFTOwnership() {
    try {
        verificationStatus.className = 'verification-status checking';
        verificationStatus.textContent = '🔍 Checking Winion ownership...';
        
        // DEVELOPMENT MODE BYPASS
        if (DEVELOPMENT_MODE && SKIP_VERIFICATION) {
            console.warn('⚠️ DEVELOPMENT MODE: Skipping NFT verification');
            verificationStatus.className = 'verification-status success';
            verificationStatus.innerHTML = `✅ [DEV MODE] Access granted without verification`;
            setTimeout(() => {
                grantAccess();
            }, 1000);
            return;
        }
        
        // Create contract instance
        const contract = new ethers.Contract(WINIONS_CONTRACT, ERC721_ABI, provider);
        
        // Check balance
        const balance = await contract.balanceOf(userAddress);
        const balanceNumber = Number(balance);
        
        if (balanceNumber > 0) {
            // Success! They own Winions
            verificationStatus.className = 'verification-status success';
            verificationStatus.innerHTML = `✅ Verified! You own ${balanceNumber} Winion${balanceNumber > 1 ? 's' : ''}.<br>Granting access...`;
            
            // Grant access after 2 seconds
            setTimeout(() => {
                grantAccess();
            }, 2000);
            
        } else {
            // No Winions found
            verificationStatus.className = 'verification-status error';
            verificationStatus.innerHTML = `❌ No Winions found in your wallet.<br><a href="${CONFIG.MINT_URL}" target="_blank" class="mint-link">Mint a Winion to access the dice roller</a>`;
            connectButton.disabled = false;
            connectButton.textContent = 'TRY AGAIN';
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        verificationStatus.className = 'verification-status error';
        verificationStatus.innerHTML = `❌ Error verifying ownership: ${error.message}<br>Please try again.`;
        connectButton.disabled = false;
        connectButton.textContent = 'TRY AGAIN';
    }
}

// Grant Access to Dice Roller
function grantAccess() {
    walletGate.style.display = 'none';
    schoolSelection.style.display = 'block';
}

// Listen for account changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            // User disconnected wallet
            location.reload();
        } else {
            // User switched accounts
            location.reload();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        // User switched networks
        location.reload();
    });
}

// School Selection
schoolButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedSchool = button.dataset.school;
        
        // Update the chosen school display
        chosenSchoolSpan.textContent = selectedSchool.toUpperCase();
        
        // Transition to dice rolling screen
        schoolSelection.style.display = 'none';
        diceRolling.style.display = 'block';
        
        // Initialize dice
        createDice();
    });
});

// Create 66 dice
function createDice() {
    diceDisplay.innerHTML = '';
    for (let i = 0; i < 66; i++) {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = '?';
        diceDisplay.appendChild(die);
    }
}

// Roll all 66 dice
function rollDice() {
    rollButton.disabled = true;
    modal.classList.remove('show');
    
    const dice = document.querySelectorAll('.die');
    const rolls = [];
    
    dice.forEach((die, index) => {
        die.classList.add('rolling');
        
        setTimeout(() => {
            const roll = Math.floor(Math.random() * 6) + 1;
            rolls.push(roll);
            die.textContent = roll;
            die.classList.remove('rolling');
            
            if (index === 65) {
                setTimeout(() => {
                    calculateTotal(rolls);
                }, 500);
            }
        }, index * 30);
    });
}

// Calculate total and animate counter
function calculateTotal(rolls) {
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    
    let currentTotal = 0;
    const increment = Math.ceil(total / 50);
    const counter = setInterval(() => {
        currentTotal += increment;
        if (currentTotal >= total) {
            currentTotal = total;
            clearInterval(counter);
            setTimeout(() => {
                revealHouse(total);
            }, 800);
        }
        totalValue.textContent = currentTotal;
    }, 20);
}

// Reveal which house based on total
function revealHouse(total) {
    for (const [name, data] of Object.entries(houseData)) {
        if (total >= data.min && total <= data.max) {
            // Check if image exists, otherwise show text placeholder
            const img = new Image();
            img.onload = function() {
                housePlaceholder.innerHTML = `<img src="${data.image}" alt="${name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 10px;">`;
            };
            img.onerror = function() {
                housePlaceholder.textContent = data.image.split('.')[0].toUpperCase();
            };
            img.src = data.image;
            
            houseName.textContent = name;
            houseRarity.textContent = data.rarity;
            houseRarity.className = `rarity-badge ${data.class}`;
            rollTotal.textContent = total;
            
            // Add school info to modal
            const schoolInfo = document.createElement('p');
            schoolInfo.style.cssText = 'margin-top: 10px; font-size: 16px; color: #999;';
            schoolInfo.textContent = `School of ${selectedSchool.toUpperCase()}`;
            
            // Insert before rarity badge if not already there
            if (!document.querySelector('.school-info')) {
                schoolInfo.className = 'school-info';
                houseRarity.parentElement.insertBefore(schoolInfo, houseRarity);
            }
            
            break;
        }
    }
    
    modal.classList.add('show');
    rollButton.disabled = false;
}

// Reset game
function resetGame() {
    modal.classList.remove('show');
    
    // Remove school info if it exists
    const schoolInfo = document.querySelector('.school-info');
    if (schoolInfo) schoolInfo.remove();
    
    // Go back to school selection
    diceRolling.style.display = 'none';
    schoolSelection.style.display = 'block';
    totalValue.textContent = '0';
    selectedSchool = '';
}

// Event Listeners
if (rollButton) {
    rollButton.addEventListener('click', rollDice);
}
if (closeButton) {
    closeButton.addEventListener('click', resetGame);
}

// Initialize wallet on page load
initWallet();
