import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiRequestError } from '@/api/client';
import { JournalProvider } from '@/features/journal/journal-provider';
import { ProximityTracker } from '@/features/journal/proximity-tracker';
import { LocationProvider } from '@/features/location/location-provider';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

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
  const { scheme, colors } = useTheme();

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

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <LocationProvider>
          <JournalProvider>
            <ThemeProvider value={navigationTheme}>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <ProximityTracker />
              <Stack
                screenOptions={{
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal',
                  headerTintColor: colors.text,
                  headerTitleStyle: { fontFamily: fonts.serif },
                  contentStyle: { backgroundColor: colors.background },
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="place/[id]" options={{ title: '' }} />
                <Stack.Screen name="route/[id]" options={{ title: 'Ruta' }} />
              </Stack>
            </ThemeProvider>
          </JournalProvider>
        </LocationProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
