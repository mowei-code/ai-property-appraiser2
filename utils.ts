
import type { Property, Filters, Language } from './types';

// Let TypeScript know that html2canvas is a global from the script tag in index.html
declare const html2canvas: any;

export const applyFilters = (properties: Property[], filters: Filters): Property[] => {
  return properties.filter(property => {
    // Filter by type
    if (filters.type !== 'all' && property.type !== filters.type) {
      return false;
    }
    
    // Filter by price
    if (filters.price !== 'all') {
      const priceInWan = property.price / 10000;
      if (filters.price === '0-1500' && priceInWan > 1500) return false;
      if (filters.price === '1500-3000' && (priceInWan < 1500 || priceInWan > 3000)) return false;
      if (filters.price === '3000-5000' && (priceInWan < 3000 || priceInWan > 5000)) return false;
      if (filters.price === '5000+' && priceInWan < 5000) return false;
    }

    // Filter by bedrooms
    if (filters.bedrooms !== 'all' && property.bedrooms) {
      if (filters.bedrooms === '5+' && property.bedrooms < 5) return false;
      if (filters.bedrooms !== '5+' && !isNaN(parseInt(filters.bedrooms, 10)) && property.bedrooms !== parseInt(filters.bedrooms, 10)) return false;
    }

    // Filter by year built
    if (filters.yearBuilt !== 'all' && property.yearBuilt) {
      const propertyAge = new Date().getFullYear() - property.yearBuilt;
      if (filters.yearBuilt === '0-5' && propertyAge > 5) return false;
      if (filters.yearBuilt === '5-10' && (propertyAge <= 5 || propertyAge > 10)) return false;
      if (filters.yearBuilt === '10-20' && (propertyAge <= 10 || propertyAge > 20)) return false;
      if (filters.yearBuilt === '20+' && propertyAge <= 20) return false;
    }
    
    // Filter by price per square meter
    if (filters.pricePerSqm !== 'all' && property.size) {
      const pricePerSqm = property.price / property.size;
      if (filters.pricePerSqm === '0-200000' && pricePerSqm > 200000) return false;
      if (filters.pricePerSqm === '200000-300000' && (pricePerSqm <= 200000 || pricePerSqm > 300000)) return false;
      if (filters.pricePerSqm === '300000-400000' && (pricePerSqm <= 300000 || pricePerSqm > 400000)) return false;
      if (filters.pricePerSqm === '400000+' && pricePerSqm <= 400000) return false;
    }

    // Filter by size in ping
    if (filters.size !== 'all' && property.size) {
      const sizeInPing = property.size / 3.30579;
      if (filters.size === '0-30' && sizeInPing > 30) return false;
      if (filters.size === '30-60' && (sizeInPing <= 30 || sizeInPing > 60)) return false;
      if (filters.size === '60+' && sizeInPing <= 60) return false;
    }
    
    return true;
  });
};

export const sanitizeAddressForGeocoding = (address: string): string => {
  // This regex attempts to find the core address part, up to the house number (including formats like 79之1號),
  // and strips away anything that follows, which is often floor/unit information that confuses geocoders.
  const match = address.match(/(.*?\d+(?:[之-]\d+)?號)/);
  if (match && match[1]) {
      return match[1];
  }
  // If no match (e.g., address ends in a lane/alley without a house number), return the original address.
  // This is a safe fallback that also handles addresses without numbers.
  return address;
};

export const parseTaiwanAddress = (address: string): { city: string | null, district: string | null, floor: string | null } => {
    let city = null;
    let district = null;
    let floor = null;

    // Regex for Taiwan Administrative Regions
    const cityRegex = /(?:台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)/;
    
    const cityMatch = address.match(cityRegex);
    if (cityMatch) {
        city = cityMatch[0];
        // Search for district AFTER the city string to avoid confusion
        const rest = address.substring(cityMatch.index! + city.length);
        const districtMatch = rest.match(/^.+?[區鄉鎮市]/);
        if (districtMatch) district = districtMatch[0];
    } else {
        // Fallback: try finding district directly
        const districtMatch = address.match(/.+?[區鄉鎮市]/);
        if (districtMatch) district = districtMatch[0];
    }

    // Floor regex: matches "十樓", "10樓", "10F", "B1"
    // Prioritize Chinese numerals mixed with '樓' or digits with 'F'/'樓'
    const floorRegex = /([0-9]+|[一二三四五六七八九十百]+)樓|[0-9]+F|B[0-9]+/;
    const fMatch = address.match(floorRegex);
    if (fMatch) floor = fMatch[0];

    return { city, district, floor };
};

