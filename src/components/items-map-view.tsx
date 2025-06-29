'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, InfoWindowF } from '@react-google-maps/api';
import { getItemsFromFirestore } from '@/services/itemService';
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { getDistance } from 'geolib';
import { Skeleton } from '@/components/ui/skeleton';
import { MapItemPreviewCard } from './map-item-preview-card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { MapIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { env } from '@/lib/env';


const containerStyle = {
  width: '100%',
  height: '70vh',
  borderRadius: '0.5rem',
};

// Default center: Dakar, Senegal
const defaultCenter = {
  lat: 14.7167,
  lng: -17.4677
};

const libraries: ("places")[] = ["places"];

export function ItemsMapView() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { firebaseUser: currentUser, authLoading } = useAuth();
  
  useEffect(() => {
    // Center map based on location filter if present
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    if (latParam && lngParam) {
        setMapCenter({ lat: parseFloat(latParam), lng: parseFloat(lngParam) });
    }
  }, [searchParamsString]);

  useEffect(() => {
    if (authLoading) return;

    const fetchMapData = async () => {
        setIsLoading(true);

        const categoryParam = searchParams.get('category') as ItemCategory | null;
        const minPriceParam = searchParams.get('minPrice');
        const maxPriceParam = searchParams.get('maxPrice');
        const locationParam = searchParams.get('location');
        const conditionParam = searchParams.get('condition') as ItemCondition | null;
        const latParam = searchParams.get('lat');
        const lngParam = searchParams.get('lng');
        const radiusParam = searchParams.get('radius');

        // For map view, we fetch a larger number of items to populate the area.
        const result = await getItemsFromFirestore({
            query: searchParams.get('q') || undefined,
            category: categoryParam || undefined,
            priceMin: minPriceParam ? parseInt(minPriceParam) : undefined,
            priceMax: maxPriceParam ? parseInt(maxPriceParam) : undefined,
            location: locationParam || undefined,
            condition: conditionParam || undefined,
            pageSize: 200, // Fetch more for map view
        });
        
        let processedItems = result.items;

        // Client-side location filtering
        if (latParam && lngParam) {
            const userLat = parseFloat(latParam);
            const userLng = parseFloat(lngParam);
            const radiusInMeters = (parseInt(radiusParam || '25', 10)) * 1000;

            processedItems = processedItems.filter(item => {
                if (item.latitude == null || item.longitude == null) return false;
                try {
                    const distance = getDistance(
                        { latitude: userLat, longitude: userLng },
                        { latitude: item.latitude, longitude: item.longitude }
                    );
                    return distance <= radiusInMeters;
                } catch (e) {
                    console.error("Error calculating distance", e);
                    return false;
                }
            });
        }
        
        const finalItems = (currentUser ? processedItems.filter(item => item.sellerId !== currentUser.uid) : processedItems)
                           .filter(item => item.latitude != null && item.longitude != null); // Ensure items have location for map

        setItems(finalItems);
        setIsLoading(false);
    };

    fetchMapData().catch(error => {
        console.error("Error fetching items for MapView:", error);
        setItems([]);
        setIsLoading(false);
    });

  }, [authLoading, currentUser, searchParamsString]);


  if (loadError) {
    return (
        <Alert variant="destructive">
            <AlertTitle>Erreur de chargement de la carte</AlertTitle>
            <AlertDescription>
            Impossible de charger Google Maps. Veuillez vérifier votre clé API et votre connexion internet.
            </AlertDescription>
        </Alert>
    );
  }

  if (!isLoaded || isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-[70vh] w-full" />
             <div className='flex justify-center items-center gap-2 p-4 text-muted-foreground'>
                <Loader2 className="h-4 w-4 animate-spin"/>
                <span>Chargement des annonces sur la carte...</span>
            </div>
        </div>
    );
  }
  
  return (
    <div>
        {items.length > 0 ? (
             <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={12}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                }}
             >
                {items.map(item => (
                    item.latitude && item.longitude && (
                        <Marker
                            key={item.id}
                            position={{ lat: item.latitude, lng: item.longitude }}
                            onClick={() => setSelectedItem(item)}
                            title={item.name}
                        />
                    )
                ))}

                {selectedItem && (
                    <InfoWindowF
                        position={{ lat: selectedItem.latitude!, lng: selectedItem.longitude! }}
                        onCloseClick={() => setSelectedItem(null)}
                        options={{ pixelOffset: new window.google.maps.Size(0, -40) }}
                    >
                        <MapItemPreviewCard item={selectedItem} />
                    </InfoWindowF>
                )}
             </GoogleMap>
        ) : (
            <div className="text-center py-10 border rounded-lg shadow-sm bg-card h-[70vh] flex flex-col justify-center items-center">
                <MapIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Aucun article trouvé</h2>
                <p className="text-muted-foreground">Aucun article avec des coordonnées n'a été trouvé pour ces filtres.</p>
            </div>
        )}
    </div>
  );
}
