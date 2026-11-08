import Feather from '@expo/vector-icons/Feather';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/use-theme';

import { useAuth } from './auth-provider';

/** Identifica la cuenta activa y permite cerrar la sesión. */
export function AccountRow() {
  const { colors, spacing } = useTheme();
  const { user, signOut } = useAuth();

  const name =
    typeof user?.user_metadata.full_name === 'string' ? user.user_metadata.full_name : '';
  const email = user?.email ?? '';
  const initial = (name || email || '?').charAt(0).toUpperCase();

  const confirmSignOut = () => {
    Alert.alert('¿Cerrar sesión?', 'Podrás volver a entrar cuando quieras.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => {
            Alert.alert('No pudimos cerrar la sesión', 'Revisa tu internet e inténtalo de nuevo.');
          });
        },
      },
    ]);
  };

  return (
    <View style={[styles.row, { paddingTop: spacing.md, gap: spacing.md }]}>
      <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
        <Text variant="bodyStrong" style={{ color: colors.onAccent }}>
          {initial}
        </Text>
      </View>
      <View style={styles.flex}>
        {name ? (
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
        ) : null}
        <Text variant="small" tone="secondary" numberOfLines={1}>
          {email}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.6 : 1 }]}>
        <Feather name="log-out" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
