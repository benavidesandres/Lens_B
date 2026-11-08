import Feather from '@expo/vector-icons/Feather';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiRequestError } from '@/api/client';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { JournalProvider } from '@/features/journal/journal-provider';
import { ProximityTracker } from '@/features/journal/proximity-tracker';
import { LocationProvider } from '@/features/location/location-provider';
import { useTheme } from '@/theme/use-theme';

// La pantalla de inicio se mantiene hasta tener las fuentes, para evitar saltos de texto.
void SplashScreen.preventAutoHideAsync();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Solo se reintentan errores transitorios (red, 5xx, 429), como máximo dos veces.
        retry: (failureCount, error) =>
          failureCount < 2 && (!(error instanceof ApiRequestError) || error.isRetryable),
        refetchOnWindowFocus: false,
      },
    },
  });
}

export default function RootLayout() {
  // El cliente se crea una vez por montaje y no se comparte entre recargas.
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    ...Feather.font,
  });
  // Si una fuente falla, la app continúa con la tipografía del sistema.
  const fontsReady = fontsLoaded || fontError !== null;

  if (!fontsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { scheme, colors } = useTheme();
  const { loading, isAuthenticated } = useAuth();

  // La pantalla de inicio se mantiene hasta saber si hay una sesión guardada.
  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  if (loading) return null;

  return (
    // El permiso de ubicación se pide después de entrar, no sobre la pantalla de acceso.
    <LocationProvider enabled={isAuthenticated}>
      <JournalProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <ProximityTracker />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="place/[id]" />
              <Stack.Screen name="route/[id]" />
            </Stack.Protected>
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="auth" />
            </Stack.Protected>
            <Stack.Screen name="auth-callback" />
          </Stack>
        </ThemeProvider>
      </JournalProvider>
    </LocationProvider>
  );
}
