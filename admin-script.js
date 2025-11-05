// Winions Admin Panel Script
// Contract: 0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7

let provider;
let signer;
let adminAddress;
let distributionContract;
let winionsNFTContract;

const WINIONS_NFT_ADDRESS = "0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733";
const WINIONS_NFT_ABI = [
    "function transferFrom(address from, address to, uint256 tokenId) external",
    "function safeTransferFrom(address from, address to, uint256 tokenId) external",
    "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) external",
    "function approve(address to, uint256 tokenId) external",
    "function setApprovalForAll(address operator, bool approved) external",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function isApprovedForAll(address owner, address operator) external view returns (bool)"
];

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
            CONTRACT_ABI,
            signer
        );
        
        winionsNFTContract = new ethers.Contract(
            WINIONS_NFT_ADDRESS,
            WINIONS_NFT_ABI,
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

// House metadata - maps token IDs to houses
const HOUSE_METADATA = {
    "House of Havoc": [14, 19, 21, 23, 30, 33, 34, 41, 44, 45, 46, 51, 57, 59, 60, 63, 68, 71, 74, 79, 83, 84, 88, 101, 102, 106, 107, 110, 115, 118, 125, 126, 127, 132, 133, 135, 140, 142, 146, 152, 153, 154, 156, 158, 160, 163, 166, 168, 170, 171, 177, 178, 179, 181, 186, 187, 189, 191, 192, 193, 197, 203, 204, 206, 207, 210, 211, 214, 215, 218, 220, 225, 234, 237, 238, 243, 244, 246, 249, 255, 256, 259, 264, 270, 274, 275, 277, 280, 287, 289, 292, 295, 297, 298, 303, 306, 308, 314, 315, 321, 323, 324, 327, 331, 332, 337, 338, 346, 347, 348, 351, 354, 356, 358, 360, 365, 369, 370, 373, 374, 375, 378, 380, 382, 383, 387, 389, 390, 394, 395, 399, 403, 410, 413, 415, 419, 422, 424, 428, 431, 433, 434, 440, 447, 450, 453, 463, 466, 473, 475, 477, 479, 485, 486, 487, 494, 496, 502, 503, 507, 508, 509, 511, 519, 522, 525, 528, 533, 535, 537, 540, 542, 544, 548, 550, 554, 557, 560, 561, 566, 568, 571, 573, 574, 576, 577, 578, 580, 584, 588, 590, 591, 592, 594, 601, 602, 606, 607, 611, 613, 614, 615, 619, 621, 622, 623, 624, 628, 632, 633, 636, 640, 642, 644, 647, 651, 652, 653, 655, 656, 661, 663],
    "House of Misfits": [2, 8, 16, 22, 29, 32, 36, 43, 48, 54, 56, 62, 72, 76, 77, 82, 87, 90, 94, 104, 109, 117, 120, 130, 137, 143, 151, 155, 161, 174, 183, 190, 196, 209, 212, 216, 222, 228, 233, 235, 240, 248, 253, 260, 266, 272, 281, 290, 296, 301, 307, 317, 322, 325, 334, 343, 349, 353, 357, 363, 368, 371, 376, 381, 385, 393, 398, 408, 414, 420, 425, 432, 436, 439, 441, 449, 451, 456, 469, 478, 484, 489, 497, 501, 504, 513, 518, 523, 532, 534, 538, 546, 553, 558, 562, 564, 567, 572, 579, 581, 583, 585, 589, 597, 603, 608, 626, 635, 649, 660, 665],
    "House of Frog": [6, 9, 15, 20, 28, 35, 40, 42, 53, 61, 75, 80, 85, 103, 111, 116, 138, 149, 159, 175, 188, 198, 205, 208, 221, 239, 242, 258, 262, 271, 283, 294, 313, 319, 336, 339, 350, 355, 366, 372, 384, 392, 400, 409, 421, 435, 438, 448, 461, 468, 472, 492, 499, 505, 526, 536, 543, 556, 570, 587, 600, 609, 616, 625, 645, 654],
    "House of Theory": [17, 26, 50, 64, 81, 86, 131, 139, 141, 150, 157, 162, 180, 185, 200, 247, 261, 279, 286, 293, 312, 316, 333, 345, 359, 402, 405, 426, 430, 442, 462, 465, 476, 490, 520, 545, 547, 552, 599, 618, 620, 638, 646, 662],
    "House of Spectrum": [3, 24, 52, 73, 95, 113, 114, 122, 145, 173, 182, 201, 202, 226, 229, 241, 251, 252, 265, 285, 299, 320, 335, 352, 364, 386, 407, 411, 437, 444, 454, 474, 480, 506, 510, 514, 531, 563, 586, 598, 604, 631, 637, 664],
    "House of Clay": [27, 78, 98, 119, 124, 147, 165, 172, 231, 245, 254, 257, 284, 300, 309, 310, 318, 328, 342, 367, 401, 406, 412, 429, 443, 471, 491, 493, 495, 500, 596, 605, 627],
    "House of Stencil": [1, 7, 31, 67, 92, 96, 108, 121, 144, 195, 227, 230, 250, 269, 304, 326, 379, 396, 404, 423, 445, 458, 483, 517, 521, 541, 549, 565, 582, 595, 612, 639, 650],
    "House of Royal": [10, 37, 55, 69, 89, 105, 129, 164, 176, 199, 276, 278, 340, 377, 417, 459, 467, 512, 527, 593, 641, 659],
    "House of Shadows": [5, 39, 49, 70, 97, 123, 136, 148, 194, 213, 219, 224, 267, 268, 282, 291, 305, 329, 361, 391, 416, 452, 457, 460, 470, 498, 524, 529, 551, 569, 610, 643, 657],
    "House of Hellish": [11, 12, 65, 91, 99, 167, 169, 236, 263, 311, 341, 397, 427, 446, 455, 482, 515, 539, 555, 617, 629, 648],
    "House of Hologram": [4, 13, 25, 38, 58, 93, 112, 134, 217, 232, 288, 302, 330, 362, 388, 464, 488, 530, 559, 575, 630, 658],
    "House of Gold": [18, 47, 66, 184, 273, 344, 418, 481, 516, 634, 666],
    "House of Death": [100, 128, 223]
};

// Create reverse lookup: tokenId -> house
const TOKEN_TO_HOUSE = {};
for (const [house, tokens] of Object.entries(HOUSE_METADATA)) {
    for (const token of tokens) {
        TOKEN_TO_HOUSE[token] = house;
    }
}

// Check User's NFT Ownership
async function checkMyNFTs() {
    try {
        log('Checking your NFT ownership...', 'info');
        
        document.getElementById('nftOwnershipResults').style.display = 'block';
        document.getElementById('nftList').innerHTML = '<p style="color: #00ff00;">Scanning blockchain...</p>';
        
        const balance = await winionsNFTContract.balanceOf(adminAddress);
        const balanceNum = Number(balance);
        
        if (balanceNum === 0) {
            document.getElementById('nftList').innerHTML = '<p style="color: #ff4444;">You don\'t own any Winions NFTs with this wallet.</p>';
            return;
        }
        
        log(`Found ${balanceNum} Winions in your wallet`, 'success');
        
        // Get all token IDs owned by checking all possible tokens
        const ownedTokens = [];
        
        // Check tokens 1-666 (this might take a moment)
        document.getElementById('nftList').innerHTML = '<p style="color: #00ff00;">Checking tokens 1-666... This may take a minute...</p>';
        
        for (let tokenId = 1; tokenId <= 666; tokenId++) {
            try {
                const owner = await winionsNFTContract.ownerOf(tokenId);
                if (owner.toLowerCase() === adminAddress.toLowerCase()) {
                    ownedTokens.push(tokenId);
                }
            } catch (error) {
                // Token doesn't exist or error, skip
            }
            
            // Update progress every 50 tokens
            if (tokenId % 50 === 0) {
                document.getElementById('nftList').innerHTML = `<p style="color: #00ff00;">Checking tokens... ${tokenId}/666</p>`;
            }
        }
        
        // Sort tokens
        ownedTokens.sort((a, b) => a - b);
        
        // Group by house
        const byHouse = {};
        for (const tokenId of ownedTokens) {
            const house = TOKEN_TO_HOUSE[tokenId] || 'Unknown House';
            if (!byHouse[house]) {
                byHouse[house] = [];
            }
            byHouse[house].push(tokenId);
        }
        
        // Display results
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="border-bottom: 2px solid #ff1a1a;">';
        html += '<th style="text-align: left; padding: 10px; color: #ff1a1a;">Token ID</th>';
        html += '<th style="text-align: left; padding: 10px; color: #ff1a1a;">House</th>';
        html += '</tr></thead><tbody>';
        
        for (const tokenId of ownedTokens) {
            const house = TOKEN_TO_HOUSE[tokenId] || 'Unknown';
            html += `<tr style="border-bottom: 1px solid #333;">`;
            html += `<td style="padding: 10px; color: #00ff00; font-weight: bold;">#${tokenId}</td>`;
            html += `<td style="padding: 10px; color: #fff;">${house}</td>`;
            html += `</tr>`;
        }
        
        html += '</tbody></table>';
        
        document.getElementById('nftList').innerHTML = html;
        
        // Summary
        let summary = `<h3 style="color: #00ff00; margin-bottom: 15px;">Total: ${ownedTokens.length} NFTs</h3>`;
        summary += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">`;
        
        for (const [house, tokens] of Object.entries(byHouse).sort((a, b) => b[1].length - a[1].length)) {
            summary += `<div style="background: rgba(255, 26, 26, 0.1); border: 2px solid #ff1a1a; padding: 15px; border-radius: 5px;">`;
            summary += `<strong style="color: #ff1a1a;">${house}</strong><br>`;
            summary += `<span style="color: #00ff00; font-size: 24px; font-weight: bold;">${tokens.length}</span> NFTs<br>`;
            summary += `<small style="color: #999;">IDs: ${tokens.join(', ')}</small>`;
            summary += `</div>`;
        }
        
        summary += `</div>`;
        
        summary += `<div style="margin-top: 20px; padding: 15px; background: rgba(0, 255, 0, 0.1); border: 2px solid #00ff00; border-radius: 5px;">`;
        summary += `<strong style="color: #00ff00;">Copy for Batch Transfer:</strong><br>`;
        summary += `<input type="text" value="${ownedTokens.join(', ')}" readonly style="width: 100%; margin-top: 10px; padding: 10px; background: #1a1a1a; border: 1px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace;" onclick="this.select()">`;
        summary += `</div>`;
        
        document.getElementById('nftSummary').innerHTML = summary;
        
        log(`✅ Found ${ownedTokens.length} Winions owned by your wallet`, 'success');
        
    } catch (error) {
        console.error('Check NFTs error:', error);
        log(`❌ Error: ${error.message}`, 'error');
        document.getElementById('nftList').innerHTML = `<p style="color: #ff4444;">Error: ${error.message}</p>`;
    }
}

// Check NFT Ownership
async function checkNFTOwnership() {
    try {
        const balance = await winionsNFTContract.balanceOf(adminAddress);
        log(`You own ${balance} Winions NFTs`, 'info');
        return Number(balance);
    } catch (error) {
        console.error('Check ownership error:', error);
        return 0;
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

// Transfer Single NFT to Contract
async function transferSingleNFT() {
    try {
        const tokenId = document.getElementById('singleTransferTokenId').value;
        
        if (!tokenId) {
            alert('Please enter a token ID');
            return;
        }
        
        // Check ownership
        const owner = await winionsNFTContract.ownerOf(tokenId);
        if (owner.toLowerCase() !== adminAddress.toLowerCase()) {
            alert(`You don't own token #${tokenId}. Current owner: ${owner}`);
            return;
        }
        
        log(`Transferring token #${tokenId} to contract...`, 'info');
        
        // Use transferFrom instead of safeTransferFrom
        const tx = await winionsNFTContract.transferFrom(
            adminAddress,
            CONFIG.DISTRIBUTION_CONTRACT,
            tokenId
        );
        
        log('Transaction sent, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        log(`✅ Successfully transferred token #${tokenId} to contract`, 'success');
        
        // Clear input
        document.getElementById('singleTransferTokenId').value = '';
        
        await refreshStatus();
        
    } catch (error) {
        console.error('Transfer error:', error);
        log(`❌ Error: ${error.message}`, 'error');
    }
}

// Batch Transfer NFTs to Contract
async function batchTransferNFTs() {
    try {
        const tokenIdsText = document.getElementById('batchTransferTokenIds').value;
        
        if (!tokenIdsText) {
            alert('Please enter token IDs');
            return;
        }
        
        // Parse token IDs
        const tokenIds = tokenIdsText
            .split(',')
            .map(id => id.trim())
            .filter(id => id)
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id));
        
        if (tokenIds.length === 0) {
            alert('No valid token IDs found');
            return;
        }
        
        if (!confirm(`Transfer ${tokenIds.length} NFTs to the contract? This will execute ${tokenIds.length} transactions.`)) {
            return;
        }
        
        // Show progress
        document.getElementById('transferProgress').style.display = 'block';
        const statusDiv = document.getElementById('transferStatus');
        
        let successful = 0;
        let failed = 0;
        const failedTokens = [];
        
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            
            try {
                statusDiv.innerHTML = `Transferring ${i + 1}/${tokenIds.length}: Token #${tokenId}...`;
                
                // Check ownership FIRST - if this fails, skip immediately
                let owner;
                try {
                    owner = await winionsNFTContract.ownerOf(tokenId);
                } catch (ownerError) {
                    log(`⚠️ Skipping token #${tokenId} - cannot verify ownership`, 'error');
                    failed++;
                    failedTokens.push(tokenId);
                    continue;
                }
                
                if (owner.toLowerCase() !== adminAddress.toLowerCase()) {
                    log(`⚠️ Skipping token #${tokenId} - you don't own it (owner: ${owner.substring(0, 6)}...)`, 'error');
                    failed++;
                    failedTokens.push(tokenId);
                    continue;
                }
                
                // If we got here, we own it - try to transfer
                const tx = await winionsNFTContract.transferFrom(
                    adminAddress,
                    CONFIG.DISTRIBUTION_CONTRACT,
                    tokenId
                );
                
                await tx.wait();
                
                log(`✅ Transferred token #${tokenId}`, 'success');
                successful++;
                
                // Small delay between transactions
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Error transferring token #${tokenId}:`, error);
                log(`❌ Failed to transfer token #${tokenId}: ${error.message}`, 'error');
                failed++;
                failedTokens.push(tokenId);
            }
        }
        
        statusDiv.innerHTML = `
            <strong>Transfer Complete!</strong><br>
            ✅ Successful: ${successful}<br>
            ${failed > 0 ? `❌ Failed: ${failed}<br>` : ''}
            ${failedTokens.length > 0 ? `<br><strong>Failed tokens:</strong> ${failedTokens.join(', ')}` : ''}
        `;
        
        log(`Batch transfer complete: ${successful} successful, ${failed} failed`, successful > 0 ? 'success' : 'error');
        
        // DON'T clear input if there were failures - user can retry
        if (failedTokens.length === 0) {
            document.getElementById('batchTransferTokenIds').value = '';
        }
        
        await refreshStatus();
        
    } catch (error) {
        console.error('Batch transfer error:', error);
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
