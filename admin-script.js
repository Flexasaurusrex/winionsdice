// Enhanced Winions Distribution Admin Script
// Complete contract management interface

let provider;
let signer;
let contract;
let userAddress;

const CONTRACT_ADDRESS = "0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7";

// Initialize on page load
window.addEventListener('load', async () => {
    log('Admin panel ready. Please connect your wallet.');
});

// Connect Wallet
document.getElementById('connectWallet').addEventListener('click', async () => {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask!');
            return;
        }

        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        userAddress = accounts[0];
        
        // Set up provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Initialize contract
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // Update UI
        document.getElementById('walletAddress').textContent = 
            userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
        document.getElementById('walletInfo').classList.add('active');
        document.getElementById('connectWallet').textContent = 'CONNECTED ✓';
        document.getElementById('connectWallet').disabled = true;
        
        // Verify owner
        const owner = await contract.owner();
        const isOwner = owner.toLowerCase() === userAddress.toLowerCase();
        
        if (isOwner) {
            document.getElementById('ownerStatus').innerHTML = 
                '<span style="color: #00ff00;">✓ ADMIN ACCESS</span>';
            document.getElementById('statusDashboard').classList.remove('hidden');
            log('Admin access verified!', 'success');
            
            // Load initial data
            await loadDashboard();
        } else {
            document.getElementById('ownerStatus').innerHTML = 
                '<span style="color: #ff0000;">✗ NOT AUTHORIZED</span>';
            log('Error: This wallet is not the contract owner!', 'error');
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        log('Failed to connect wallet: ' + error.message, 'error');
    }
});

// Load Dashboard Data
async function loadDashboard() {
    try {
        log('Loading dashboard data...');
        
        // Get distribution status
        const distActive = await contract.distributionActive();
        updateDistributionStatus(distActive);
        
        // Get contract balance
        const balance = await provider.getBalance(CONTRACT_ADDRESS);
        const balanceInEth = ethers.utils.formatEther(balance);
        document.getElementById('contractBalance').textContent = 
            parseFloat(balanceInEth).toFixed(4) + ' ETH';
        document.getElementById('ethBalance').textContent = 
            parseFloat(balanceInEth).toFixed(4) + ' ETH';
        
        // Get prices
        await loadPrices();
        
        // Get house inventory
        await loadHouseInventory();
        
        log('Dashboard loaded successfully!', 'success');
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        log('Error loading dashboard: ' + error.message, 'error');
    }
}

// Update Distribution Status Display
function updateDistributionStatus(isActive) {
    const statusElement = document.getElementById('distributionStatus');
    const textElement = document.getElementById('distStatusText');
    
    if (isActive) {
        statusElement.textContent = 'ACTIVE';
        statusElement.classList.remove('inactive');
        statusElement.classList.add('active');
        textElement.textContent = 'Active - Users can claim NFTs';
    } else {
        statusElement.textContent = 'INACTIVE';
        statusElement.classList.remove('active');
        statusElement.classList.add('inactive');
        textElement.textContent = 'Inactive - Claims paused';
    }
}

// Load Current Prices
async function loadPrices() {
    try {
        const prices = await contract.getPrices();
        
        document.getElementById('price1').textContent = 
            ethers.utils.formatEther(prices.single) + ' ETH';
        document.getElementById('price3').textContent = 
            ethers.utils.formatEther(prices.three) + ' ETH';
        document.getElementById('price5').textContent = 
            ethers.utils.formatEther(prices.five) + ' ETH';
            
    } catch (error) {
        console.error('Error loading prices:', error);
    }
}

// Load House Inventory
async function loadHouseInventory() {
    try {
        const houses = await contract.getAllHouses();
        const inventoryDiv = document.getElementById('houseInventory');
        inventoryDiv.innerHTML = '';
        
        let totalNFTs = 0;
        
        for (const house of houses) {
            const count = await contract.getHouseInventoryCount(house);
            totalNFTs += count.toNumber();
            
            const houseItem = document.createElement('div');
            houseItem.className = 'house-item';
            houseItem.innerHTML = `
                <div class="house-name">${house.replace('House of ', '')}</div>
                <div class="house-count">${count.toNumber()}</div>
            `;
            inventoryDiv.appendChild(houseItem);
        }
        
        document.getElementById('totalNFTs').textContent = totalNFTs;
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        log('Error loading inventory: ' + error.message, 'error');
    }
}

