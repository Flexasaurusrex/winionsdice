// Winions Dice Roller - FINAL COMPLETE
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

let provider;
let signer;
let userAddress;
let distributionContract;
let currentSchool = null;
let currentRollTotal = 0;
let currentHouseName = '';
let availableHouses = {};
let hasPendingClaim = false; // Track if user has unclaimed roll

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
    document.getElementById('continueToSchool').addEventListener('click', handleContinueToSchool);
    
    document.querySelectorAll('.school-button').forEach(button => {
        button.addEventListener('click', () => selectSchool(button.dataset.school));
    });
    
    document.getElementById('rollButton').addEventListener('click', rollDice);
    document.getElementById('claimButton').addEventListener('click', claimWinion);
});

// Check if user is on mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            if (isMobile()) {
                showMobileInstructions();
            } else {
                alert('Please install MetaMask or another Web3 wallet to use this app!');
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
        
        // Detect wallet type
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
        
        document.getElementById('walletStatus').textContent = `Connected with ${walletName}: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        document.getElementById('connectButton').disabled = false;
        document.getElementById('walletStatus').style.display = 'none';
        
        if (error.code === 4001) {
            showToast('Connection rejected. Please try again.', 'error');
        } else {
            showToast('Failed to connect wallet. Please try again.', 'error');
        }
    }
}

async function switchToMainnet() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }],
        });
        
        // Retry connection after switching
        setTimeout(connectWallet, 1000);
    } catch (error) {
        console.error('Network switch error:', error);
        showToast('Please switch to Ethereum Mainnet in your wallet.', 'error');
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
                <div class="mobile-step">
                    <span class="step-number">4</span>
                    <p>Click "Connect Wallet" when the site loads</p>
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="close-mobile-btn">CLOSE</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('URL copied to clipboard!', 'success');
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
        
        // Update Continue button based on pending claim status
        const continueButton = document.getElementById('continueToSchool');
        if (hasPendingClaim) {
            continueButton.textContent = '🚫 CLAIM YOUR WINION FIRST';
            continueButton.style.background = 'rgba(255, 0, 0, 0.3)';
            continueButton.style.borderColor = '#ff0000';
            continueButton.style.cursor = 'not-allowed';
            console.log('⚠️ User has pending claim - Continue button locked');
        } else {
            continueButton.textContent = 'CONTINUE TO ROLL →';
            continueButton.style.background = '';
            continueButton.style.borderColor = '';
            continueButton.style.cursor = 'pointer';
            console.log('✅ No pending claim - Continue button unlocked');
        }
        
        console.log(`Loaded rolls: ${freeRolls} free, ${paidRolls} paid`);
        console.log(`Wallet still connected: ${userAddress}`);
        console.log(`Distribution contract: ${CONFIG.DISTRIBUTION_CONTRACT}`);
        
        const isActive = await distributionContract.distributionActive();
        if (!isActive) {
            showToast('⚠️ Distribution is not currently active. Please check back later!', 'warning');
        }
        
    } catch (error) {
        console.error('Error loading rolls:', error);
        showToast('Error loading your rolls. Please refresh and try again.', 'error');
    }
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
        
        showToast(`✅ ${numberOfRolls} roll${numberOfRolls > 1 ? 's' : ''} purchased successfully!`, 'success');
        
        await loadUserRolls();
        
    } catch (error) {
        console.error('Purchase error:', error);
        
        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            showToast('Transaction rejected', 'error');
        } else {
            showToast(error.message || 'Purchase failed', 'error');
        }
    }
}

async function handleContinueToSchool() {
    // CRITICAL: Block if there's an unclaimed Winion
    if (hasPendingClaim) {
        showToast('⚠️ YOU CANNOT ROLL AGAIN UNTIL YOU CLAIM YOUR PREVIOUS WINION!', 'error');
        showToast('Go back and click "CLAIM YOUR WINION" to continue.', 'warning');
        return; // HARD BLOCK - Cannot proceed
    }
    
    // Check if user has rolls BEFORE allowing them to continue
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        const totalRolls = Number(freeRolls.toString()) + Number(paidRolls.toString());
        
        if (totalRolls === 0) {
            showToast('⚠️ You need to purchase rolls first!', 'warning');
            // Highlight the purchase section
            const purchaseSection = document.querySelector('.purchase-section');
            purchaseSection.style.animation = 'pulse 1s ease-in-out 3';
            return;
        }
        
        showSchoolScreen();
        
    } catch (error) {
        console.error('Error checking rolls:', error);
        showToast('Error checking your rolls. Please try again.', 'error');
    }
}

function showSchoolScreen() {
    document.getElementById('rollsScreen').style.display = 'none';
    document.getElementById('schoolScreen').style.display = 'block';
}

async function selectSchool(school) {
    // CRITICAL: Block if there's an unclaimed Winion
    if (hasPendingClaim) {
        showToast('⚠️ YOU CANNOT ROLL AGAIN UNTIL YOU CLAIM YOUR PREVIOUS WINION!', 'error');
        showToast('Complete your current claim first!', 'warning');
        return; // HARD BLOCK
    }
    
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
    
    createDiceDisplay();
    
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
            showToast('⚠️ No NFTs available in any house! Please contact admin.', 'error');
            document.getElementById('rollButton').disabled = true;
        }
        
    } catch (error) {
        console.error('Error checking houses:', error);
    }
}

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

function generateSmartDiceRolls() {
    const availableHousesList = Object.values(availableHouses);
    
    if (availableHousesList.length === 0) {
        const total = Math.floor(Math.random() * 331) + 66;
        return total;
    }
    
    const randomHouse = availableHousesList[Math.floor(Math.random() * availableHousesList.length)];
    const target = Math.floor(Math.random() * (randomHouse.range.max - randomHouse.range.min + 1)) + randomHouse.range.min;
    
    return target;
}

async function rollDice() {
    // TRIPLE CHECK: Block if there's an unclaimed Winion
    if (hasPendingClaim) {
        showToast('⚠️ YOU CANNOT ROLL AGAIN! CLAIM YOUR PREVIOUS WINION FIRST!', 'error');
        document.getElementById('rollButton').disabled = true;
        document.getElementById('rollButton').textContent = '🚫 CLAIM YOUR WINION FIRST';
        return; // ABSOLUTE HARD BLOCK
    }
    
    // CHECK ROLLS AGAIN before rolling
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        const totalRolls = Number(freeRolls.toString()) + Number(paidRolls.toString());
        
        if (totalRolls === 0) {
            showToast('⚠️ No rolls available! Redirecting to purchase...', 'warning');
            setTimeout(() => {
                resetToRollsScreen();
            }, 2000);
            return;
        }
    } catch (error) {
        console.error('Error checking rolls before roll:', error);
        showToast('Error checking your rolls. Please try again.', 'error');
        return;
    }
    
    const rollButton = document.getElementById('rollButton');
    rollButton.disabled = true;
    
    const spinningNumber = document.getElementById('spinningNumber');
    spinningNumber.classList.add('rolling');
    
    const targetTotal = generateSmartDiceRolls();
    
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
                calculateTotal(targetTotal);
            }, 500);
        }
    }, interval);
}

function calculateTotal(total) {
    currentRollTotal = total;
    
    document.getElementById('totalValue').textContent = total;
    
    setTimeout(() => {
        revealHouse(total);
    }, 500);
}

function revealHouse(total) {
    const houseName = getHouseFromRoll(total);
    currentHouseName = houseName;
    
    if (!availableHouses[houseName]) {
        console.error(`ERROR: Rolled into ${houseName} with 0 NFTs!`);
        showToast('⚠️ Error: Rolled into house with no NFTs. Please try again.', 'error');
        document.getElementById('rollButton').disabled = false;
        return;
    }
    
    document.getElementById('rolledHouseName').textContent = houseName;
    document.getElementById('houseResult').style.display = 'block';
    
    const remaining = availableHouses[houseName].count;
    const countDisplay = document.createElement('p');
    countDisplay.style.color = '#00ff00';
    countDisplay.style.marginTop = '10px';
    countDisplay.textContent = `${remaining} NFT${remaining !== 1 ? 's' : ''} remaining in this house`;
    countDisplay.className = 'nft-count';
    
    const houseResult = document.getElementById('houseResult');
    const existingCount = houseResult.querySelector('.nft-count');
    if (existingCount) existingCount.remove();
    houseResult.appendChild(countDisplay);
    
    // DISABLE ROLL BUTTON - Force claim
    document.getElementById('rollButton').disabled = true;
    document.getElementById('rollButton').textContent = '⚠️ CLAIM YOUR WINION FIRST';
    
    // Mark that there's a pending claim
    hasPendingClaim = true;
    
    // Add warning message
    const warningMsg = document.createElement('p');
    warningMsg.className = 'claim-warning';
    warningMsg.style.color = '#ffcc00';
    warningMsg.style.marginTop = '15px';
    warningMsg.style.fontWeight = 'bold';
    warningMsg.style.animation = 'pulse 1.5s ease-in-out infinite';
    warningMsg.textContent = '⚠️ You must claim this Winion before rolling again!';
    
    const existingWarning = houseResult.querySelector('.claim-warning');
    if (existingWarning) existingWarning.remove();
    houseResult.appendChild(warningMsg);
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
        
        // Clear pending claim flag
        hasPendingClaim = false;
        
        showToast(`🎉 Successfully claimed Winion #${tokenId}!`, 'success');
        
        await showSuccessModal(tokenId, tx.hash);
        
    } catch (error) {
        console.error('Claim error:', error);
        
        const claimButton = document.getElementById('claimButton');
        claimButton.disabled = false;
        claimButton.textContent = 'CLAIM YOUR WINION';
        
        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            showToast('Transaction rejected', 'error');
        } else if (error.message.includes('No rolls available')) {
            showToast('❌ No rolls available. Please purchase rolls first.', 'error');
            setTimeout(() => resetToRollsScreen(), 2000);
        } else if (error.message.includes('No NFTs available')) {
            showToast('❌ No NFTs available for this house.', 'error');
        } else if (error.message.includes('Distribution is not active')) {
            showToast('❌ Distribution is not currently active.', 'error');
        } else {
            showToast(error.message || 'Claim failed. Please try again.', 'error');
        }
    }
}

