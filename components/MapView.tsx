import React, { useEffect, useRef, useContext } from 'react';
import type { Property, Filters } from '../types';
import { applyFilters, formatNominatimAddress, isSpecialTransaction } from '../utils';
import { PRICE_RANGES, BEDROOM_OPTIONS, YEAR_BUILT_RANGES, PRICE_PER_SQM_RANGES, SIZE_RANGES, mockProperties } from '../constants';
import { SettingsContext } from '../contexts/SettingsContext';

// Let TypeScript know that 'L' is a global from the script tag in index.html
declare const L: any;

const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const mainPulsingIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
    className: 'pulsing-main-marker'
});

// A distinct icon for nearby (non-selected) properties
const nearbyIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Define the static home property and location at the module level for clarity.
const INITIAL_HOME_PROPERTY = mockProperties[0];
const INITIAL_HOME_LOCATION = {
  lat: INITIAL_HOME_PROPERTY.latitude!,
  lon: INITIAL_HOME_PROPERTY.longitude!
};


interface MapViewProps {
  property: Property | null;
  properties: Property[];
  filters: Filters;
  onSelectProperty: (property: Property) => void;
  onMapMarkerSelect: (property: Property) => void;
  onLocationSelect: (
    address: string,
    details: { coords: { lat: number; lon: number }; district: string; city?: string }
  ) => void;
  onClose: () => void;
}