// Refresh Inventory
async function refreshInventory() {
    log('Refreshing inventory...');
    await loadHouseInventory();
    log('Inventory refreshed!', 'success');
}

// Toggle Distribution
document.getElementById('toggleDistribution').addEventListener('click', async () => {
    try {
        log('Toggling distribution status...');
        
        const tx = await contract.toggleDistribution();
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        // Get new status
        const newStatus = await contract.distributionActive();
        updateDistributionStatus(newStatus);
        
        log(`Distribution ${newStatus ? 'ACTIVATED' : 'DEACTIVATED'} successfully!`, 'success');
        
    } catch (error) {
        console.error('Toggle error:', error);
        log('Error toggling distribution: ' + error.message, 'error');
    }
});

// Update Single Price
async function updatePrice(priceType) {
    try {
        let newPrice, functionName, inputId;
        
        if (priceType === 'single') {
            inputId = 'newPrice1';
            functionName = 'setSingleRollPrice';
        } else if (priceType === 'three') {
            inputId = 'newPrice3';
            functionName = 'setThreeRollPrice';
        } else if (priceType === 'five') {
            inputId = 'newPrice5';
            functionName = 'setFiveRollPrice';
        }
        
        const priceInput = document.getElementById(inputId).value;
        if (!priceInput || parseFloat(priceInput) <= 0) {
            alert('Please enter a valid price!');
            return;
        }
        
        newPrice = ethers.utils.parseEther(priceInput);
        
        log(`Updating ${priceType} roll price to ${priceInput} ETH...`);
        
        const tx = await contract[functionName](newPrice);
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        await loadPrices();
        document.getElementById(inputId).value = '';
        
        log(`Price updated successfully!`, 'success');
        
    } catch (error) {
        console.error('Price update error:', error);
        log('Error updating price: ' + error.message, 'error');
    }
}

// Update All Prices at Once
async function updateAllPrices() {
    try {
        const price1 = document.getElementById('newPrice1').value;
        const price3 = document.getElementById('newPrice3').value;
        const price5 = document.getElementById('newPrice5').value;
        
        if (!price1 || !price3 || !price5) {
            alert('Please fill in all three price fields!');
            return;
        }
        
        if (parseFloat(price1) <= 0 || parseFloat(price3) <= 0 || parseFloat(price5) <= 0) {
            alert('All prices must be greater than 0!');
            return;
        }
        
        log('Updating all prices...');
        
        // Update all three
        await updatePrice('single');
        await updatePrice('three');
        await updatePrice('five');
        
        log('All prices updated successfully!', 'success');
        
    } catch (error) {
        console.error('Bulk price update error:', error);
        log('Error updating prices: ' + error.message, 'error');
    }
}

// Add NFTs to House
async function addToHouse() {
    try {
        const house = document.getElementById('houseSelect').value;
        const tokenIdsInput = document.getElementById('tokenIds').value;
        
        if (!house) {
            alert('Please select a house!');
            return;
        }
        
        if (!tokenIdsInput) {
            alert('Please enter token IDs!');
            return;
        }
        
        // Parse token IDs
        const tokenIds = tokenIdsInput
            .split(',')
            .map(id => id.trim())
            .filter(id => id !== '')
            .map(id => parseInt(id));
        
        if (tokenIds.length === 0) {
            alert('No valid token IDs found!');
            return;
        }
        
        log(`Adding ${tokenIds.length} NFTs to ${house}...`);
        
        const tx = await contract.addToHouseInventory(house, tokenIds);
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        document.getElementById('tokenIds').value = '';
        await loadHouseInventory();
        
        log(`Successfully added ${tokenIds.length} NFTs to ${house}!`, 'success');
        
    } catch (error) {
        console.error('Add to house error:', error);
        log('Error adding to house: ' + error.message, 'error');
    }
}