export const parseAddress = (address: string): { city: string | null, district: string | null } => {
    const parsed = parseTaiwanAddress(address);
    return { city: parsed.city, district: parsed.district };
};

export const formatNominatimAddress = (data: any): string => {
    // Prioritize using the structured 'address' object for correct ordering
    if (data?.address) {
        const addr = data.address;
        const city = addr.city || addr.county || '';
        const district = addr.suburb || addr.city_district || '';
        const road = addr.road || '';
        
        let houseNumber = addr.house_number ? String(addr.house_number).trim() : '';
        if (houseNumber && !houseNumber.endsWith('號')) {
            houseNumber += '號';
        }

        const address = [city, district, road, houseNumber].filter(Boolean).join('');
        // If we successfully built a reasonable address, return it.
        if (address.length > 5) {
            return address;
        }
    }
    
    // Fallback to cleaning up and reversing the 'display_name' if structured approach fails.
    // Reversing is necessary because display_name is often ordered from smallest unit to largest.
    if (data?.display_name) {
        const addressParts = data.display_name.split(', ');
        const relevantParts = addressParts
            .filter((part: string) => 
                !part.match(/^\d{3,5}$/) && // filter out postal code
                part.toLowerCase() !== 'taiwan' && part !== '台灣' // filter out country
            )
            .reverse(); // Reverse to get City -> District -> Road order
        return relevantParts.join('');
    }

    return ''; // Return empty if nothing can be parsed.
};

export const isSpecialTransaction = (property: Property): boolean => {
  const remarksText = property.remarks ? property.remarks.trim() : '';
  if (!remarksText) {
    return false;
  }
  // This regex checks if the remarks *only* contain the standard boilerplate source text.
  // If it contains more than that (e.g.,親友間交易), it's considered a special transaction.
  const isBoilerplateOnly = /^資料來源\s*[:：]\s*內政部實價登錄$/.test(remarksText);
  return !isBoilerplateOnly;
};

export const formatDisplayPrice = (
  price: number,
  t: (key: string, replacements?: Record<string, string>) => string,
  language: Language
): string => {
  const YI = 100000000;
  const WAN = 10000;

  if (language === 'en') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TWD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(price);
  }

  if (price >= YI) {
    const unit = language === 'ja' ? t('unitOku') : t('unitYi');
    return `${(price / YI).toFixed(2)} ${unit}`;
  }
  
  const unit = language === 'ja' ? t('unitMan') : t('unitWan');
  return `${(price / WAN).toLocaleString(language.replace('_', '-'), { maximumFractionDigits: 0 })} ${unit}`;
};

export const formatUnitPrice = (
  pricePerPingInWan: number, // Value is in "萬 TWD / Ping"
  t: (key: string, replacements?: Record<string, string>) => string,
  language: Language
): string => {
  if (pricePerPingInWan <= 0 || isNaN(pricePerPingInWan)) {
      return t('notApplicable');
  }
  if (language === 'en') {
    const pricePerPingTWD = pricePerPingInWan * 10000;
    return `${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TWD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(pricePerPingTWD)}/ping`;
  }
  
  const unit = t('unitPricePerPingUnit'); // e.g., "萬/坪", "万/坪", "万円/坪"
  return `${pricePerPingInWan.toFixed(1)} ${unit}`;
};

