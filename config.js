// Winions Distribution Configuration

const CONFIG = {
    // Contract Addresses
    DISTRIBUTION_CONTRACT: "0xb4795Da90B116Ef1BD43217D3EAdD7Ab9A9f7Ba7",
    WINIONS_NFT_CONTRACT: "0x4AD94fb8b87A1aD3F7D52A406c64B56dB3Af0733",
    
    // Network
    CHAIN_ID: 1, // Ethereum Mainnet
    NETWORK_NAME: "Ethereum Mainnet",
    
    // House Mapping (roll total to house name)
    HOUSE_RANGES: {
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
    }
};

// Helper function to determine house from roll total
function getHouseFromRoll(rollTotal) {
    for (const [house, [min, max]] of Object.entries(CONFIG.HOUSE_RANGES)) {
        if (rollTotal >= min && rollTotal <= max) {
            return house;
        }
    }
    return null;
}
