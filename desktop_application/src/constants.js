/* Functions for calculating ecosystem services */
const SQUARE_METRE_TO_HECTARE = 10000; // m2/hectare

export function getCarbonSequesteredAnnually(area, carbonRate) {
    return (area / SQUARE_METRE_TO_HECTARE * carbonRate).toFixed(2);
}

export function getAvoidedRunoffAnnually(area, runoffRate) {
    return (area * runoffRate).toFixed(2);
}