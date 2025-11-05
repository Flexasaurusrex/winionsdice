// Configuration for Winions Dice Roller
// Updated with deployed contract addresses

const CONFIG = {
    // Distribution Contract address (deployed Nov 5, 2025)
    DISTRIBUTION_CONTRACT: '0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7',
    
    // Original Winions NFT Contract
    WINIONS_NFT_CONTRACT: '0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733',
    
    // Network
    CHAIN_ID: 1, // Ethereum Mainnet
    NETWORK_NAME: 'Ethereum Mainnet',
    
    // Roll Prices (in ETH)
    PRICES: {
        SINGLE_ROLL: '0.0111',
        THREE_ROLL: '0.03',
        FIVE_ROLL: '0.045'
    },
    
    // House ranges for roll mapping
    HOUSE_RANGES: {
        'House of Havoc': { min: 66, max: 175 },
        'House of Misfits': { min: 176, max: 230 },
        'House of Frog': { min: 231, max: 263 },
        'House of Theory': { min: 264, max: 290 },
        'House of Spectrum': { min: 291, max: 312 },
        'House of Clay': { min: 313, max: 329 },
        'House of Stencil': { min: 330, max: 345 },
        'House of Royal': { min: 346, max: 356 },
        'House of Shadows': { min: 357, max: 367 },
        'House of Hellish': { min: 368, max: 378 },
        'House of Hologram': { min: 379, max: 389 },
        'House of Gold': { min: 390, max: 394 },
        'House of Death': { min: 395, max: 396 }
    },
    
    // Development mode - SET TO FALSE FOR PRODUCTION
    DEVELOPMENT_MODE: false,
    
    // If true, skips NFT verification (NEVER SET TRUE IN PRODUCTION!)
    SKIP_VERIFICATION: false,
    
    // URLs
    MINT_URL: 'https://www.transient.xyz/mint/winions-public',
    MAIN_SITE_URL: 'https://winions.xyz',
    ETHERSCAN_URL: 'https://etherscan.io'
};

// Helper function to get house from roll total
function getHouseFromRoll(rollTotal) {
    for (const [houseName, range] of Object.entries(CONFIG.HOUSE_RANGES)) {
        if (rollTotal >= range.min && rollTotal <= range.max) {
            return houseName;
        }
    }
    return null;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getHouseFromRoll };
}