// Add Single Address to Whitelist
async function addSingleToWhitelist() {
    try {
        const address = document.getElementById('singleAddress').value;
        const rolls = document.getElementById('singleRolls').value;
        
        if (!address || !ethers.utils.isAddress(address)) {
            alert('Please enter a valid Ethereum address!');
            return;
        }
        
        if (!rolls || parseInt(rolls) < 0) {
            alert('Please enter a valid number of rolls!');
            return;
        }
        
        log(`Adding ${address} to whitelist with ${rolls} free rolls...`);
        
        const tx = await contract.updateWhitelist(address, parseInt(rolls));
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        document.getElementById('singleAddress').value = '';
        document.getElementById('singleRolls').value = '';
        
        log(`Successfully added ${address} to whitelist!`, 'success');
        
    } catch (error) {
        console.error('Whitelist add error:', error);
        log('Error adding to whitelist: ' + error.message, 'error');
    }
}

// Bulk Add to Whitelist
async function bulkAddToWhitelist() {
    try {
        const bulkInput = document.getElementById('bulkWhitelist').value;
        
        if (!bulkInput.trim()) {
            alert('Please enter addresses and rolls!');
            return;
        }
        
        // Parse CSV format: address, rolls
        const lines = bulkInput.split('\n').filter(line => line.trim() !== '');
        const addresses = [];
        const rolls = [];
        
        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length !== 2) {
                alert(`Invalid format on line: ${line}\nExpected: address, rolls`);
                return;
            }
            
            const address = parts[0];
            const roll = parseInt(parts[1]);
            
            if (!ethers.utils.isAddress(address)) {
                alert(`Invalid address: ${address}`);
                return;
            }
            
            if (isNaN(roll) || roll < 0) {
                alert(`Invalid roll count for ${address}: ${parts[1]}`);
                return;
            }
            
            addresses.push(address);
            rolls.push(roll);
        }
        
        if (addresses.length === 0) {
            alert('No valid entries found!');
            return;
        }
        
        log(`Adding ${addresses.length} addresses to whitelist...`);
        
        const tx = await contract.addToWhitelist(addresses, rolls);
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        document.getElementById('bulkWhitelist').value = '';
        
        log(`Successfully added ${addresses.length} addresses to whitelist!`, 'success');
        
    } catch (error) {
        console.error('Bulk whitelist error:', error);
        log('Error adding bulk whitelist: ' + error.message, 'error');
    }
}

// Remove from Whitelist
async function removeFromWhitelist() {
    try {
        const address = document.getElementById('removeAddress').value;
        
        if (!address || !ethers.utils.isAddress(address)) {
            alert('Please enter a valid Ethereum address!');
            return;
        }
        
        if (!confirm(`Are you sure you want to remove ${address} from the whitelist?`)) {
            return;
        }
        
        log(`Removing ${address} from whitelist...`);
        
        // Set rolls to 0 to remove
        const tx = await contract.updateWhitelist(address, 0);
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        document.getElementById('removeAddress').value = '';
        
        log(`Successfully removed ${address} from whitelist!`, 'success');
        
    } catch (error) {
        console.error('Remove whitelist error:', error);
        log('Error removing from whitelist: ' + error.message, 'error');
    }
}

// Withdraw ETH
async function withdrawETH() {
    try {
        const balance = await provider.getBalance(CONTRACT_ADDRESS);
        const balanceInEth = ethers.utils.formatEther(balance);
        
        if (parseFloat(balanceInEth) === 0) {
            alert('No ETH to withdraw!');
            return;
        }
        
        if (!confirm(`Withdraw ${balanceInEth} ETH to your wallet?`)) {
            return;
        }
        
        log(`Withdrawing ${balanceInEth} ETH...`);
        
        const tx = await contract.withdrawETH();
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        await loadDashboard();
        
        log(`Successfully withdrew ${balanceInEth} ETH!`, 'success');
        
    } catch (error) {
        console.error('Withdraw error:', error);
        log('Error withdrawing ETH: ' + error.message, 'error');
    }
}

