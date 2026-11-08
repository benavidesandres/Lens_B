import { Redirect, router } from 'expo-router';
import { useLinkingURL } from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { StateMessage } from '@/components/ui/state-message';
import { authErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/theme/use-theme';

/** Destino del enlace que llega por correo: abre la sesión y continúa en la app. */
export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  const { handleAuthLink } = useAuth();
  const url = useLinkingURL();
  const handledUrl = useRef<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url || handledUrl.current === url) return;
    handledUrl.current = url;
    handleAuthLink(url)
      .then(() => setDone(true))
      .catch((cause: unknown) => setError(authErrorMessage(cause)));
  }, [url, handleAuthLink]);

  if (done) return <Redirect href="/" />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {error ? (
        <StateMessage
          icon="link"
          title="No pudimos abrir el enlace"
          description={error}
          actionLabel="Volver a LENS"
          onAction={() => router.replace('/')}
        />
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