// Helper to prevent potential XSS from filter labels, though unlikely with current data.
const escapeHtml = (unsafe: string): string => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export const MapView: React.FC<MapViewProps> = ({ property, properties, filters, onSelectProperty, onMapMarkerSelect, onLocationSelect, onClose }) => {
  const mapRef = useRef<any | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useContext(SettingsContext);
  
  // Refs for DYNAMIC layers and controls to manage their lifecycle
  const mainMarkerRef = useRef<any | null>(null);
  const nearbyMarkersRef = useRef<any | null>(null);
  const filterControlRef = useRef<any | null>(null);

  // Create refs for callbacks to avoid issues with stale closures in Leaflet event handlers.
  const onSelectPropertyRef = useRef(onSelectProperty);
  useEffect(() => {
    onSelectPropertyRef.current = onSelectProperty;
  }, [onSelectProperty]);

  const onLocationSelectRef = useRef(onLocationSelect);
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);


  // Effect for one-time map initialization and STATIC controls
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([INITIAL_HOME_LOCATION.lat, INITIAL_HOME_LOCATION.lon], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topleft' }).addTo(map);
      
      // Initialize the marker cluster group once and add it to the map
      nearbyMarkersRef.current = L.markerClusterGroup().addTo(map);
      
      // Create and add the STATIC Home/Recenter Control once.
      const RecenterControl = L.Control.extend({
          onAdd: function(mapInstance: any) {
              const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
              container.style.backgroundColor = 'white';
              container.style.width = '34px';
              container.style.height = '34px';
              container.style.display = 'flex';
              container.style.alignItems = 'center';
              container.style.justifyContent = 'center';
              container.style.cursor = 'pointer';
              container.title = tRef.current('mapView_recenterTooltip');
              container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 1.25rem; height: 1.25rem; color: #334155;"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>`;
              
              L.DomEvent.on(container, 'click', (e: MouseEvent) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectPropertyRef.current(INITIAL_HOME_PROPERTY);
              });
              
              L.DomEvent.disableClickPropagation(container);
              return container;
          },
          onRemove: function() {}
      });
      const homeControl = new RecenterControl({ position: 'topleft' });
      map.addControl(homeControl);
      
      // Create and add the STATIC Close Control once.
      const CloseControl = L.Control.extend({
          onAdd: function(mapInstance: any) {
              const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
              container.style.backgroundColor = 'white';
              container.style.width = '34px';
              container.style.height = '34px';
              container.style.display = 'flex';
              container.style.alignItems = 'center';
              container.style.justifyContent = 'center';
              container.style.cursor = 'pointer';
              container.style.marginTop = '10px'; // Add space between controls
              container.title = tRef.current('close');
              container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 1.25rem; height: 1.25rem; color: #334155;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`;
              
              L.DomEvent.on(container, 'click', (e: MouseEvent) => {
                  L.DomEvent.stopPropagation(e);
                  onCloseRef.current();
              });
              
              L.DomEvent.disableClickPropagation(container);
              return container;
          },
          onRemove: function() {}
      });
      const closeControl = new CloseControl({ position: 'topleft' });
      map.addControl(closeControl);
    }
  }, []); // Empty dependency array ensures this runs ONLY ONCE.

  // A single, comprehensive effect to handle all DYNAMIC map updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Invalidate map size to fix rendering issues when the container becomes visible after animation
    setTimeout(() => {
        map.invalidateSize();
    }, 150);

    // --- 1. Cleanup Phase: Remove all DYNAMIC elements from the previous render ---
    if (mainMarkerRef.current) {
      map.removeLayer(mainMarkerRef.current);
      mainMarkerRef.current = null;
    }
    if (nearbyMarkersRef.current) {
      nearbyMarkersRef.current.clearLayers();
    }
    if (filterControlRef.current) {
      map.removeControl(filterControlRef.current);
      filterControlRef.current = null;
    }
    
    // --- 2. Update Phase: Add new elements based on current props ---
    
    // Update map view and main marker for the selected property
    if (property && property.latitude && property.longitude) {
      const { latitude, longitude, address } = property;
      
      const currentCenter = map.getCenter();
      if(Math.abs(currentCenter.lat - latitude) > 0.0001 || Math.abs(currentCenter.lng - longitude) > 0.0001) {
        map.flyTo([latitude, longitude], 15);
      }

      // Create and add Main Marker
      const newMainMarker = L.marker([latitude, longitude], { 
        icon: mainPulsingIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);
      mainMarkerRef.current = newMainMarker;

      newMainMarker.bindTooltip(address, { permanent: false, sticky: true, direction: 'top', offset: L.point(0, -41) });
      
      const mainMarkerSpecialTagHtml = isSpecialTransaction(property) ? `<br><span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: bold;" title="${escapeHtml(property.remarks || '')}">${t('specialTransaction')}</span>` : '';
      const streetViewLinkHtml = `<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}" target="_blank" rel="noopener noreferrer" style="margin-top: 8px; padding: 4px 8px; font-size: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 14px; height: 14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>${t('openStreetView')}</a>`;
      newMainMarker.bindPopup(`<b>${address}</b>${mainMarkerSpecialTagHtml}${streetViewLinkHtml}`).openPopup();

      newMainMarker.on('dragend', async (event: any) => {
        const marker = event.target;
        const position = marker.getLatLng();

        const loadingProperty: Property = {
            ...(property || mockProperties[0]),
            id: `loading_drag_${Date.now()}`,
            address: t('mapView_loadingAddress'),
            latitude: position.lat,
            longitude: position.lng,
            district: '...',
            price: 0, 
            yearBuilt: 0, 
            bedrooms: 0, 
            bathrooms: 0, 
            floor: '', 
            type: '華廈',
            imageUrl: `https://picsum.photos/seed/loading${Date.now()}/800/600`,
        };
        onMapMarkerSelect(loadingProperty);
        marker.setTooltipContent(t('mapView_queryingAddress')).openTooltip();

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.lat}&lon=${position.lng}&accept-language=zh-TW`);
          if (!response.ok) throw new Error('Reverse geocoding failed');
          const data = await response.json();
          
          let fetchedAddress = formatNominatimAddress(data);
          if (!fetchedAddress) {
              fetchedAddress = `Lat: ${position.lat.toFixed(5)}, Lon: ${position.lng.toFixed(5)}`;
          }
          
          const fetchedCity = data.address?.city || data.address?.county;
          const fetchedDistrict = data.address?.suburb || data.address?.city_district || t('mapView_customLocation');
          
          onLocationSelectRef.current(
            fetchedAddress,
            {
              coords: { lat: position.lat, lon: position.lng },
              district: fetchedDistrict,
              city: fetchedCity,
            }
          );
          
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          
          const fallbackProperty: Property = {
            ...loadingProperty,
            id: `error_drag_${Date.now()}`,
            address: t('mapView_addressQueryFailed'),
            district: t('mapView_unknownArea'),
          };
          onMapMarkerSelect(fallbackProperty);
          marker.setTooltipContent(t('mapView_addressQueryFailed')).openTooltip();
        }
      });
    }

    const filteredProperties = applyFilters(properties, filters);
    filteredProperties.forEach(otherProperty => {
      if (otherProperty.id !== property?.id && otherProperty.latitude && otherProperty.longitude) {
        const marker = L.marker([otherProperty.latitude, otherProperty.longitude], { icon: nearbyIcon });
        const nearbyMarkerSpecialTagHtml = isSpecialTransaction(otherProperty) ? `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: bold;" title="${escapeHtml(otherProperty.remarks || '')}">${t('specialTransaction')}</span><br>` : '';
        const nearbyStreetViewLinkHtml = `<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${otherProperty.latitude},${otherProperty.longitude}" target="_blank" rel="noopener noreferrer" style="margin-top: 8px; padding: 4px 8px; font-size: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 14px; height: 14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>${t('openStreetView')}</a>`;
        const popupContent = `<div><b>${otherProperty.address}</b><br>${nearbyMarkerSpecialTagHtml}<p style="font-size: 11px; color: #64748b; margin-top: 4px; margin-bottom: 0;">${t('mapView_clickToLoad')}</p></div>${nearbyStreetViewLinkHtml}`;
        marker.bindPopup(popupContent);
        marker.bindTooltip(otherProperty.address, { permanent: false, sticky: true, direction: 'top', offset: L.point(0, -41) });
        marker.on('click', () => onSelectProperty(otherProperty));
        nearbyMarkersRef.current.addLayer(marker);
      }
    });

    const generateFilterSummary = (currentFilters: Filters): string[] => {
        const summary: string[] = [];
        if (currentFilters.type !== 'all' && currentFilters.type) summary.push(t(currentFilters.type as any));
        const priceLabel = PRICE_RANGES.find(r => r.value === currentFilters.price)?.label;
        if (priceLabel && currentFilters.price !== 'all') summary.push(t(`priceRange_${currentFilters.price}`));
        const bedLabel = BEDROOM_OPTIONS.find(o => o.value === currentFilters.bedrooms)?.label;
        if (bedLabel && currentFilters.bedrooms !== 'all') summary.push(t(`bedroomOption_${currentFilters.bedrooms}`));
        const yearLabel = YEAR_BUILT_RANGES.find(r => r.value === currentFilters.yearBuilt)?.label;
        if (yearLabel && currentFilters.yearBuilt !== 'all') summary.push(t(`yearBuiltRange_${currentFilters.yearBuilt}`));
        const ppsqmLabel = PRICE_PER_SQM_RANGES.find(r => r.value === currentFilters.pricePerSqm)?.label;
        if (ppsqmLabel && currentFilters.pricePerSqm !== 'all') summary.push(t(`pricePerSqmRange_${currentFilters.pricePerSqm}`));
        const sizeLabel = SIZE_RANGES.find(r => r.value === currentFilters.size)?.label;
        if (sizeLabel && currentFilters.size !== 'all') summary.push(t(`sizeRange_${currentFilters.size}`));
        return summary;
    };

    const activeFilters = generateFilterSummary(filters);
    if (activeFilters.length > 0) {
      const FilterControl = L.Control.extend({
        onAdd: function() {
          const div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded p-2 bg-white/80 backdrop-blur-sm rounded-md shadow');
          L.DomEvent.disableClickPropagation(div);
          const tagsHtml = activeFilters.map(f => `<span class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">${escapeHtml(f)}</span>`).join(' ');
          div.innerHTML = `<h3 class="text-xs font-bold mb-1 text-gray-600">${t('mapView_currentFilters')}</h3><div class="flex flex-wrap gap-1">${tagsHtml}</div>`;
          return div;
        },
        onRemove: function() {}
      });
      filterControlRef.current = new FilterControl({ position: 'topright' });
      map.addControl(filterControlRef.current);
    }
  }, [property, properties, filters, onMapMarkerSelect, t]);

  return (
    <>
      <div 
        ref={mapContainerRef} 
        id="map" 
        className="h-full w-full"
      ></div>
      <style>{`
        .pulsing-main-marker {
          animation: pulse 1.5s infinite;
          border-radius: 50%;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(29, 78, 216, 0.7);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(29, 78, 216, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(29, 78, 216, 0);
          }
        }
        .leaflet-control-zoom {
          border: 2px solid black !important;
          border-radius: 12px !important;
        }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          background-color: white !important;
          color: black !important;
        }
         .leaflet-control-zoom-in {
          border-top-left-radius: 10px !important;
          border-top-right-radius: 10px !important;
        }
        .leaflet-control-zoom-out {
          border-bottom-left-radius: 10px !important;
          border-bottom-right-radius: 10px !important;
        }
        .leaflet-bar a, .leaflet-bar a:hover {
          border-bottom: 1px solid #ccc !important;
        }
         .leaflet-bar a:last-child {
          border-bottom: none !important;
        }
        .leaflet-control-custom {
            border: 2px solid black !important;
            border-radius: 12px !important;
        }
      `}</style>
    </>
  );
};