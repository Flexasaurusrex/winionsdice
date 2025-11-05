// Winions Admin Panel Script
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

let provider;
let signer;
let adminAddress;
let distributionContract;

// Initialize
window.addEventListener('load', () => {
    document.getElementById('connectAdminBtn').addEventListener('click', connectAdmin);
});

// Log Activity
function log(message, type = 'info') {
    const logDiv = document.getElementById('activityLog');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.insertBefore(entry, logDiv.firstChild);
    
    // Keep only last 50 entries
    while (logDiv.children.length > 50) {
        logDiv.removeChild(logDiv.lastChild);
    }
}

// Connect Admin Wallet
async function connectAdmin() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask!');
            return;
        }

        log('Connecting admin wallet...', 'info');

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        adminAddress = accounts[0];
        
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        distributionContract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            DISTRIBUTION_CONTRACT_ABI,
            signer
        );
        
        // Check if user is owner
        const owner = await distributionContract.owner();
        
        if (adminAddress.toLowerCase() !== owner.toLowerCase()) {
            throw new Error('You are not the contract owner!');
        }
        
        log('Admin wallet connected successfully', 'success');
        
        // Show admin panel
        document.getElementById('adminGate').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // Load initial status
        await refreshStatus();
        await loadPrices();
        
    } catch (error) {
        console.error('Admin connection error:', error);
        document.getElementById('adminError').textContent = error.message;
        log(`Connection error: ${error.message}`, 'error');
    }
}

// Refresh Status
async function refreshStatus() {
    try {
        log('Refreshing status...', 'info');
        
        // Distribution status
        const isActive = await distributionContract.distributionActive();
        const statusEl = document.getElementById('distributionStatus');
        statusEl.textContent = isActive ? 'ACTIVE' : 'INACTIVE';
        statusEl.className = `status-value ${isActive ? 'active' : 'inactive'}`;
        
        // Contract balance
        const balance = await provider.getBalance(CONFIG.DISTRIBUTION_CONTRACT);
        document.getElementById('contractBalance').textContent = 
            `${ethers.formatEther(balance)} ETH`;
        
        // Admin wallet
        document.getElementById('adminWallet').textContent = 
            `${adminAddress.slice(0, 6)}...${adminAddress.slice(-4)}`;
        
        // Count total NFTs
        let totalNFTs = 0;
        const houses = await distributionContract.getAllHouses();
        for (const house of houses) {
            const count = await distributionContract.getHouseInventoryCount(house);
            totalNFTs += Number(count);
        }
        document.getElementById('totalNFTs').textContent = totalNFTs;
        
        log('Status refreshed', 'success');
        
    } catch (error) {
        console.error('Refresh error:', error);
        log(`Refresh error: ${error.message}`, 'error');
    }
}

// Load Inventory
async function loadInventory() {
    try {
        log('Loading inventory...', 'info');
        
        const houses = await distributionContract.getAllHouses();
        const inventoryDisplay = document.getElementById('inventoryDisplay');
        inventoryDisplay.innerHTML = '';
        
        for (const house of houses) {
            const count = await distributionContract.getHouseInventoryCount(house);
            
            const card = document.createElement('div');
            card.className = 'house-card';
            card.innerHTML = `
                <div class="house-name">${house}</div>
                <div class="house-count">${count} NFTs</div>
            `;
            inventoryDisplay.appendChild(card);
        }
        
        log('Inventory loaded', 'success');
        
    } catch (error) {
        console.error('Load inventory error:', error);
        log(`Load inventory error: ${error.message}`, 'error');
    }
}

