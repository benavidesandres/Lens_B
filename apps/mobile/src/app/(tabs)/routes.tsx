import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { usePlanRoute } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import { useLocation } from '@/features/location/location-provider';
import { formatDistance, formatMinutes, formatShortDate } from '@/lib/format';
import { typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SUGGESTIONS = [
  'Tengo una hora libre y no quiero gastar dinero.',
  'Una ruta de arte de 45 minutos.',
  'Quiero descubrir lugares misteriosos.',
  'Media hora para un café y algo de historia.',
];

const MAX_PROMPT_LENGTH = 500;

export default function RoutesScreen() {
  const { colors, spacing, radius } = useTheme();
  const { coords, status, requestPermission } = useLocation();
  const { data: journal } = useJournal();
  const [prompt, setPrompt] = useState('');
  const planRoute = usePlanRoute();

  const canSubmit = prompt.trim().length >= 3 && coords !== null && !planRoute.isPending;

  const submit = () => {
    if (!coords) return;
    planRoute.mutate(
      { prompt: prompt.trim(), lat: coords.lat, lon: coords.lon },
      {
        onSuccess: (plan) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.push({ pathname: '/route/[id]', params: { id: plan.id } });
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ paddingTop: spacing.xl, gap: spacing.xs }}>
          <Text variant="label" tone="tertiary">
            Rutas a pie
          </Text>
          <Text variant="display" accessibilityRole="header">
            ¿Cuánto tiempo tienes?
          </Text>
          <Text tone="secondary" style={{ marginTop: spacing.xs }}>
            Cuéntalo con tus palabras: el tiempo disponible, qué te interesa o si prefieres no
            gastar.
          </Text>
        </View>

        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ej.: Tengo una hora y me gusta la arquitectura"
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={MAX_PROMPT_LENGTH}
          accessibilityLabel="Describe la ruta que quieres"
          style={[
            typography.body,
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
              borderRadius: radius.md,
              padding: spacing.lg,
              marginTop: spacing.xl,
            },
          ]}
        />

        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          {SUGGESTIONS.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              accessibilityHint="Usa este texto como petición"
              onPress={() => setPrompt(suggestion)}
              style={({ pressed }) => [
                styles.suggestion,
                { paddingVertical: spacing.xs, gap: spacing.sm, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Feather name="corner-down-right" size={14} color={colors.textTertiary} />
              <Text variant="small" tone="secondary">
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </View>

        {status === 'denied' ? (
          <Button
            label="Permitir ubicación para crear rutas"
            variant="secondary"
            onPress={() => void requestPermission()}
            style={{ marginTop: spacing.xl }}
          />
        ) : (
          <Button
            label={planRoute.isPending ? 'Componiendo la ruta' : 'Crear ruta'}
            icon="arrow-right"
            onPress={submit}
            loading={planRoute.isPending}
            disabled={!canSubmit}
            style={{ marginTop: spacing.xl }}
          />
        )}

        {planRoute.isError ? (
          <Text tone="danger" variant="small" style={{ marginTop: spacing.sm }}>
            {planRoute.error.message}
          </Text>
        ) : null}

        {journal.routes.length > 0 ? (
          <View style={{ marginTop: spacing.xxxl }}>
            <SectionHeader label="Rutas guardadas" meta={String(journal.routes.length)} />
            {journal.routes.map(({ plan, savedAt, visitedStopIds }) => (
              <Link
                key={plan.id}
                href={{ pathname: '/route/[id]', params: { id: plan.id } }}
                asChild>
                <Pressable
                  accessibilityRole="link"
                  style={({ pressed }) => [
                    styles.savedRow,
                    {
                      borderBottomColor: colors.border,
                      paddingVertical: spacing.md,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}>
                  <View style={styles.flex}>
                    <Text variant="heading" numberOfLines={1}>
                      {plan.title}
                    </Text>
                    <Text variant="small" tone="secondary" style={{ marginTop: spacing.xxs }}>
                      {plan.stops.length} paradas · {formatMinutes(plan.totalMinutes)} ·{' '}
                      {formatDistance(plan.totalMeters)} · {formatShortDate(savedAt)}
                    </Text>
                  </View>
                  <Text variant="numeric" tone="tertiary">
                    {visitedStopIds.length}/{plan.stops.length}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: {
    minHeight: 110,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center' },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
