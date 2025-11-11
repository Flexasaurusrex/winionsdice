// Winions Admin Panel Script - COMPLETE
// All functions integrated with CSV token mapping

let provider;
let signer;
let adminAddress;
let distributionContract;
let winionsContract;

// Connect Admin Wallet
document.getElementById('connectAdminBtn').addEventListener('click', async () => {
    try {
        if (typeof window.ethereum === 'undefined') {
            showError('Please install MetaMask!');
            return;
        }

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        adminAddress = accounts[0];
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        // Initialize contracts
        distributionContract = new ethers.Contract(
            CONFIG.DISTRIBUTION_CONTRACT,
            DISTRIBUTION_CONTRACT_ABI,
            signer
        );
        
        winionsContract = new ethers.Contract(
            CONFIG.WINIONS_NFT_CONTRACT,
            WINIONS_NFT_ABI,
            signer
        );
        
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== CONFIG.CHAIN_ID) {
            showError('Please switch to Ethereum Mainnet');
            return;
        }
        
        // Check if admin
        const owner = await distributionContract.owner();
        if (owner.toLowerCase() !== adminAddress.toLowerCase()) {
            showError('This wallet is not the contract owner!');
            return;
        }
        
        // Success - show admin panel
        document.getElementById('adminGate').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        document.getElementById('adminWallet').textContent = 
            `${adminAddress.slice(0, 6)}...${adminAddress.slice(-4)}`;
        
        addLog('Admin connected successfully', 'success');
        
        // Load initial data
        await refreshStatus();
        await loadCurrentPrices();
        
    } catch (error) {
        console.error('Connection error:', error);
        showError(error.message);
    }
});

function showError(message) {
    document.getElementById('adminError').textContent = message;
    setTimeout(() => {
        document.getElementById('adminError').textContent = '';
    }, 5000);
}

