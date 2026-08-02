/**
 * MedNexus Central API Configuration
 * Production Railway Backend URL
 */

const API_BASE_URL = "https://mednexus-production.up.railway.app";

if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
}