async function showSuccessModal(tokenId, txHash) {
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
    
    // Check remaining rolls after this claim
    try {
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(userAddress);
        const totalRolls = Number(freeRolls.toString()) + Number(paidRolls.toString());
        
        console.log(`Remaining rolls after claim: ${totalRolls}`);
        
        // Update the modal button based on remaining rolls
        const closeButton = document.querySelector('.close-button');
        
        if (totalRolls > 0) {
            // HAS ROLLS - Let them roll again!
            closeButton.textContent = `🎲 ROLL AGAIN (${totalRolls} roll${totalRolls > 1 ? 's' : ''} remaining)`;
            closeButton.style.background = 'linear-gradient(135deg, #50c878 0%, #2d7a4a 100%)';
            closeButton.style.borderColor = '#50c878';
            closeButton.onclick = () => {
                console.log('User wants to roll again!');
                document.getElementById('successModal').style.display = 'none';
                // Clear the pending claim flag since they claimed
                hasPendingClaim = false;
                // Go straight to school selection for next roll
                document.getElementById('diceScreen').style.display = 'none';
                document.getElementById('schoolScreen').style.display = 'block';
                document.getElementById('houseResult').style.display = 'none';
                document.getElementById('totalValue').textContent = '0';
                
                const spinningNumber = document.getElementById('spinningNumber');
                if (spinningNumber) {
                    spinningNumber.textContent = '0';
                    spinningNumber.classList.remove('rolling', 'landing');
                }
                
                currentSchool = null;
                currentRollTotal = 0;
                currentHouseName = '';
                
                showToast(`✅ ${totalRolls} roll${totalRolls > 1 ? 's' : ''} remaining! Pick your school.`, 'success');
            };
        } else {
            // NO ROLLS - Prompt to buy more!
            closeButton.textContent = '💎 BUY MORE ROLLS';
            closeButton.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            closeButton.style.borderColor = '#f59e0b';
            closeButton.onclick = () => {
                console.log('User needs to buy more rolls');
                document.getElementById('successModal').style.display = 'none';
                // Clear the pending claim flag
                hasPendingClaim = false;
                // Go to purchase screen
                document.getElementById('diceScreen').style.display = 'none';
                document.getElementById('schoolScreen').style.display = 'none';
                document.getElementById('rollsScreen').style.display = 'block';
                document.getElementById('houseResult').style.display = 'none';
                
                currentSchool = null;
                currentRollTotal = 0;
                currentHouseName = '';
                
                // Show prominent message and highlight purchase section
                showToast('💎 Out of rolls! Purchase more to keep playing!', 'warning');
                setTimeout(() => {
                    const purchaseSection = document.querySelector('.purchase-section');
                    if (purchaseSection) {
                        purchaseSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        purchaseSection.style.animation = 'pulse 1s ease-in-out 3';
                    }
                }, 500);
                
                // Reload roll counts
                loadUserRolls();
            };
        }
        
        // Add/Update OpenSea button
        let viewButton = document.getElementById('viewCollectionButton');
        if (!viewButton) {
            viewButton = document.createElement('a');
            viewButton.id = 'viewCollectionButton';
            viewButton.className = 'view-collection-button';
            viewButton.href = `https://opensea.io/assets/ethereum/0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733/${tokenId}`;
            viewButton.target = '_blank';
            viewButton.textContent = '👀 VIEW ON OPENSEA';
            viewButton.style.cssText = `
                display: block;
                margin: 20px auto 10px;
                padding: 12px 30px;
                background: rgba(33, 150, 243, 0.2);
                border: 2px solid #2196F3;
                color: #2196F3;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                transition: all 0.3s ease;
            `;
            viewButton.onmouseover = function() {
                this.style.background = 'rgba(33, 150, 243, 0.3)';
            };
            viewButton.onmouseout = function() {
                this.style.background = 'rgba(33, 150, 243, 0.2)';
            };
            
            const modalContent = document.querySelector('.modal-content');
            modalContent.insertBefore(viewButton, closeButton);
        } else {
            viewButton.href = `https://opensea.io/assets/ethereum/0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733/${tokenId}`;
        }
        
    } catch (error) {
        console.error('Error checking remaining rolls:', error);
        // Default to purchase flow if error
        const closeButton = document.querySelector('.close-button');
        closeButton.textContent = '💎 BUY MORE ROLLS';
        closeButton.onclick = () => {
            document.getElementById('successModal').style.display = 'none';
            hasPendingClaim = false;
            resetToRollsScreen();
        };
    }
    
    document.getElementById('successModal').style.display = 'flex';
}