// Refresh Status
async function refreshStatus() {
    try {
        addLog('Refreshing status...', 'info');
        
        // Distribution status
        const isActive = await distributionContract.distributionActive();
        const statusEl = document.getElementById('distributionStatus');
        statusEl.textContent = isActive ? 'ACTIVE' : 'INACTIVE';
        statusEl.className = isActive ? 'status-value active' : 'status-value inactive';
        
        // Update toggle button
        const toggleBtn = document.getElementById('toggleDistText');
        toggleBtn.textContent = isActive ? '🛑 Deactivate Distribution' : '🔄 Activate Distribution';
        
        // Contract balance
        const balance = await provider.getBalance(CONFIG.DISTRIBUTION_CONTRACT);
        document.getElementById('contractBalance').textContent = 
            `${ethers.formatEther(balance)} ETH`;
        
        // Total NFTs (estimate)
        document.getElementById('totalNFTs').textContent = '...';
        
        addLog('Status refreshed', 'success');
        
    } catch (error) {
        console.error('Error refreshing status:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Toggle Distribution
async function toggleDistribution() {
    try {
        const isActive = await distributionContract.distributionActive();
        
        addLog(isActive ? 'Deactivating distribution...' : 'Activating distribution...', 'info');
        
        const tx = await distributionContract.setDistributionActive(!isActive);
        addLog('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        addLog(`Distribution ${!isActive ? 'activated' : 'deactivated'} successfully`, 'success');
        await refreshStatus();
        
    } catch (error) {
        console.error('Error toggling distribution:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Withdraw ETH
async function withdrawETH() {
    try {
        if (!confirm('Withdraw all ETH from contract to your wallet?')) return;
        
        addLog('Withdrawing ETH...', 'info');
        
        const tx = await distributionContract.withdrawETH();
        addLog('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        addLog('ETH withdrawn successfully', 'success');
        await refreshStatus();
        
    } catch (error) {
        console.error('Error withdrawing ETH:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// View on Etherscan
function viewOnEtherscan() {
    window.open(`${CONFIG.ETHERSCAN_URL}/address/${CONFIG.DISTRIBUTION_CONTRACT}`, '_blank');
}

// Check My NFTs
async function checkMyNFTs() {
    try {
        addLog('Checking your NFT ownership...', 'info');
        
        // Check tokens 480-666 (Winions range)
        const ownedTokens = [];
        const batchSize = 20;
        
        for (let start = 480; start <= 666; start += batchSize) {
            const end = Math.min(start + batchSize - 1, 666);
            const promises = [];
            
            for (let tokenId = start; tokenId <= end; tokenId++) {
                promises.push(
                    winionsContract.ownerOf(tokenId)
                        .then(owner => ({ tokenId, owner }))
                        .catch(() => ({ tokenId, owner: null }))
                );
            }
            
            const results = await Promise.all(promises);
            results.forEach(({ tokenId, owner }) => {
                if (owner && owner.toLowerCase() === adminAddress.toLowerCase()) {
                    ownedTokens.push(tokenId);
                }
            });
        }
        
        // Group by house using CSV mapping
        const byHouse = {};
        ownedTokens.forEach(tokenId => {
            const house = getHouseFromTokenId(tokenId);
            if (!byHouse[house]) {
                byHouse[house] = [];
            }
            byHouse[house].push(tokenId);
        });
        
        // Display results
        const resultsDiv = document.getElementById('nftOwnershipResults');
        const listDiv = document.getElementById('nftList');
        const summaryDiv = document.getElementById('nftSummary');
        
        if (ownedTokens.length === 0) {
            listDiv.innerHTML = '<p style="color: #ff4444;">You own 0 Winions NFTs</p>';
            summaryDiv.innerHTML = '';
            resultsDiv.style.display = 'block';
            addLog('No NFTs found in your wallet', 'info');
            return;
        }
        
        // Create display
        let html = `<p style="color: #00ff00; margin-bottom: 20px;"><strong>You own ${ownedTokens.length} Winions!</strong></p>`;
        
        // Sort houses by count
        const sortedHouses = Object.entries(byHouse).sort((a, b) => b[1].length - a[1].length);
        
        sortedHouses.forEach(([house, tokens]) => {
            const tokenList = tokens.sort((a, b) => a - b).join(', ');
            
            html += `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.5); border-radius: 5px;">
                    <h4 style="color: #ff1a1a; margin-bottom: 10px;">${house}</h4>
                    <p style="color: #00ff00; font-size: 18px; font-weight: bold; margin: 5px 0;">
                        ${tokens.length} NFT${tokens.length !== 1 ? 's' : ''}
                    </p>
                    <p style="color: #ccc; font-size: 13px; word-break: break-all;">
                        Token IDs: ${tokenList}
                    </p>
                </div>
            `;
        });
        
        listDiv.innerHTML = html;
        
        // Summary
        const havocCount = byHouse['House of Havoc']?.length || 0;
        const misfitsCount = byHouse['House of Misfits']?.length || 0;
        const commonsCount = havocCount + misfitsCount;
        
        summaryDiv.innerHTML = `
            <h4 style="color: #ff1a1a; margin-bottom: 10px;">Your Collection Summary</h4>
            <p style="color: #ccc;">
                <strong>Total NFTs:</strong> ${ownedTokens.length}<br>
                <strong>Houses Represented:</strong> ${Object.keys(byHouse).length} of 13<br>
                <strong>Commons (Havoc + Misfits):</strong> ${commonsCount}<br>
                <strong>Uncommon & Rare:</strong> ${ownedTokens.length - commonsCount}
            </p>
        `;
        
        resultsDiv.style.display = 'block';
        addLog(`You own ${ownedTokens.length} Winions across ${Object.keys(byHouse).length} houses`, 'success');
        
    } catch (error) {
        console.error('Error checking NFT ownership:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Transfer Single NFT
async function transferSingleNFT() {
    try {
        const tokenId = document.getElementById('singleTransferTokenId').value;
        if (!tokenId) {
            addLog('Please enter a token ID', 'error');
            return;
        }
        
        addLog(`Transferring token ${tokenId} to contract...`, 'info');
        
        const tx = await winionsContract.transferFrom(
            adminAddress,
            CONFIG.DISTRIBUTION_CONTRACT,
            tokenId
        );
        
        addLog('Transaction sent, waiting for confirmation...', 'info');
        await tx.wait();
        
        addLog(`Token ${tokenId} transferred successfully`, 'success');
        document.getElementById('singleTransferTokenId').value = '';
        
    } catch (error) {
        console.error('Transfer error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Batch Transfer NFTs
async function batchTransferNFTs() {
    try {
        const input = document.getElementById('batchTransferTokenIds').value;
        const tokenIds = input.split(',').map(id => id.trim()).filter(id => id);
        
        if (tokenIds.length === 0) {
            addLog('Please enter token IDs', 'error');
            return;
        }
        
        const progressDiv = document.getElementById('transferProgress');
        const statusDiv = document.getElementById('transferStatus');
        progressDiv.style.display = 'block';
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            
            try {
                statusDiv.innerHTML = `Transferring ${i + 1}/${tokenIds.length}: Token ${tokenId}...`;
                
                const tx = await winionsContract.transferFrom(
                    adminAddress,
                    CONFIG.DISTRIBUTION_CONTRACT,
                    tokenId
                );
                
                await tx.wait();
                successCount++;
                
                statusDiv.innerHTML += ` ✅<br>`;
                
            } catch (error) {
                failCount++;
                statusDiv.innerHTML += ` ❌ Error: ${error.message}<br>`;
            }
        }
        
        statusDiv.innerHTML += `<br><strong>Complete!</strong> Success: ${successCount}, Failed: ${failCount}`;
        addLog(`Batch transfer complete: ${successCount} success, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
        
    } catch (error) {
        console.error('Batch transfer error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Lookup User
async function lookupUser() {
    try {
        const address = document.getElementById('lookupAddress').value;
        if (!address || !ethers.isAddress(address)) {
            addLog('Please enter a valid address', 'error');
            return;
        }
        
        addLog(`Looking up ${address}...`, 'info');
        
        const [freeRolls, paidRolls] = await distributionContract.getUserRolls(address);
        const total = Number(freeRolls) + Number(paidRolls);
        
        document.getElementById('lookupAddr').textContent = address;
        document.getElementById('lookupFree').textContent = freeRolls.toString();
        document.getElementById('lookupPaid').textContent = paidRolls.toString();
        document.getElementById('lookupTotal').textContent = total.toString();
        
        document.getElementById('userLookupResult').style.display = 'block';
        addLog('User lookup complete', 'success');
        
    } catch (error) {
        console.error('Lookup error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Update User Whitelist
async function updateUserWhitelist() {
    try {
        const address = document.getElementById('lookupAddr').textContent;
        const rolls = prompt('Enter number of free rolls:');
        
        if (!rolls) return;
        
        addLog(`Updating whitelist for ${address}...`, 'info');
        
        const tx = await distributionContract.addToWhitelist(address, parseInt(rolls));
        addLog('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        addLog('Whitelist updated successfully', 'success');
        await lookupUser();
        
    } catch (error) {
        console.error('Update error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Remove from Whitelist
async function removeFromWhitelist() {
    try {
        const address = document.getElementById('lookupAddr').textContent;
        
        if (!confirm(`Remove ${address} from whitelist?`)) return;
        
        addLog(`Removing ${address} from whitelist...`, 'info');
        
        const tx = await distributionContract.addToWhitelist(address, 0);
        addLog('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        addLog('Removed from whitelist successfully', 'success');
        await lookupUser();
        
    } catch (error) {
        console.error('Remove error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Check Contract NFTs
async function checkContractNFTs() {
    try {
        addLog('Checking contract NFT holdings...', 'info');
        
        const contractAddress = CONFIG.DISTRIBUTION_CONTRACT;
        
        // Check tokens 480-666 (Winions range)
        const ownedTokens = [];
        const batchSize = 20;
        
        for (let start = 480; start <= 666; start += batchSize) {
            const end = Math.min(start + batchSize - 1, 666);
            const promises = [];
            
            for (let tokenId = start; tokenId <= end; tokenId++) {
                promises.push(
                    winionsContract.ownerOf(tokenId)
                        .then(owner => ({ tokenId, owner }))
                        .catch(() => ({ tokenId, owner: null }))
                );
            }
            
            const results = await Promise.all(promises);
            results.forEach(({ tokenId, owner }) => {
                if (owner && owner.toLowerCase() === contractAddress.toLowerCase()) {
                    ownedTokens.push(tokenId);
                }
            });
            
            addLog(`Checked tokens ${start}-${end}...`, 'info');
        }
        
        // Group by house using CSV mapping
        const byHouse = {};
        ownedTokens.forEach(tokenId => {
            const house = getHouseFromTokenId(tokenId);
            if (!byHouse[house]) {
                byHouse[house] = [];
            }
            byHouse[house].push(tokenId);
        });
        
        // Display results
        const resultsDiv = document.getElementById('contractNFTResults');
        const listDiv = document.getElementById('contractNFTList');
        const summaryDiv = document.getElementById('contractNFTSummary');
        
        if (ownedTokens.length === 0) {
            listDiv.innerHTML = '<p style="color: #ff4444;">Contract owns 0 Winions NFTs</p>';
            summaryDiv.innerHTML = '';
            resultsDiv.style.display = 'block';
            addLog('Contract owns no NFTs', 'error');
            return;
        }
        
        // Create display
        let html = `<p style="color: #00ff00; margin-bottom: 20px;"><strong>Total: ${ownedTokens.length} NFTs</strong></p>`;
        
        // Sort houses by count
        const sortedHouses = Object.entries(byHouse).sort((a, b) => b[1].length - a[1].length);
        
        sortedHouses.forEach(([house, tokens]) => {
            const tokenList = tokens.sort((a, b) => a - b).join(', ');
            const arrayFormat = `[${tokens.sort((a, b) => a - b).join(', ')}]`;
            
            html += `
                <div style="margin-bottom: 25px; padding: 15px; background: rgba(0,0,0,0.5); border-radius: 5px;">
                    <h4 style="color: #ff1a1a; margin-bottom: 10px;">${house} (${tokens.length})</h4>
                    <p style="color: #ccc; font-size: 13px; word-break: break-all; margin-bottom: 10px;">
                        ${tokenList}
                    </p>
                    <div style="margin-top: 10px;">
                        <strong style="color: #4a90e2;">Ready-to-paste array:</strong>
                        <input type="text" value='${arrayFormat}' 
                               onclick="this.select(); document.execCommand('copy');" 
                               readonly
                               style="width: 100%; margin-top: 5px; padding: 8px; background: #1a1a1a; border: 1px solid #4a90e2; color: #00ff00; font-family: monospace; cursor: pointer;">
                        <div style="color: #666; font-size: 11px; margin-top: 5px;">
                            👆 Click to select & copy
                        </div>
                    </div>
                </div>
            `;
        });
        
        listDiv.innerHTML = html;
        
        // Summary
        summaryDiv.innerHTML = `
            <p style="color: #ffd700;"><strong>Summary:</strong></p>
            <p style="color: #ccc;">
                Commons: ${(byHouse['House of Havoc']?.length || 0) + (byHouse['House of Misfits']?.length || 0)} 
                (Havoc: ${byHouse['House of Havoc']?.length || 0}, Misfits: ${byHouse['House of Misfits']?.length || 0})
            </p>
            <p style="color: #ccc;">Total Houses with NFTs: ${Object.keys(byHouse).length}</p>
        `;
        
        resultsDiv.style.display = 'block';
        addLog(`Found ${ownedTokens.length} NFTs in contract across ${Object.keys(byHouse).length} houses`, 'success');
        
    } catch (error) {
        console.error('Error checking contract NFTs:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Load Inventory
async function loadInventory() {
    try {
        addLog('Loading house inventory...', 'info');
        
        const houses = [
            'House of Havoc', 'House of Misfits', 'House of Frog',
            'House of Theory', 'House of Spectrum', 'House of Clay',
            'House of Stencil', 'House of Royal', 'House of Shadows',
            'House of Hellish', 'House of Hologram', 'House of Gold',
            'House of Death'
        ];
        
        const inventoryDisplay = document.getElementById('inventoryDisplay');
        inventoryDisplay.innerHTML = '';
        
        for (const house of houses) {
            try {
                const count = await distributionContract.getHouseInventoryCount(house);
                
                const card = document.createElement('div');
                card.className = 'house-card';
                card.innerHTML = `
                    <div class="house-name">${house}</div>
                    <div class="house-count">${count.toString()} NFTs</div>
                `;
                inventoryDisplay.appendChild(card);
                
            } catch (error) {
                console.error(`Error loading ${house}:`, error);
            }
        }
        
        addLog('Inventory loaded', 'success');
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Add to House Inventory
async function addToHouseInventory() {
    try {
        const house = document.getElementById('houseSelect').value;
        const input = document.getElementById('tokenIds').value;
        
        if (!house) {
            addLog('Please select a house', 'error');
            return;
        }
        
        const tokenIds = input.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        
        if (tokenIds.length === 0) {
            addLog('Please enter valid token IDs', 'error');
            return;
        }
        
        addLog(`Adding ${tokenIds.length} NFTs to ${house}...`, 'info');
        
        const tx = await distributionContract.addToHouseInventory(house, tokenIds);
        addLog('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        addLog(`Successfully added ${tokenIds.length} NFTs to ${house}`, 'success');
        document.getElementById('tokenIds').value = '';
        
        await loadInventory();
        
    } catch (error) {
        console.error('Error adding to inventory:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Add Single to Whitelist
async function addSingleToWhitelist() {
    try {
        const address = document.getElementById('whitelistAddress').value;
        const rolls = parseInt(document.getElementById('freeRolls').value);
        
        if (!address || !ethers.isAddress(address)) {
            addLog('Please enter a valid address', 'error');
            return;
        }
        
        if (isNaN(rolls) || rolls < 1) {
            addLog('Please enter a valid number of rolls', 'error');
            return;
        }
        
        addLog(`Adding ${address} to whitelist with ${rolls} rolls...`, 'info');
        
        const tx = await distributionContract.addToWhitelist(address, rolls);
        addLog('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        addLog('Added to whitelist successfully', 'success');
        document.getElementById('whitelistAddress').value = '';
        document.getElementById('freeRolls').value = '3';
        
    } catch (error) {
        console.error('Whitelist error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Batch Add to Whitelist
async function batchAddToWhitelist() {
    try {
        const input = document.getElementById('batchWhitelist').value;
        const lines = input.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            addLog('Please enter addresses and rolls', 'error');
            return;
        }
        
        addLog(`Adding ${lines.length} addresses to whitelist...`, 'info');
        
        let successCount = 0;
        let failCount = 0;
        
        for (const line of lines) {
            const [address, rolls] = line.split(',').map(s => s.trim());
            
            if (!ethers.isAddress(address)) {
                addLog(`Invalid address: ${address}`, 'error');
                failCount++;
                continue;
            }
            
            try {
                const tx = await distributionContract.addToWhitelist(address, parseInt(rolls));
                await tx.wait();
                successCount++;
                addLog(`✅ ${address}: ${rolls} rolls`, 'success');
                
            } catch (error) {
                failCount++;
                addLog(`❌ ${address}: ${error.message}`, 'error');
            }
        }
        
        addLog(`Batch complete: ${successCount} success, ${failCount} failed`, 'info');
        
    } catch (error) {
        console.error('Batch whitelist error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Batch Remove from Whitelist
async function batchRemoveFromWhitelist() {
    try {
        const input = document.getElementById('batchRemoveWhitelist').value;
        const addresses = input.split('\n').filter(line => line.trim()).map(addr => addr.trim());
        
        if (addresses.length === 0) {
            addLog('Please enter addresses to remove', 'error');
            return;
        }
        
        if (!confirm(`Remove ${addresses.length} addresses from whitelist?`)) return;
        
        addLog(`Removing ${addresses.length} addresses...`, 'info');
        
        let successCount = 0;
        let failCount = 0;
        
        for (const address of addresses) {
            if (!ethers.isAddress(address)) {
                addLog(`Invalid address: ${address}`, 'error');
                failCount++;
                continue;
            }
            
            try {
                const tx = await distributionContract.addToWhitelist(address, 0);
                await tx.wait();
                successCount++;
                addLog(`✅ Removed ${address}`, 'success');
                
            } catch (error) {
                failCount++;
                addLog(`❌ ${address}: ${error.message}`, 'error');
            }
        }
        
        addLog(`Batch complete: ${successCount} success, ${failCount} failed`, 'info');
        
    } catch (error) {
        console.error('Batch remove error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Load Current Prices
async function loadCurrentPrices() {
    try {
        const [single, three, five] = await distributionContract.getPrices();
        
        const priceText = `
            Single: ${ethers.formatEther(single)} ETH | 
            3-Pack: ${ethers.formatEther(three)} ETH | 
            5-Pack: ${ethers.formatEther(five)} ETH
        `;
        
        document.getElementById('currentPrices').textContent = priceText;
        
    } catch (error) {
        console.error('Error loading prices:', error);
        document.getElementById('currentPrices').textContent = 'Error loading prices';
    }
}

// Update Single Price
async function updateSinglePrice() {
    try {
        const price = document.getElementById('singlePrice').value;
        if (!price) {
            addLog('Please enter a price', 'error');
            return;
        }
        
        addLog(`Updating single roll price to ${price} ETH...`, 'info');
        
        const priceWei = ethers.parseEther(price);
        const tx = await distributionContract.setSingleRollPrice(priceWei);
        
        addLog('Transaction sent, waiting for confirmation...', 'info');
        await tx.wait();
        
        addLog('Price updated successfully', 'success');
        document.getElementById('singlePrice').value = '';
        await loadCurrentPrices();
        
    } catch (error) {
        console.error('Error updating price:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Update Three Price
async function updateThreePrice() {
    try {
        const price = document.getElementById('threePrice').value;
        if (!price) {
            addLog('Please enter a price', 'error');
            return;
        }
        
        addLog(`Updating 3-roll price to ${price} ETH...`, 'info');
        
        const priceWei = ethers.parseEther(price);
        const tx = await distributionContract.setThreeRollPrice(priceWei);
        
        addLog('Transaction sent, waiting for confirmation...', 'info');
        await tx.wait();
        
        addLog('Price updated successfully', 'success');
        document.getElementById('threePrice').value = '';
        await loadCurrentPrices();
        
    } catch (error) {
        console.error('Error updating price:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Update Five Price
async function updateFivePrice() {
    try {
        const price = document.getElementById('fivePrice').value;
        if (!price) {
            addLog('Please enter a price', 'error');
            return;
        }
        
        addLog(`Updating 5-roll price to ${price} ETH...`, 'info');
        
        const priceWei = ethers.parseEther(price);
        const tx = await distributionContract.setFiveRollPrice(priceWei);
        
        addLog('Transaction sent, waiting for confirmation...', 'info');
        await tx.wait();
        
        addLog('Price updated successfully', 'success');
        document.getElementById('fivePrice').value = '';
        await loadCurrentPrices();
        
    } catch (error) {
        console.error('Error updating price:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Bulk Update Prices
async function bulkUpdatePrices() {
    try {
        const single = document.getElementById('bulkSinglePrice').value;
        const three = document.getElementById('bulkThreePrice').value;
        const five = document.getElementById('bulkFivePrice').value;
        
        if (!single || !three || !five) {
            addLog('Please enter all three prices', 'error');
            return;
        }
        
        addLog('Updating all prices (3 transactions)...', 'info');
        
        // Single
        let tx = await distributionContract.setSingleRollPrice(ethers.parseEther(single));
        addLog('1/3 Transaction sent...', 'info');
        await tx.wait();
        addLog('1/3 Single price updated', 'success');
        
        // Three
        tx = await distributionContract.setThreeRollPrice(ethers.parseEther(three));
        addLog('2/3 Transaction sent...', 'info');
        await tx.wait();
        addLog('2/3 Three-roll price updated', 'success');
        
        // Five
        tx = await distributionContract.setFiveRollPrice(ethers.parseEther(five));
        addLog('3/3 Transaction sent...', 'info');
        await tx.wait();
        addLog('3/3 Five-roll price updated', 'success');
        
        addLog('All prices updated successfully!', 'success');
        
        document.getElementById('bulkSinglePrice').value = '';
        document.getElementById('bulkThreePrice').value = '';
        document.getElementById('bulkFivePrice').value = '';
        
        await loadCurrentPrices();
        
    } catch (error) {
        console.error('Error updating prices:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Emergency Withdraw NFT
async function emergencyWithdrawNFT() {
    try {
        const tokenId = document.getElementById('emergencyTokenId').value;
        if (!tokenId) {
            addLog('Please enter a token ID', 'error');
            return;
        }
        
        if (!confirm(`Emergency withdraw token ${tokenId}?`)) return;
        
        addLog(`Emergency withdrawing token ${tokenId}...`, 'info');
        
        const tx = await distributionContract.emergencyWithdrawNFT(parseInt(tokenId));
        addLog('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        addLog(`Token ${tokenId} withdrawn successfully`, 'success');
        document.getElementById('emergencyTokenId').value = '';
        
    } catch (error) {
        console.error('Emergency withdraw error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Emergency Withdraw House
async function emergencyWithdrawHouse() {
    try {
        const house = document.getElementById('emergencyHouse').value;
        if (!house) {
            addLog('Please select a house', 'error');
            return;
        }
        
        if (!confirm(`Emergency withdraw all NFTs from ${house}?`)) return;
        
        addLog(`Emergency withdrawing ${house}...`, 'info');
        
        const tx = await distributionContract.emergencyWithdrawHouse(house);
        addLog('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        addLog(`${house} withdrawn successfully`, 'success');
        await loadInventory();
        
    } catch (error) {
        console.error('Emergency withdraw error:', error);
        addLog(`Error: ${error.message}`, 'error');
    }
}

// Activity Log
function addLog(message, type = 'info') {
    const log = document.getElementById('activityLog');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    
    log.insertBefore(entry, log.firstChild);
    
    // Keep only last 50 entries
    while (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
}

// Account change listener
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else {
            location.reload();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}

console.log('✅ Winions Admin Panel Script Loaded');
console.log('📋 Make sure token-mapping.js, config.js, and contract-abi.js are loaded first!');
