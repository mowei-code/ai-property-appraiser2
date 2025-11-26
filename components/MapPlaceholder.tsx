
import React from 'react';
import type { Property } from '../types';

interface MapPlaceholderProps {
  property: Property | null;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ property }) => {
  const imageUrl = property ? `https://picsum.photos/seed/${property.id}/800/600` : 'https://picsum.photos/seed/map/800/600';
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-4">
      <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden relative">
        <img 
          src={imageUrl} 
          alt="Map placeholder" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            {property && (
              <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg text-center shadow-lg max-w-xs">
                <p className="font-bold text-sm text-slate-800">{property.address}</p>
                <p className="text-xs text-slate-600">{property.district}</p>
              </div>
            )}
        </div>
        <div className="absolute top-2 left-2 bg-white/80 text-slate-700 text-xs px-2 py-1 rounded-full">
            地圖預覽
        </div>
      </div>
    </div>
  );
};
