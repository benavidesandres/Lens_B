import type { MapStyleElement } from 'react-native-maps';

/**
 * Estilo de Google Maps (Android) desaturado: el mapa queda en segundo plano
 * y los puntos de interés propios de Google se ocultan para no competir con los de LENS.
 */
const hidePoi: MapStyleElement[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

export const lightMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#efebe3' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b665c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f4f1ea' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#fbfaf6' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f7f4ee' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e6dfd2' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d5dbd9' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e5e6d8' }] },
  ...hidePoi,
];

export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1c1b19' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8f8a7f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141412' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2926' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#34322e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#202628' }] },
  ...hidePoi,
];
