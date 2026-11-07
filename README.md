# LENS

Aplicación móvil para descubrir lo interesante que hay alrededor: edificios con historia, arte urbano, cafés de barrio, parques y rincones poco conocidos. Además genera rutas a pie a partir de una petición en lenguaje natural ("Tengo una hora libre y no quiero gastar dinero").

## Estructura

```
apps/
  mobile/    App Expo (React Native + TypeScript, Expo Router)
  server/    API en Node (Hono): lugares, fichas y planificación de rutas
packages/
  shared/    Esquemas Zod y tipos compartidos entre la app y el servidor
```

### Fuentes de datos

| Fuente                   | Uso                                                      | Requiere clave |
| ------------------------ | -------------------------------------------------------- | -------------- |
| OpenStreetMap (Overpass) | Murales, cafés, parques, miradores, monumentos, horarios | No             |
| Wikipedia                | Historia, fotografías y año de construcción              | No             |
| Claude (Anthropic)       | Composición de rutas personalizadas                      | Sí, opcional   |

Sin clave de Anthropic las rutas se generan con un planificador local (heurístico), así que la app funciona igualmente.

## Requisitos

- Node.js 20.19 o superior
- La app **Expo Go** en el teléfono, o un emulador Android / simulador iOS

## Puesta en marcha

```bash
npm install

# 1. Servidor
cp apps/server/.env.example apps/server/.env   # y rellena ANTHROPIC_API_KEY si quieres IA
npm run dev:server

# 2. App (en otra terminal)
npm run dev:mobile
```

Escanea el código QR con Expo Go. El teléfono y el ordenador deben estar en la misma red Wi-Fi: la app deduce automáticamente la IP del servidor a partir de Metro. Si necesitas otra dirección, define `EXPO_PUBLIC_API_URL` en `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.20:8787
```

## Scripts

| Comando              | Descripción                                     |
| -------------------- | ----------------------------------------------- |
| `npm run dev:server` | Servidor con recarga automática                 |
| `npm run dev:mobile` | Servidor de desarrollo de Expo                  |
| `npm run typecheck`  | Comprobación de tipos en todos los paquetes     |
| `npm test`           | Tests unitarios (servidor y paquete compartido) |
| `npm run lint`       | ESLint de la app                                |
| `npm run format`     | Formatea con Prettier                           |

## API

| Método | Ruta                                        | Descripción                                                |
| ------ | ------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/health`                                   | Estado del servidor e indicador de IA activa               |
| GET    | `/v1/places/nearby?lat&lon&radius&category` | Lugares cercanos ordenados por distancia                   |
| GET    | `/v1/places/:id?lat&lon`                    | Ficha completa de un lugar                                 |
| POST   | `/v1/route-plans`                           | Genera una ruta: `{ "prompt": "...", "lat": 0, "lon": 0 }` |

Los errores siempre tienen la forma `{ "error": { "code": "...", "message": "..." } }`.

## Decisiones de diseño

- **La clave de IA nunca está en el teléfono.** Toda llamada al modelo pasa por el servidor, que además limita la frecuencia de peticiones por IP.
- **Los datos del modelo no se toman al pie de la letra.** El modelo elige y ordena paradas de una lista de lugares reales; distancias y tiempos se calculan en el servidor y la ruta se recorta si excede el tiempo disponible.
- **Privacidad.** El historial (lugares vistos, veces que pasaste cerca, rutas guardadas) se guarda solo en el dispositivo.
- **Resiliencia.** Si OpenStreetMap o Wikipedia fallan, se responde con la otra fuente; Overpass usa varios servidores y un _circuit breaker_ para no bloquear al usuario.

## Producción

- Ejecuta tu propia instancia de Overpass o un proveedor de pago: los servidores públicos tienen límites estrictos.
- El límite de peticiones y la caché son en memoria; con varias instancias del servidor conviene moverlos a Redis.
- Para publicar en tiendas, añade la clave de Google Maps para Android en el plugin `react-native-maps` (ver la [documentación de Expo](https://docs.expo.dev/versions/latest/sdk/map-view/)) y compila con EAS Build.
