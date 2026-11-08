// En web no hay mapa nativo, así que el trazado no se dibuja.
export function RoutePath(_props: {
  coordinates: { latitude: number; longitude: number }[];
  dashed?: boolean;
}) {
  return null;
}
