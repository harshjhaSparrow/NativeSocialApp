export const calculateDistance = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
): string => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = fromLat * Math.PI / 180;
    const φ2 = toLat * Math.PI / 180;
    const Δφ = (toLat - fromLat) * Math.PI / 180;
    const Δλ = (toLng - fromLng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in meters

    if (d < 1000) {
        return "< 1 km";
    }
    const km = d / 1000;
    // Use one decimal place if between 1 and 10 km
    if (km < 10) {
        return `${km.toFixed(1)} km`;
    }
    return `${Math.round(km)} km`;
};