// Add to House Inventory
async function addToHouseInventory() {
    try {
        const houseName = document.getElementById('houseSelect').value;
        const tokenIdsText = document.getElementById('tokenIds').value;
        
        if (!houseName) {
            alert('Please select a house');
            return;
        }
        
        if (!tokenIdsText) {
            alert('Please enter token IDs');
            return;
        }
        
        // Parse token IDs - FIXED VERSION
        const tokenIds = tokenIdsText
            .split(',')
            .map(id => id.trim())
            .filter(id => id)
            .map(id => parseInt(id, 10))      // FIXED: Added base-10
            .filter(id => !isNaN(id));        // FIXED: Filter out NaN values
        
        if (tokenIds.length === 0) {
            alert('No valid token IDs found');
            return;
        }
        
        console.log('Parsed token IDs:', tokenIds); // Debug log
        
        log(`Adding ${tokenIds.length} NFTs to ${houseName}...`, 'info');
        
        const tx = await distributionContract.addToHouseInventory(houseName, tokenIds);
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log(`✅ Successfully added ${tokenIds.length} NFTs to ${houseName}`, 'success');
        
        // Clear form
        document.getElementById('tokenIds').value = '';
        
        // Refresh
        await refreshStatus();
        await loadInventory();
        
    } catch (error) {
        console.error('Add inventory error:', error);
        
        if (error.message.includes('Contract does not own this token')) {
            log('❌ Error: Contract does not own one or more of these tokens. Transfer them first!', 'error');
        } else {
            log(`❌ Error: ${error.message}`, 'error');
        }
    }
}