export const handlePrint = async (elementId: string, pageTitle: string) => {
    const printElement = document.getElementById(elementId);
    if (!printElement) {
        console.error(`Print Error: Element with id "${elementId}" not found.`);
        return;
    }

    // Temporarily add a class to the body to disable scrollbars during capture.
    document.body.classList.add('html2canvas-capturing');

    try {
        const canvas = await html2canvas(printElement, {
            scale: 2, // Improve resolution for printing
            useCORS: true, // Allow loading cross-origin images (like from picsum.photos)
            onclone: (clonedDoc: Document) => {
                // This function runs on the cloned document right before capture.
                // We use it to ensure any elements meant to be hidden from print are removed.
                clonedDoc.querySelectorAll('.no-print').forEach(el => el.remove());
                // Also ensures print-only titles are visible for capture.
                clonedDoc.querySelectorAll('.print-title, .print-subtitle').forEach(el => {
                    (el as HTMLElement).style.display = 'block';
                });
            }
        });
        
        // Remove the helper class from the body after capture is complete.
        document.body.classList.remove('html2canvas-capturing');

        const imageDataUrl = canvas.toDataURL('image/png');

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('請允許此網站的彈出式視窗以進行列印。');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${pageTitle}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                    }
                </style>
            </head>
            <body>
                <img src="${imageDataUrl}" alt="Print Content" />
            </body>
            </html>
        `);

        printWindow.document.close();
        
        // Wait for the image to fully load in the new window before triggering the print dialog.
        const img = printWindow.document.querySelector('img');
        if (img) {
            img.onload = () => {
                printWindow.focus(); // Focus the new window
                printWindow.print(); // Open the print dialog
                // A short delay before closing to ensure the print command is processed.
                setTimeout(() => {
                    if (!printWindow.closed) {
                        printWindow.close();
                    }
                }, 500);
            };
        }

    } catch (error) {
        console.error('Error generating canvas for printing:', error);
        // Ensure the helper class is removed even if an error occurs.
        document.body.classList.remove('html2canvas-capturing');
    }
};


export const generateRandomPropertyDetails = (): Partial<Property> => {
  return {
    price: 0,
  };
};

/**
 * Parses a CSV string from MOI (Ministry of Interior) into Property objects.
 */
export const parseMOICSV = (csvText: string): Property[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    // Helper to find column index by name (handling potential variations or BOM)
    const headers = lines[0].split(',').map(h => h.trim());
    const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const idxDistrict = getIdx(['鄉鎮市區']);
    const idxAddress = getIdx(['土地區段位置', '建物區段門牌', '土地位置']);
    const idxPrice = getIdx(['總價元']);
    const idxDate = getIdx(['交易年月日']);
    const idxArea = getIdx(['建物移轉總面積', '建物面積']);
    const idxType = getIdx(['建物型態']);
    const idxFloor = getIdx(['移轉層次']);
    const idxTotalFloor = getIdx(['總樓層數']);
    const idxBuiltDate = getIdx(['建築完成年月']);
    
    // If critical columns missing, try assuming simple format: address, price, date
    if (idxAddress === -1 || idxPrice === -1) return [];

    const results: Property[] = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < headers.length) continue;

        try {
            const district = row[idxDistrict]?.trim();
            const address = row[idxAddress]?.trim();
            const priceStr = row[idxPrice]?.trim();
            const dateStr = row[idxDate]?.trim();
            const areaStr = idxArea > -1 ? row[idxArea]?.trim() : '0';
            const typeStr = idxType > -1 ? row[idxType]?.trim() : '';
            const floorStr = idxFloor > -1 ? row[idxFloor]?.trim() : '';
            const totalFloorStr = idxTotalFloor > -1 ? row[idxTotalFloor]?.trim() : '';
            const builtDateStr = idxBuiltDate > -1 ? row[idxBuiltDate]?.trim() : '';

            if (!address || !priceStr) continue;

            // Convert ROC Date (e.g. 1120325) to AD Date (2023-03-25)
            let transactionDate = dateStr;
            if (dateStr && dateStr.length >= 6) {
                const yearROC = parseInt(dateStr.slice(0, dateStr.length - 4));
                const month = dateStr.slice(-4, -2);
                const day = dateStr.slice(-2);
                if (!isNaN(yearROC)) {
                    transactionDate = `${yearROC + 1911}-${month}-${day}`;
                }
            }

            // Parse Built Year
            let yearBuilt = 0;
            if (builtDateStr && builtDateStr.length >= 6) {
                 const yearROC = parseInt(builtDateStr.slice(0, builtDateStr.length - 4));
                 if (!isNaN(yearROC)) yearBuilt = yearROC + 1911;
            }

            const price = parseInt(priceStr) || 0;
            const size = parseFloat(areaStr) || 0;

            // Normalize Type
            let type: '公寓' | '電梯大樓' | '透天厝' | '華廈' | undefined = '華廈'; // Default
            if (typeStr.includes('公寓')) type = '公寓';
            else if (typeStr.includes('大樓')) type = '電梯大樓';
            else if (typeStr.includes('透天')) type = '透天厝';
            else if (typeStr.includes('華廈')) type = '華廈';

            // Normalize Address (add city if missing, although MOI CSV usually has district)
            // We assume the user imports for a specific context, but here we just store raw.
            
            results.push({
                id: `import_${Date.now()}_${i}`,
                address: address,
                district: district || '未知區域',
                city: '', // City is often implied by the file downloaded
                price: price,
                size: size, // sqm
                type: type,
                yearBuilt: yearBuilt,
                floor: floorStr ? `${floorStr} / ${totalFloorStr}` : '',
                transactionDate: transactionDate,
                imageUrl: `https://picsum.photos/seed/${address.length}/800/600`, // Placeholder
                remarks: '手動匯入資料'
            });

        } catch (e) {
            console.warn("Skipping invalid CSV row:", i, e);
        }
    }
    return results;
};
