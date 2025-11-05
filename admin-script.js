// Winions Admin Panel Script
// Contract: Uses CONFIG.DISTRIBUTION_CONTRACT from config.js

let provider;
let signer;
let adminAddress;
let distributionContract;

// Initialize
window.addEventListener('load', () => {
    document.getElementById('connectAdminBtn').addEventListener('click', connectAdmin);
    
    // Display contract addresses
    document.getElementById('distContractAddr').textContent = CONFIG.DISTRIBUTION_CONTRACT;
    document.getElementById('nftContractAddr').textContent = CONFIG.WINIONS_NFT_CONTRACT;
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
            CONTRACT_ABI,
            signer
        );
        
        // Check if user is owner
        const owner = await distributionContract.owner();
        
        if (adminAddress.toLowerCase() !== owner.toLowerCase()) {
            const errorMsg = 'You are not the contract owner!';
            document.getElementById('adminError').textContent = errorMsg;
            document.getElementById('adminError').style.display = 'block';
            throw new Error(errorMsg);
        }
        
        log('✅ Admin wallet connected successfully', 'success');
        
        // Show admin panel
        document.getElementById('adminGate').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // Load initial status
        await refreshStatus();
        await loadPrices();
        
    } catch (error) {
        console.error('Admin connection error:', error);
        const errorEl = document.getElementById('adminError');
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
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
        statusEl.textContent = isActive ? 'ACTIVE ✅' : 'INACTIVE ❌';
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
        
        log('✅ Status refreshed', 'success');
        
    } catch (error) {
        console.error('Refresh error:', error);
        log(`❌ Refresh error: ${error.message}`, 'error');
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
        
        log('✅ Inventory loaded', 'success');
        
    } catch (error) {
        console.error('Load inventory error:', error);
        log(`❌ Load inventory error: ${error.message}`, 'error');
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
        
        if (!tokenIdsText.trim()) {
            alert('Please enter token IDs');
            return;
        }
        
        // Parse token IDs - PROPERLY FIXED
        const tokenIds = tokenIdsText
            .split(',')                      // Split by comma
            .map(id => id.trim())            // Remove whitespace
            .filter(id => id.length > 0)     // Remove empty strings
            .map(id => {
                const num = parseInt(id, 10);
                if (isNaN(num)) {
                    log(`⚠️ Warning: "${id}" is not a valid number, skipping`, 'error');
                }
                return num;
            })
            .filter(id => !isNaN(id));       // Remove NaN values
        
        if (tokenIds.length === 0) {
            alert('No valid token IDs found. Please check your input.');
            log('❌ No valid token IDs found', 'error');
            return;
        }
        
        console.log('Parsed token IDs:', tokenIds);
        log(`Parsed ${tokenIds.length} token IDs`, 'info');
        
        log(`Adding ${tokenIds.length} NFTs to ${houseName}...`, 'info');
        
        const tx = await distributionContract.addToHouseInventory(houseName, tokenIds);
        
        log('Transaction sent, waiting for confirmation...', 'info');
        log(`TX Hash: ${tx.hash}`, 'info');
        
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
            alert('Error: Contract does not own one or more of these tokens. Please transfer them to the contract first!');
        } else {
            log(`❌ Error: ${error.message}`, 'error');
            alert(`Error: ${error.message}`);
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
        
        if (!rolls || rolls < 0) {
            alert('Please enter a valid number of rolls');
            return;
        }
        
        log(`Adding ${address} to whitelist with ${rolls} rolls...`, 'info');
        
        const tx = await distributionContract.updateWhitelist(address, rolls);
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log(`✅ Added ${address.slice(0, 6)}...${address.slice(-4)} with ${rolls} rolls`, 'success');
        
        // Clear form
        document.getElementById('whitelistAddress').value = '';
        document.getElementById('freeRolls').value = '';
        
    } catch (error) {
        console.error('Whitelist error:', error);
        log(`❌ Error: ${error.message}`, 'error');
        alert(`Error: ${error.message}`);
    }
}

// Batch Add to Whitelist
async function batchAddToWhitelist() {
    try {
        const batchText = document.getElementById('batchWhitelist').value;
        
        if (!batchText.trim()) {
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
            } else {
                log(`⚠️ Invalid address skipped: ${address}`, 'error');
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
        alert(`Error: ${error.message}`);
    }
}

// Load Prices
async function loadPrices() {
    try {
        const [single, three, five] = await distributionContract.getPrices();
        
        document.getElementById('currentPrices').innerHTML = `
            <strong>Current Prices:</strong><br>
            1 Roll: ${ethers.formatEther(single)} ETH<br>
            3 Rolls: ${ethers.formatEther(three)} ETH<br>
            5 Rolls: ${ethers.formatEther(five)} ETH
        `;
        
    } catch (error) {
        console.error('Load prices error:', error);
        log(`❌ Load prices error: ${error.message}`, 'error');
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
        document.getElementById('singlePrice').value = '';
        
    } catch (error) {
        console.error('Update price error:', error);
        log(`❌ Error: ${error.message}`, 'error');
        alert(`Error: ${error.message}`);
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
        document.getElementById('threePrice').value = '';
        
    } catch (error) {
        console.error('Update price error:', error);
        log(`❌ Error: ${error.message}`, 'error');
        alert(`Error: ${error.message}`);
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
        document.getElementById('fivePrice').value = '';
        
    } catch (error) {
        console.error('Update price error:', error);
        log(`❌ Error: ${error.message}`, 'error');
        alert(`Error: ${error.message}`);
    }
}

// Toggle Distribution
async function toggleDistribution() {
    try {
        const currentStatus = document.getElementById('distributionStatus').textContent;
        
        if (!confirm(`Are you sure you want to toggle distribution? Current status: ${currentStatus}`)) {
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
        alert(`Error: ${error.message}`);
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
        alert(`Error: ${error.message}`);
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
        
        document.getElementById('emergencyTokenId').value = '';
        
        await refreshStatus();
        await loadInventory();
        
    } catch (error) {
        console.error('Emergency withdraw error:', error);
        log(`❌ Error: ${error.message}`, 'error');
        alert(`Error: ${error.message}`);
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
        
        document.getElementById('emergencyHouse').value = '';
        
        await refreshStatus();
        await loadInventory();
        
    } catch (error) {
        console.error('Emergency withdraw error:', error);
        log(`❌ Error: ${error.message}`, 'error');
        alert(`Error: ${error.message}`);
    }
}

// View on Etherscan
function viewOnEtherscan() {
    window.open(`https://etherscan.io/address/${CONFIG.DISTRIBUTION_CONTRACT}`, '_blank');
}

// Handle account/network changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        log('⚠️ Account changed, reloading...', 'info');
        setTimeout(() => location.reload(), 1000);
    });
    
    window.ethereum.on('chainChanged', () => {
        log('⚠️ Network changed, reloading...', 'info');
        setTimeout(() => location.reload(), 1000);
    });
}
