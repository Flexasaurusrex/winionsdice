// Winions Dice Roller - FINAL SEAMLESS VERSION
// ✅ Spinning number animation
// ✅ Post-roll flow (roll again or purchase)
// ✅ Button disables after click
// ✅ Smart inventory checking
// ✅ Multi-wallet support
// ✅ Mobile support

console.log('🎲 Winions Dice Roller Script Loaded!');
console.log('🔍 Checking dependencies...');
console.log('  - ethers:', typeof ethers !== 'undefined' ? '✅' : '❌');
console.log('  - CONFIG:', typeof CONFIG !== 'undefined' ? '✅' : '❌');
console.log('  - CONTRACT_ABI:', typeof CONTRACT_ABI !== 'undefined' ? '✅' : '❌');
console.log('  - DISTRIBUTION_CONTRACT_ABI:', typeof DISTRIBUTION_CONTRACT_ABI !== 'undefined' ? '✅' : '❌');

let provider;
let signer;
let contract;
let userAddress;
let currentRolls = 0;
let availableHouses = {};
let isRolling = false; // Prevent multiple rolls

// Inject custom styles for spinning number and toasts
function injectStyles() {
    const styles = `
        <style>
            /* Spinning Number Container */
            .dice-number-container {
                width: 100%;
                height: 400px;
                display: flex;
                align-items: center;
                justify-content: center;
                perspective: 1000px;
                margin: 40px 0;
            }

            .dice-number {
                font-size: 180px;
                font-weight: 900;
                color: #ff0000;
                text-shadow: 
                    0 0 20px rgba(255, 0, 0, 0.8),
                    0 0 40px rgba(255, 0, 0, 0.6),
                    0 0 60px rgba(255, 0, 0, 0.4),
                    0 0 80px rgba(255, 0, 0, 0.2);
                font-family: 'Arial Black', sans-serif;
                letter-spacing: -5px;
                transition: all 0.3s ease;
            }

            .dice-number.spinning {
                animation: spinNumber 0.1s linear infinite, glowPulse 0.3s ease-in-out infinite;
            }

            .dice-number.reveal {
                animation: revealNumber 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            .dice-number.idle {
                animation: idlePulse 2s ease-in-out infinite;
            }

            @keyframes spinNumber {
                0% { transform: rotateX(0deg); }
                100% { transform: rotateX(360deg); }
            }

            @keyframes glowPulse {
                0%, 100% { 
                    text-shadow: 
                        0 0 20px rgba(255, 0, 0, 0.8),
                        0 0 40px rgba(255, 0, 0, 0.6),
                        0 0 60px rgba(255, 0, 0, 0.4);
                }
                50% { 
                    text-shadow: 
                        0 0 30px rgba(255, 0, 0, 1),
                        0 0 60px rgba(255, 0, 0, 0.8),
                        0 0 90px rgba(255, 0, 0, 0.6);
                }
            }

            @keyframes revealNumber {
                0% {
                    transform: scale(0.5) rotateX(180deg);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.2) rotateX(0deg);
                }
                100% {
                    transform: scale(1) rotateX(0deg);
                    opacity: 1;
                }
            }

            @keyframes idlePulse {
                0%, 100% { 
                    transform: scale(1);
                    text-shadow: 
                        0 0 20px rgba(255, 0, 0, 0.6),
                        0 0 40px rgba(255, 0, 0, 0.4);
                }
                50% { 
                    transform: scale(1.05);
                    text-shadow: 
                        0 0 30px rgba(255, 0, 0, 0.8),
                        0 0 50px rgba(255, 0, 0, 0.6);
                }
            }

            /* Mobile Responsive */
            @media (max-width: 768px) {
                .dice-number-container {
                    height: 300px;
                }
                .dice-number {
                    font-size: 120px;
                }
            }

            @media (max-width: 480px) {
                .dice-number-container {
                    height: 250px;
                }
                .dice-number {
                    font-size: 100px;
                }
            }

            /* Custom Toast Notifications */
            .custom-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
                border: 2px solid #ff0000;
                border-radius: 12px;
                padding: 16px 24px;
                color: white;
                font-size: 16px;
                font-weight: 600;
                box-shadow: 
                    0 0 20px rgba(255, 0, 0, 0.5),
                    0 4px 20px rgba(0, 0, 0, 0.5);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
                max-width: 400px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .custom-toast.success {
                border-color: #00ff00;
                box-shadow: 
                    0 0 20px rgba(0, 255, 0, 0.5),
                    0 4px 20px rgba(0, 0, 0, 0.5);
            }

            .custom-toast.error {
                border-color: #ff0000;
                box-shadow: 
                    0 0 20px rgba(255, 0, 0, 0.5),
                    0 4px 20px rgba(0, 0, 0, 0.5);
            }

            .custom-toast.warning {
                border-color: #ffa500;
                box-shadow: 
                    0 0 20px rgba(255, 165, 0, 0.5),
                    0 4px 20px rgba(0, 0, 0, 0.5);
            }

            .custom-toast.info {
                border-color: #00bfff;
                box-shadow: 
                    0 0 20px rgba(0, 191, 255, 0.5),
                    0 4px 20px rgba(0, 0, 0, 0.5);
            }

            .toast-icon {
                font-size: 24px;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @media (max-width: 768px) {
                .custom-toast {
                    right: 10px;
                    left: 10px;
                    max-width: calc(100% - 20px);
                }
            }

            /* Button Disabled State */
            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }

            /* Pulse Animation for Claim Button */
            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
                }
                50% {
                    transform: scale(1.05);
                    box-shadow: 0 0 20px 10px rgba(255, 0, 0, 0);
                }
            }

            /* Mobile Instructions Modal */
            .mobile-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
            }

            .mobile-modal-content {
                background: #1a1a1a;
                border: 2px solid #ff0000;
                border-radius: 16px;
                padding: 32px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 0 40px rgba(255, 0, 0, 0.3);
            }

            .mobile-modal h3 {
                color: #ff0000;
                margin-top: 0;
                font-size: 24px;
                text-align: center;
            }

            .mobile-modal ol {
                color: white;
                line-height: 1.8;
                padding-left: 20px;
            }

            .mobile-modal-buttons {
                display: flex;
                gap: 12px;
                margin-top: 24px;
            }

            .mobile-modal-buttons button {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                border: 2px solid #ff0000;
                background: transparent;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .mobile-modal-buttons button:hover {
                background: #ff0000;
                transform: scale(1.05);
            }

            .url-copy-box {
                background: #000;
                border: 1px solid #ff0000;
                border-radius: 8px;
                padding: 12px;
                margin: 16px 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .url-copy-box input {
                flex: 1;
                background: transparent;
                border: none;
                color: white;
                font-size: 14px;
            }

            .url-copy-box button {
                padding: 8px 16px;
                background: #ff0000;
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                font-weight: 600;
            }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
}

// Initialize styles on load
document.addEventListener('DOMContentLoaded', injectStyles);

// Custom Toast Notification System
function showToast(message, type = 'info') {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Mobile Detection
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Show Mobile Instructions Modal
function showMobileInstructions() {
    const currentUrl = window.location.href;
    
    const modal = document.createElement('div');
    modal.className = 'mobile-modal';
    modal.innerHTML = `
        <div class="mobile-modal-content">
            <h3>📱 Connect on Mobile</h3>
            <ol>
                <li><strong>Open Your Wallet App</strong><br>Launch MetaMask, Coinbase Wallet, Trust Wallet, or Rainbow</li>
                <li><strong>Tap the Browser Tab</strong><br>Look for the browser icon (usually at the bottom)</li>
                <li><strong>Paste this URL:</strong></li>
            </ol>
            <div class="url-copy-box">
                <input type="text" value="${currentUrl}" readonly id="urlToCopy">
                <button onclick="copyUrlToClipboard()">COPY</button>
            </div>
            <ol start="4">
                <li><strong>Connect Your Wallet</strong><br>Click "Connect Wallet" when the site loads</li>
            </ol>
            <div class="mobile-modal-buttons">
                <button onclick="closeMobileModal()">CLOSE</button>
                <button onclick="tryOpenInApp()">TRY OPENING IN APP</button>
            </div>
            <p style="text-align: center; color: #888; font-size: 12px; margin-top: 16px;">
                💡 Works with MetaMask, Coinbase Wallet, Trust Wallet, Rainbow, and other mobile wallets
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function copyUrlToClipboard() {
    const input = document.getElementById('urlToCopy');
    input.select();
    document.execCommand('copy');
    showToast('URL copied to clipboard!', 'success');
}

function closeMobileModal() {
    const modal = document.querySelector('.mobile-modal');
    if (modal) modal.remove();
}

function tryOpenInApp() {
    const currentUrl = window.location.href;
    window.location.href = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;
}

// Connect Wallet with Universal Support
async function connectWallet() {
    try {
        // Check if on mobile without wallet browser
        if (isMobile() && !window.ethereum) {
            showMobileInstructions();
            return;
        }

        if (!window.ethereum) {
            showToast('Please install a Web3 wallet (MetaMask, Coinbase Wallet, Rainbow, etc.)', 'error');
            return;
        }

        showToast('Connecting to wallet...', 'info');

        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        const accounts = await provider.send("eth_requestAccounts", []);
        userAddress = accounts[0];
        
        signer = provider.getSigner();

        // Detect which wallet is connected
        const walletName = window.ethereum.isMetaMask ? 'MetaMask' : 
                          window.ethereum.isCoinbaseWallet ? 'Coinbase Wallet' :
                          window.ethereum.isRabby ? 'Rabby' :
                          window.ethereum.isTrust ? 'Trust Wallet' :
                          'Your Wallet';

        // Check network
        const network = await provider.getNetwork();
        console.log('✅ Network:', network.chainId, 'Expected:', CONFIG.CHAIN_ID);
        
        if (network.chainId !== CONFIG.CHAIN_ID) {
            showToast('Switching to Ethereum Mainnet...', 'info');
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x1' }],
                });
                console.log('✅ Network switched');
            } catch (error) {
                console.log('❌ Network switch failed:', error);
                showToast('Please switch to Ethereum Mainnet manually', 'error');
                return;
            }
        }

        // Initialize contract
        console.log('🔵 Initializing contract...');
        contract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            DISTRIBUTION_CONTRACT_ABI,
            signer
        );
        console.log('✅ Contract initialized');

        // Update UI
        document.getElementById('connectButton').style.display = 'none';
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('userAddress').textContent = 
            `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

        showToast(`Connected with ${walletName}!`, 'success');
        console.log('✅ UI updated');

        // Check rolls and available houses
        console.log('🔵 Checking rolls...');
        await checkUserRolls();
        console.log('🔵 Checking available houses...');
        await checkAvailableHouses();
        
        console.log('✅ Connection complete!');

    } catch (error) {
        console.error('❌ Connection error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        
        if (error.code === 4001) {
            showToast('Connection rejected. Please try again.', 'warning');
        } else if (error.code === -32002) {
            showToast('Connection request pending. Please check your wallet.', 'warning');
        } else {
            showToast('Failed to connect wallet: ' + error.message, 'error');
        }
    }
}

// Check Available Houses (Smart Inventory)
async function checkAvailableHouses() {
    try {
        const houses = await contract.getAllHouses();
        availableHouses = {};
        
        for (const house of houses) {
            const count = await contract.getHouseInventoryCount(house);
            if (count.toNumber() > 0) {
                availableHouses[house] = count.toNumber();
            }
        }

        console.log('Available houses:', availableHouses);

        if (Object.keys(availableHouses).length === 0) {
            showToast('No NFTs available for distribution yet', 'warning');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error checking available houses:', error);
        return false;
    }
}

// Check User Rolls
async function checkUserRolls() {
    try {
        const [freeRolls, paidRolls] = await contract.getUserRolls(userAddress);
        currentRolls = freeRolls.toNumber() + paidRolls.toNumber();
        
        document.getElementById('rollCount').textContent = currentRolls;
        
        console.log('User rolls:', {
            free: freeRolls.toNumber(),
            paid: paidRolls.toNumber(),
            total: currentRolls
        });

        return currentRolls;
    } catch (error) {
        console.error('Error checking rolls:', error);
        return 0;
    }
}

// Purchase Rolls
async function purchaseRolls(numberOfRolls) {
    try {
        const prices = await contract.getPrices();
        let price;
        
        if (numberOfRolls === 1) {
            price = prices.single;
        } else if (numberOfRolls === 3) {
            price = prices.three;
        } else if (numberOfRolls === 5) {
            price = prices.five;
        }

        showToast(`Purchasing ${numberOfRolls} roll${numberOfRolls > 1 ? 's' : ''}...`, 'info');

        const tx = await contract.purchaseRolls(numberOfRolls, { value: price });
        
        showToast('Transaction sent! Waiting for confirmation...', 'info');
        
        await tx.wait();
        
        showToast(`Successfully purchased ${numberOfRolls} roll${numberOfRolls > 1 ? 's' : ''}!`, 'success');
        
        await checkUserRolls();
        
    } catch (error) {
        console.error('Purchase error:', error);
        if (error.code === 4001) {
            showToast('Transaction cancelled', 'warning');
        } else {
            showToast('Failed to purchase rolls', 'error');
        }
    }
}

// Continue to Roll Screen
async function continueToRoll() {
    // Double-check rolls before proceeding
    const rolls = await checkUserRolls();
    
    if (rolls === 0) {
        showToast('You need to purchase rolls first!', 'warning');
        // Highlight purchase section
        document.getElementById('purchaseSection').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('purchaseSection').style.animation = 'pulse 1s ease-in-out 3';
        return;
    }

    // Check if NFTs are available
    const hasNFTs = await checkAvailableHouses();
    if (!hasNFTs) {
        showToast('No NFTs available for distribution yet', 'error');
        return;
    }

    document.getElementById('purchaseSection').style.display = 'none';
    document.getElementById('rollSection').style.display = 'block';
    
    // Create the spinning number container
    createSpinningNumberDisplay();
}

// Create Spinning Number Display
function createSpinningNumberDisplay() {
    const container = document.getElementById('diceContainer');
    container.innerHTML = `
        <div class="dice-number-container">
            <div class="dice-number" id="spinningNumber">0</div>
        </div>
    `;
}

// Roll Dice with Spinning Number
async function rollDice() {
    // CRITICAL: Check if there's an unclaimed roll first
    if (window.currentRoll && !window.currentRoll.claimed) {
        showToast('⚠️ You must claim your previous Winion before rolling again!', 'warning');
        // Scroll to claim button
        document.getElementById('rollResult').scrollIntoView({ behavior: 'smooth' });
        // Pulse the claim button
        const claimButton = document.getElementById('claimButton');
        claimButton.style.animation = 'pulse 0.5s ease-in-out 3';
        return;
    }

    // CRITICAL: Check rolls one more time and prevent double-clicking
    if (isRolling) {
        console.log('Already rolling, please wait...');
        return;
    }

    const rolls = await checkUserRolls();
    if (rolls === 0) {
        showToast('You have no rolls left! Redirecting to purchase...', 'warning');
        setTimeout(() => {
            document.getElementById('rollSection').style.display = 'none';
            document.getElementById('purchaseSection').style.display = 'block';
            document.getElementById('purchaseSection').scrollIntoView({ behavior: 'smooth' });
        }, 1500);
        return;
    }

    // Set rolling state and disable button
    isRolling = true;
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = true;
    rollButton.textContent = 'ROLLING...';

    try {
        const numberDisplay = document.getElementById('spinningNumber');
        
        // Pick a random available house
        const houseNames = Object.keys(availableHouses);
        if (houseNames.length === 0) {
            showToast('No NFTs available!', 'error');
            isRolling = false;
            rollButton.disabled = false;
            rollButton.textContent = 'ROLL DICE';
            return;
        }

        const targetHouse = houseNames[Math.floor(Math.random() * houseNames.length)];
        
        // Get house roll range
        const houseRanges = {
            "House of Havoc": [66, 175],
            "House of Misfits": [176, 230],
            "House of Frog": [231, 263],
            "House of Theory": [264, 290],
            "House of Spectrum": [291, 312],
            "House of Clay": [313, 329],
            "House of Stencil": [330, 345],
            "House of Royal": [346, 356],
            "House of Shadows": [357, 367],
            "House of Hellish": [368, 378],
            "House of Hologram": [379, 389],
            "House of Gold": [390, 394],
            "House of Death": [395, 396]
        };

        const [min, max] = houseRanges[targetHouse];
        const targetNumber = Math.floor(Math.random() * (max - min + 1)) + min;

        console.log(`Target house: ${targetHouse}, Target number: ${targetNumber}`);

        // Start spinning animation
        numberDisplay.classList.add('spinning');
        
        // Spin for 2 seconds with random numbers
        const spinDuration = 2000;
        const spinInterval = 100;
        let elapsed = 0;

        const spinTimer = setInterval(() => {
            const randomNum = Math.floor(Math.random() * 331) + 66; // 66-396
            numberDisplay.textContent = randomNum;
            elapsed += spinInterval;

            if (elapsed >= spinDuration) {
                clearInterval(spinTimer);
                
                // Reveal final number
                numberDisplay.classList.remove('spinning');
                numberDisplay.classList.add('reveal');
                numberDisplay.textContent = targetNumber;

                setTimeout(() => {
                    numberDisplay.classList.remove('reveal');
                    numberDisplay.classList.add('idle');
                }, 500);

                // Show result and claim button
                setTimeout(() => {
                    showRollResult(targetNumber, targetHouse);
                }, 1000);
            }
        }, spinInterval);

    } catch (error) {
        console.error('Roll error:', error);
        showToast('Failed to roll dice', 'error');
        isRolling = false;
        rollButton.disabled = false;
        rollButton.textContent = 'ROLL DICE';
    }
}

// Show Roll Result
function showRollResult(rollTotal, houseName) {
    document.getElementById('rollResultText').textContent = 
        `You rolled ${rollTotal}! You landed in the ${houseName}!`;
    document.getElementById('rollResult').style.display = 'block';
    
    // Store for claiming - mark as UNCLAIMED
    window.currentRoll = { 
        rollTotal, 
        houseName,
        claimed: false  // CRITICAL: Track claim status
    };
    
    // Re-enable roll button but it will be blocked until claim
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = false;
    rollButton.textContent = 'ROLL DICE';
    isRolling = false;
}

// Claim Winion NFT
async function claimWinion() {
    if (!window.currentRoll) {
        showToast('No roll to claim!', 'error');
        return;
    }

    if (window.currentRoll.claimed) {
        showToast('You already claimed this roll!', 'warning');
        return;
    }

    const claimButton = document.getElementById('claimButton');
    claimButton.disabled = true;
    claimButton.textContent = 'CLAIMING...';

    try {
        const { rollTotal, houseName } = window.currentRoll;

        showToast('Sending claim transaction...', 'info');

        const tx = await contract.claimWinion(rollTotal, houseName);
        
        showToast('Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();

        // Parse events to get token ID
        const event = receipt.events.find(e => e.event === 'NFTDistributed');
        const tokenId = event ? event.args.tokenId.toString() : 'your';

        showToast(`🎉 Successfully claimed Winion #${tokenId}!`, 'success');

        // CRITICAL: Mark as claimed
        window.currentRoll.claimed = true;

        // Update rolls
        await checkUserRolls();

        // Check remaining NFTs in this house
        const remainingInHouse = await contract.getHouseInventoryCount(houseName);
        console.log(`Remaining NFTs in ${houseName}:`, remainingInHouse.toString());

        // Update available houses
        await checkAvailableHouses();

        // Show post-claim flow
        showPostClaimFlow();

    } catch (error) {
        console.error('Claim error:', error);
        if (error.code === 4001) {
            showToast('Transaction cancelled', 'warning');
        } else {
            showToast('Failed to claim Winion', 'error');
        }
        claimButton.disabled = false;
        claimButton.textContent = 'CLAIM WINION';
    }
}