// Emergency Withdraw Single NFT
async function emergencyWithdrawNFT() {
    try {
        const tokenId = document.getElementById('emergencyTokenId').value;
        
        if (!tokenId || parseInt(tokenId) < 0) {
            alert('Please enter a valid token ID!');
            return;
        }
        
        if (!confirm(`EMERGENCY: Withdraw NFT #${tokenId} to your wallet?`)) {
            return;
        }
        
        log(`Emergency withdrawing NFT #${tokenId}...`);
        
        const tx = await contract.emergencyWithdrawNFT(parseInt(tokenId));
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        document.getElementById('emergencyTokenId').value = '';
        await loadHouseInventory();
        
        log(`Successfully withdrew NFT #${tokenId}!`, 'success');
        
    } catch (error) {
        console.error('Emergency withdraw error:', error);
        log('Error withdrawing NFT: ' + error.message, 'error');
    }
}

// Emergency Withdraw Entire House
async function emergencyWithdrawHouse() {
    try {
        const house = document.getElementById('emergencyHouse').value;
        
        if (!house) {
            alert('Please select a house!');
            return;
        }
        
        const count = await contract.getHouseInventoryCount(house);
        
        if (count.toNumber() === 0) {
            alert('This house has no NFTs!');
            return;
        }
        
        if (!confirm(`EMERGENCY: Withdraw all ${count.toNumber()} NFTs from ${house}?`)) {
            return;
        }
        
        log(`Emergency withdrawing ${count.toNumber()} NFTs from ${house}...`);
        
        const tx = await contract.emergencyWithdrawHouse(house);
        log('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        await loadHouseInventory();
        
        log(`Successfully withdrew all NFTs from ${house}!`, 'success');
        
    } catch (error) {
        console.error('Emergency house withdraw error:', error);
        log('Error withdrawing house: ' + error.message, 'error');
    }
}

// User Lookup
async function lookupUser() {
    try {
        const address = document.getElementById('lookupAddress').value;
        
        if (!address || !ethers.utils.isAddress(address)) {
            alert('Please enter a valid Ethereum address!');
            return;
        }
        
        log(`Looking up user: ${address}...`);
        
        const rolls = await contract.getUserRolls(address);
        
        const resultDiv = document.getElementById('userLookupResult');
        resultDiv.innerHTML = `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,51,51,0.3);">
                <strong>Address:</strong> ${address}<br>
                <strong>Free Rolls:</strong> <span style="color: #00ff00;">${rolls.freeRolls.toNumber()}</span><br>
                <strong>Purchased Rolls:</strong> <span style="color: #ff9900;">${rolls.paidRolls.toNumber()}</span><br>
                <strong>Total Rolls:</strong> <span style="color: #ff3333;">${rolls.freeRolls.toNumber() + rolls.paidRolls.toNumber()}</span>
            </div>
        `;
        
        log('User lookup complete!', 'success');
        
    } catch (error) {
        console.error('Lookup error:', error);
        log('Error looking up user: ' + error.message, 'error');
    }
}

// Activity Log
function log(message, type = 'info') {
    const logDiv = document.getElementById('activityLog');
    const timestamp = new Date().toLocaleTimeString();
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    
    logDiv.insertBefore(entry, logDiv.firstChild);
    
    // Keep only last 50 entries
    while (logDiv.children.length > 50) {
        logDiv.removeChild(logDiv.lastChild);
    }
}

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            log('Wallet disconnected', 'error');
        } else {
            log('Account changed - please refresh the page', 'error');
            setTimeout(() => window.location.reload(), 2000);
        }
    });

    window.ethereum.on('chainChanged', () => {
        log('Network changed - please refresh the page', 'error');
        setTimeout(() => window.location.reload(), 2000);
    });
}
