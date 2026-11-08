import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extiende app.json con valores que no deben quedar en el repositorio.
 *
 * GOOGLE_MAPS_ANDROID_API_KEY: clave de "Maps SDK for Android" para mostrar el
 * mapa de Google en las compilaciones propias (EAS Build). Expo Go no la
 * necesita. Debe ser una clave distinta de la del servidor, restringida a
 * "Apps de Android" con el paquete com.lens.app y su huella SHA-1.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

  return {
    ...config,
    name: config.name ?? 'LENS',
    slug: config.slug ?? 'lens',
    plugins: [
      ...(config.plugins ?? []),
      ...(androidMapsKey
        ? [['react-native-maps', { androidGoogleMapsApiKey: androidMapsKey }] as [string, object]]
        : []),
    ],
  };
};
