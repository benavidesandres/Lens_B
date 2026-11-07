import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_SERVER_PORT = 8787;

/**
 * URL base del servidor de LENS.
 *
 * 1. Si existe EXPO_PUBLIC_API_URL se usa tal cual (producción o configuración manual).
 * 2. En desarrollo se deduce la IP del equipo a partir del servidor de Metro,
 *    para que funcione en un teléfono físico en la misma red sin configurar nada.
 */
export function resolveApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // p. ej. "192.168.1.20:8081"
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${DEFAULT_SERVER_PORT}`;
  }

  // El emulador de Android accede al equipo anfitrión mediante 10.0.2.2.
  const localhost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${localhost}:${DEFAULT_SERVER_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