// Add Single to Whitelist
async function addSingleToWhitelist() {
    try {
        const address = document.getElementById('whitelistAddress').value;
        const rolls = document.getElementById('freeRolls').value;
        
        if (!address || !ethers.isAddress(address)) {
            alert('Please enter a valid address');
            return;
        }
        
        log(`Adding ${address} to whitelist with ${rolls} rolls...`, 'info');
        
        const tx = await distributionContract.updateWhitelist(address, rolls);
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log(`✅ Added ${address.slice(0, 6)}...${address.slice(-4)} with ${rolls} rolls`, 'success');
        
        // Clear form
        document.getElementById('whitelistAddress').value = '';
        
    } catch (error) {
        console.error('Whitelist error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Batch Add to Whitelist
async function batchAddToWhitelist() {
    try {
        const batchText = document.getElementById('batchWhitelist').value;
        
        if (!batchText) {
            alert('Please enter addresses and rolls');
            return;
        }
        
        // Parse batch input
        const lines = batchText.split('\n').filter(line => line.trim());
        const addresses = [];
        const rolls = [];
        
        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length !== 2) continue;
            
            const [address, rollCount] = parts;
            if (ethers.isAddress(address)) {
                addresses.push(address);
                rolls.push(parseInt(rollCount));
            }
        }
        
        if (addresses.length === 0) {
            alert('No valid addresses found');
            return;
        }
        
        log(`Batch adding ${addresses.length} addresses to whitelist...`, 'info');
        
        const tx = await distributionContract.addToWhitelist(addresses, rolls);
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log(`✅ Successfully added ${addresses.length} addresses to whitelist`, 'success');
        
        // Clear form
        document.getElementById('batchWhitelist').value = '';
        
    } catch (error) {
        console.error('Batch whitelist error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Load Prices
async function loadPrices() {
    try {
        const [single, three, five] = await distributionContract.getPrices();
        
        document.getElementById('currentPrices').innerHTML = `
            1 Roll: ${ethers.formatEther(single)} ETH<br>
            3 Rolls: ${ethers.formatEther(three)} ETH<br>
            5 Rolls: ${ethers.formatEther(five)} ETH
        `;
        
    } catch (error) {
        console.error('Load prices error:', error);
    }
}

// Update Single Price
async function updateSinglePrice() {
    try {
        const priceETH = document.getElementById('singlePrice').value;
        if (!priceETH) {
            alert('Please enter a price');
            return;
        }
        
        const priceWei = ethers.parseEther(priceETH);
        
        log(`Updating single roll price to ${priceETH} ETH...`, 'info');
        
        const tx = await distributionContract.setSingleRollPrice(priceWei);
        await tx.wait();
        
        log(`✅ Single roll price updated to ${priceETH} ETH`, 'success');
        
        await loadPrices();
        
    } catch (error) {
        console.error('Update price error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Update Three Price
async function updateThreePrice() {
    try {
        const priceETH = document.getElementById('threePrice').value;
        if (!priceETH) {
            alert('Please enter a price');
            return;
        }
        
        const priceWei = ethers.parseEther(priceETH);
        
        log(`Updating 3-roll price to ${priceETH} ETH...`, 'info');
        
        const tx = await distributionContract.setThreeRollPrice(priceWei);
        await tx.wait();
        
        log(`✅ 3-roll price updated to ${priceETH} ETH`, 'success');
        
        await loadPrices();
        
    } catch (error) {
        console.error('Update price error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Update Five Price
async function updateFivePrice() {
    try {
        const priceETH = document.getElementById('fivePrice').value;
        if (!priceETH) {
            alert('Please enter a price');
            return;
        }
        
        const priceWei = ethers.parseEther(priceETH);
        
        log(`Updating 5-roll price to ${priceETH} ETH...`, 'info');
        
        const tx = await distributionContract.setFiveRollPrice(priceWei);
        await tx.wait();
        
        log(`✅ 5-roll price updated to ${priceETH} ETH`, 'success');
        
        await loadPrices();
        
    } catch (error) {
        console.error('Update price error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Toggle Distribution
async function toggleDistribution() {
    try {
        if (!confirm('Are you sure you want to toggle distribution status?')) {
            return;
        }
        
        log('Toggling distribution...', 'info');
        
        const tx = await distributionContract.toggleDistribution();
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log('✅ Distribution status toggled', 'success');
        
        await refreshStatus();
        
    } catch (error) {
        console.error('Toggle error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Withdraw ETH
async function withdrawETH() {
    try {
        const balance = await provider.getBalance(CONFIG.DISTRIBUTION_CONTRACT);
        const balanceETH = ethers.formatEther(balance);
        
        if (balance === 0n) {
            alert('No ETH to withdraw');
            return;
        }
        
        if (!confirm(`Withdraw ${balanceETH} ETH to your wallet?`)) {
            return;
        }
        
        log(`Withdrawing ${balanceETH} ETH...`, 'info');
        
        const tx = await distributionContract.withdrawETH();
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log(`✅ Withdrew ${balanceETH} ETH`, 'success');
        
        await refreshStatus();
        
    } catch (error) {
        console.error('Withdraw error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Emergency Withdraw NFT
async function emergencyWithdrawNFT() {
    try {
        const tokenId = document.getElementById('emergencyTokenId').value;
        
        if (!tokenId) {
            alert('Please enter a token ID');
            return;
        }
        
        if (!confirm(`Emergency withdraw token #${tokenId}? This should only be used in emergencies!`)) {
            return;
        }
        
        log(`Emergency withdrawing token #${tokenId}...`, 'info');
        
        const tx = await distributionContract.emergencyWithdrawNFT(tokenId);
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log(`✅ Emergency withdrew token #${tokenId}`, 'success');
        
        await refreshStatus();
        await loadInventory();
        
    } catch (error) {
        console.error('Emergency withdraw error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Emergency Withdraw House
async function emergencyWithdrawHouse() {
    try {
        const houseName = document.getElementById('emergencyHouse').value;
        
        if (!houseName) {
            alert('Please select a house');
            return;
        }
        
        if (!confirm(`Emergency withdraw ALL NFTs from ${houseName}? This should only be used in emergencies!`)) {
            return;
        }
        
        log(`Emergency withdrawing all NFTs from ${houseName}...`, 'info');
        
        const tx = await distributionContract.emergencyWithdrawHouse(houseName);
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log(`✅ Emergency withdrew all NFTs from ${houseName}`, 'success');
        
        await refreshStatus();
        await loadInventory();
        
    } catch (error) {
        console.error('Emergency withdraw error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// View on Etherscan
function viewOnEtherscan() {
    window.open(`${CONFIG.ETHERSCAN_URL}/address/${CONFIG.DISTRIBUTION_CONTRACT}`, '_blank');
}

// Handle account/network changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        location.reload();
    });
    
    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}
