

import type { Property, Language } from '../types';
import { MOCK_REAL_ESTATE_DATA, translateMockData } from './mockRealEstateData';

const IMPORTED_DATA_KEY = 'imported_real_estate_data';

/**
 * Fetches transactions from both the built-in static mock data
 * and any user-imported data from localStorage.
 */
export function getLocalTransactions(city: string, district: string, language: Language): Property[] {
    // 1. Get Built-in Data
    const allData: Record<string, Property[]> = MOCK_REAL_ESTATE_DATA;
    
    // Normalize keys (remove suffixes for matching)
    const formattedCity = city.replace(/[市縣]$/, '');
    const formattedDistrict = district.replace(/[區鄉鎮市]$/, '');
    const key = `${formattedCity}-${formattedDistrict}` as keyof typeof allData;
    
    const builtInData = allData[key] ? [...allData[key]] : [];
    const translatedBuiltInData = translateMockData(builtInData, language);

    // 2. Get Imported Data from LocalStorage
    let importedData: Property[] = [];
    try {
        const storedData = localStorage.getItem(IMPORTED_DATA_KEY);
        if (storedData) {
            const parsedData: Property[] = JSON.parse(storedData);
            // Filter imported data to match the requested city/district
            importedData = parsedData.filter(p => {
                const pCity = p.city?.replace(/[市縣]$/, '') || '';
                const pDistrict = p.district?.replace(/[區鄉鎮市]$/, '') || '';
                return pCity.includes(formattedCity) && pDistrict.includes(formattedDistrict);
            });
        }
    } catch (e) {
        console.error("Failed to load imported data:", e);
    }

    // 3. Merge: Imported data comes first (usually newer)
    return [...importedData, ...translatedBuiltInData.map(prop => ({ ...prop, city }))];
}

/**
 * Saves imported properties to localStorage, appending to existing ones.
 */
// Fix: Changed invalid type 'int' to 'number'.
export function saveImportedTransactions(newProperties: Property[]): number {
    try {
        const storedData = localStorage.getItem(IMPORTED_DATA_KEY);
        let currentData: Property[] = storedData ? JSON.parse(storedData) : [];
        
        // Simple de-duplication based on address and price (not perfect but helpful)
        const existingIds = new Set(currentData.map(p => p.id));
        
        let addedCount = 0;
        newProperties.forEach(p => {
            // Generate a pseudo-ID if not present or collision
            if (!p.id || existingIds.has(p.id)) {
                p.id = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            currentData.unshift(p); // Add new data to the top
            addedCount++;
        });

        // Limit storage size roughly (e.g., keep last 2000 imported records to prevent quota exceeded)
        if (currentData.length > 2000) {
            currentData = currentData.slice(0, 2000);
        }

        localStorage.setItem(IMPORTED_DATA_KEY, JSON.stringify(currentData));
        return addedCount;
    } catch (e) {
        console.error("Failed to save imported data:", e);
        throw new Error("儲存失敗，可能是瀏覽器儲存空間不足。");
    }
}

/**
 * Clears all imported data.
 */
export function clearImportedTransactions() {
    localStorage.removeItem(IMPORTED_DATA_KEY);
}