// Show Post-Claim Flow
async function showPostClaimFlow() {
    // Hide roll result
    document.getElementById('rollResult').style.display = 'none';
    
    // Check remaining rolls
    const rolls = await checkUserRolls();
    
    if (rolls > 0) {
        // Has rolls left - prompt to roll again
        showPostClaimModal('roll-again', rolls);
    } else {
        // No rolls left - prompt to purchase
        showPostClaimModal('purchase-more');
    }
}

// Show Post-Claim Modal
function showPostClaimModal(type, rollsLeft = 0) {
    const modal = document.createElement('div');
    modal.className = 'mobile-modal';
    
    if (type === 'roll-again') {
        modal.innerHTML = `
            <div class="mobile-modal-content">
                <h3>🎲 Roll Again?</h3>
                <p style="color: white; text-align: center; font-size: 18px; margin: 20px 0;">
                    You have <strong style="color: #ff0000;">${rollsLeft} roll${rollsLeft > 1 ? 's' : ''}</strong> remaining!
                </p>
                <div class="mobile-modal-buttons">
                    <button onclick="resetForNewRoll()">ROLL AGAIN</button>
                    <button onclick="closePostClaimModal()">DONE</button>
                </div>
            </div>
        `;
    } else {
        modal.innerHTML = `
            <div class="mobile-modal-content">
                <h3>🎰 Out of Rolls!</h3>
                <p style="color: white; text-align: center; font-size: 18px; margin: 20px 0;">
                    You've used all your rolls.<br>
                    Purchase more to keep playing!
                </p>
                <div class="mobile-modal-buttons">
                    <button onclick="backToPurchase()">PURCHASE ROLLS</button>
                    <button onclick="closePostClaimModal()">DONE</button>
                </div>
            </div>
        `;
    }
    
    document.body.appendChild(modal);
}