function resetToRollsScreen() {
    // Reset to rolls/purchase screen
    console.log('Resetting to rolls screen...');
    
    document.getElementById('successModal').style.display = 'none';
    document.getElementById('diceScreen').style.display = 'none';
    document.getElementById('schoolScreen').style.display = 'none';
    document.getElementById('houseResult').style.display = 'none';
    document.getElementById('rollsScreen').style.display = 'block';
    document.getElementById('totalValue').textContent = '0';
    
    const spinningNumber = document.getElementById('spinningNumber');
    if (spinningNumber) {
        spinningNumber.textContent = '0';
        spinningNumber.classList.remove('rolling', 'landing');
    }
    
    currentSchool = null;
    currentRollTotal = 0;
    currentHouseName = '';
    hasPendingClaim = false; // Clear pending claim when going back to purchase
    
    // Reload roll counts to show updated info
    loadUserRolls();
}

// Toast notification system
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    toast.innerHTML = `
        <span style="font-size: 20px;">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    toast.style.cssText = `
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        border: 2px solid ${colors[type]};
        border-radius: 12px;
        padding: 16px 24px;
        color: white;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 0 20px ${colors[type]}40;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        font-size: 14px;
        font-weight: 500;
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
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
            @keyframes slideOut {
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
            }
            @media (max-width: 768px) {
                #toastContainer {
                    right: 10px;
                    left: 10px;
                    top: 10px;
                }
                .toast {
                    max-width: 100% !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

// Event listeners for account and network changes
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
