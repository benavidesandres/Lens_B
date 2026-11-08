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
| Google Places (New)      | Negocios, calificación, precios, horarios y fotos        | Sí, opcional   |
| Google Routes            | Trazado real a pie por calles y tiempos de cada tramo    | Sí, opcional   |
| OpenStreetMap (Overpass) | Murales, cafés, parques, miradores, monumentos, horarios | No             |
| Wikipedia                | Historia, fotografías y año de construcción              | No             |
| Claude (Anthropic)       | Composición de rutas personalizadas                      | Sí, opcional   |
| Groq                     | Alternativa a Claude para componer rutas                 | Sí, opcional   |

Si no hay clave de Anthropic se usa Groq (`GROQ_API_KEY`); sin ninguna de las dos, las rutas se generan con un planificador local (heurístico), así que la app funciona igualmente.

### Claves de Google Maps

Hay dos claves distintas, cada una con su restricción:

| Clave                         | Dónde va                                | APIs                         | Restricción de aplicación                                  |
| ----------------------------- | --------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `GOOGLE_MAPS_API_KEY`         | `apps/server/.env` (solo servidor)      | Places API (New), Routes API | Ninguna en desarrollo; **Direcciones IP** en producción    |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Variable de entorno al compilar con EAS | Maps SDK for Android         | **Apps de Android**: paquete `com.lens.app` + huella SHA-1 |

- La clave del servidor **no** debe restringirse a Android: las llamadas las hace el servidor, no el teléfono, y Google las rechazaría (HTTP 403).
- El teléfono nunca recibe la clave del servidor: las fotos pasan por `/v1/photos`, que redirige a la imagen pública.
- Google factura por llamada y por campos pedidos. El servidor pide solo los campos que usa, guarda en caché las búsquedas (10 min) y las fotos (6 h), y limita las peticiones por IP. Configura también alertas de presupuesto y cuotas diarias en Google Cloud.
- Google no publica precios exactos de productos: da un nivel (`# LENS

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
| Google Places (New)      | Negocios, calificación, precios, horarios y fotos        | Sí, opcional   |
| Google Routes            | Trazado real a pie por calles y tiempos de cada tramo    | Sí, opcional   |
| OpenStreetMap (Overpass) | Murales, cafés, parques, miradores, monumentos, horarios | No             |
| Wikipedia                | Historia, fotografías y año de construcción              | No             |
| Claude (Anthropic)       | Composición de rutas personalizadas                      | Sí, opcional   |
| Groq                     | Alternativa a Claude para componer rutas                 | Sí, opcional   |

Si no hay clave de Anthropic se usa Groq (`GROQ_API_KEY`); sin ninguna de las dos, las rutas se generan con un planificador local (heurístico), así que la app funciona igualmente.

–`$$`) y, en algunos lugares, un rango aproximado por persona.

## Requisitos

- Node.js 20.19 o superior
- La app **Expo Go** en el teléfono, o un emulador Android / simulador iOS

## Puesta en marcha

```bash
npm install

cp apps/server/.env.example apps/server/.env   # y rellena las claves que quieras usar

# Arranca el servidor y la app a la vez
npm run dev
```

Escanea el código QR con Expo Go. El teléfono y el ordenador deben estar en la misma red Wi-Fi: la app deduce automáticamente la IP del servidor a partir de Metro. Si necesitas otra dirección, define `EXPO_PUBLIC_API_URL` en `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.20:8787
```

## Scripts

| Comando              | Descripción                                     |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Servidor y app a la vez (muestra el QR)         |
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
| GET    | `/v1/photos/:placeId/:photoId`              | Foto de Google (redirección, sin exponer la clave)         |
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