// Reset For New Roll
function resetForNewRoll() {
    // Only allow reset if previous roll was claimed
    if (window.currentRoll && !window.currentRoll.claimed) {
        showToast('⚠️ You must claim your Winion first!', 'warning');
        return;
    }

    closePostClaimModal();
    
    // Reset UI
    document.getElementById('rollResult').style.display = 'none';
    document.getElementById('rollButton').disabled = false;
    document.getElementById('rollButton').textContent = 'ROLL DICE';
    document.getElementById('claimButton').disabled = false;
    document.getElementById('claimButton').textContent = 'CLAIM WINION';
    
    // Clear current roll (it's been claimed)
    window.currentRoll = null;
    
    // Reset rolling state
    isRolling = false;
    
    // Recreate spinning number display
    createSpinningNumberDisplay();
    
    showToast('Ready to roll again!', 'success');
}

// Back to Purchase
function backToPurchase() {
    closePostClaimModal();
    
    document.getElementById('rollSection').style.display = 'none';
    document.getElementById('purchaseSection').style.display = 'block';
    document.getElementById('purchaseSection').scrollIntoView({ behavior: 'smooth' });
    
    // Reset rolling state
    isRolling = false;
    
    showToast('Purchase more rolls to continue!', 'info');
}

// Close Post-Claim Modal
function closePostClaimModal() {
    const modal = document.querySelector('.mobile-modal');
    if (modal) modal.remove();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Winions Dice Roller initialized!');
});
