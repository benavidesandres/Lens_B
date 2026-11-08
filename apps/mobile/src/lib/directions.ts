import { Linking, Platform } from 'react-native';

/** Abre la app de mapas del sistema con indicaciones a pie. */
export function openWalkingDirections(place: { lat: number; lon: number }) {
  const destination = `${place.lat},${place.lon}`;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destination}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
  void Linking.openURL(url);
}
