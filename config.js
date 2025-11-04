// Configuration for Winions Dice Roller

const CONFIG = {
    // Contract address
    CONTRACT_ADDRESS: '0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733',
    
    // Network
    CHAIN_ID: 1, // Ethereum Mainnet
    
    // Development mode - SET TO FALSE BEFORE DEPLOYING TO PRODUCTION!
    DEVELOPMENT_MODE: false,
    
    // If true, skips NFT verification (for testing only)
    SKIP_VERIFICATION: false,
    
    // Mint URL
    MINT_URL: 'https://www.transient.xyz/mint/winions-public',
    
    // Main site URL
    MAIN_SITE_URL: 'https://winions.xyz'
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
