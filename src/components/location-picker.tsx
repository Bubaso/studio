
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Skeleton } from './ui/skeleton';
import { Loader2 } from 'lucide-react';
import { FormDescription } from './ui/form';

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

// Default center: Dakar, Senegal
const defaultCenter = {
  lat: 14.7167,
  lng: -17.4677
};

const libraries: ("places")[] = ["places"];

interface LocationPickerProps {
    initialPosition: { lat: number; lng: number } | null;
    onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
}

export function LocationPicker({ initialPosition, onLocationSelect }: LocationPickerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [markerPosition, setMarkerPosition] = useState<{ lat: number, lng: number } | null>(initialPosition);
  const [mapCenter, setMapCenter] = useState(initialPosition || defaultCenter);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPosition) {
        setMarkerPosition(initialPosition);
        setMapCenter(initialPosition);
    }
  }, [initialPosition]);


  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos);
      
      // Reverse geocode to get an address for the new position
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newPos }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const address = results[0].formatted_address;
          if (inputRef.current) {
            inputRef.current.value = address;
          }
          onLocationSelect({ ...newPos, address });
        } else {
            // If reverse geocoding fails, just send coordinates with a placeholder address
            onLocationSelect({ ...newPos, address: `Coordonnées: ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}` });
        }
      });
    }
  }, [onLocationSelect]);

  const onLoadAutocomplete = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setMarkerPosition(newPos);
        setMapCenter(newPos);
        onLocationSelect({ ...newPos, address: place.formatted_address || inputRef.current?.value || '' });
      }
    }
  }, [onLocationSelect]);

  if (loadError) {
    return (
        <div className="text-destructive-foreground bg-destructive p-4 rounded-md">
            Erreur de chargement de la carte. Veuillez vérifier votre clé API Google Maps et réessayer.
        </div>
    );
  }

  if (!isLoaded) {
    return (
        <div className="space-y-2">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[300px] w-full" />
            <div className='flex justify-center items-center gap-2 p-4 text-muted-foreground'>
                <Loader2 className="h-4 w-4 animate-spin"/>
                <span>Chargement de la carte...</span>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-4">
        <div>
            <Label htmlFor="location-search">Lieu de l'article</Label>
            <Autocomplete
                onLoad={onLoadAutocomplete}
                onPlaceChanged={onPlaceChanged}
            >
                <Input
                    id="location-search"
                    type="text"
                    placeholder="Saisissez une adresse ou une ville"
                    ref={inputRef}
                    defaultValue={initialPosition ? '' : ''} // This might need linking to a form value if needed
                />
            </Autocomplete>
            <FormDescription className="mt-2">
                Sélectionnez une adresse dans la liste ou déplacez l'épingle sur la carte.
            </FormDescription>
        </div>
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={initialPosition ? 15 : 12}
        >
            {markerPosition && (
                <Marker
                    position={markerPosition}
                    draggable={true}
                    onDragEnd={onMarkerDragEnd}
                />
            )}
        </GoogleMap>
    </div>
  );
}
