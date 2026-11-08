import Feather from '@expo/vector-icons/Feather';
import type { Category } from '@lens/shared';
import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Switch, TextInput, View } from 'react-native';

import { usePlanRoute } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import type { SavedRoute } from '@/features/journal/journal-schema';
import { useLocation } from '@/features/location/location-provider';
import { CATEGORY_ICONS, CATEGORY_ORDER, categoryLabel } from '@/features/places/category-meta';
import { formatDistance, formatMinutes } from '@/lib/format';
import { typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const DURATIONS = [
  { label: '30 min', phrase: '30 minutos' },
  { label: '1 hora', phrase: '1 hora' },
  { label: '2 horas', phrase: '2 horas' },
  { label: '3 horas', phrase: '3 horas' },
] as const;

// Palabras que el planificador reconoce para cada categoría.
const INTEREST_PHRASES: Record<Category, string> = {
  history: 'historia',
  food: 'comida y café',
  art: 'arte',
  nature: 'naturaleza',
  hidden: 'lugares secretos y curiosos',
};

const MAX_NOTES_LENGTH = 300;

/** Convierte las opciones elegidas en la petición en lenguaje natural que espera el servidor. */
function buildPrompt(duration: string, interests: Category[], freeOnly: boolean, notes: string) {
  return [
    `Tengo ${duration}.`,
    interests.length > 0
      ? `Me interesa: ${interests.map((item) => INTEREST_PHRASES[item]).join(', ')}.`
      : null,
    freeOnly ? 'Quiero una ruta gratis, sin gastar dinero.' : null,
    notes.trim() || null,
  ]
    .filter(Boolean)
    .join(' ');
}

export default function RoutesScreen() {
  const { colors, spacing, radius } = useTheme();
  const { coords, status, canAskAgain, requestPermission, openSettings } = useLocation();
  const { data: journal } = useJournal();
  const planRoute = usePlanRoute();

  const [duration, setDuration] = useState<string>(DURATIONS[1].phrase);
  const [interests, setInterests] = useState<Category[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const [notes, setNotes] = useState('');

  const toggleInterest = (category: Category) =>
    setInterests((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );

  const submit = () => {
    if (!coords) return;
    planRoute.mutate(
      {
        prompt: buildPrompt(duration, interests, freeOnly, notes),
        lat: coords.lat,
        lon: coords.lon,
      },
      {
        onSuccess: (plan) => {
          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          router.push({ pathname: '/route/[id]', params: { id: plan.id } });
        },
      },
    );
  };

  const locationBlocked = status === 'denied' || status === 'unavailable';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ScreenHeader
          eyebrow="Rutas a pie"
          title="Crea tu ruta"
          description="Elige tu tiempo y tus gustos. Nosotros trazamos el camino."
        />

        <Field title="¿Cuánto tiempo tienes?">
          <View style={[styles.row, { gap: spacing.sm }]}>
            {DURATIONS.map((item) => (
              <View key={item.phrase} style={styles.flex}>
                <Chip
                  label={item.label}
                  selected={duration === item.phrase}
                  onPress={() => setDuration(item.phrase)}
                />
              </View>
            ))}
          </View>
        </Field>

        <Field title="¿Qué te apetece?" hint="Puedes elegir varios">
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {CATEGORY_ORDER.map((category) => (
              <Chip
                key={category}
                label={categoryLabel(category)}
                icon={CATEGORY_ICONS[category]}
                selected={interests.includes(category)}
                onPress={() => toggleInterest(category)}
              />
            ))}
          </View>
        </Field>

        <View
          style={[
            styles.switchRow,
            {
              marginTop: spacing.xl,
              padding: spacing.lg,
              gap: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Solo lugares gratis</Text>
            <Text variant="small" tone="secondary">
              Sin entradas ni consumo obligatorio
            </Text>
          </View>
          <Switch
            accessibilityLabel="Solo lugares gratis"
            value={freeOnly}
            onValueChange={setFreeOnly}
            trackColor={{ true: colors.accent, false: colors.borderStrong }}
            thumbColor={colors.surface}
          />
        </View>

        <Field title="¿Algo más?" hint="Opcional">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej.: me gusta la arquitectura, voy con niños…"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={MAX_NOTES_LENGTH}
            accessibilityLabel="Detalles adicionales para tu ruta"
            style={[
              typography.body,
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.lg,
              },
            ]}
          />
        </Field>

        {locationBlocked ? (
          <Button
            label={
              canAskAgain ? 'Permitir ubicación para crear rutas' : 'Activar ubicación en Ajustes'
            }
            icon="map-pin"
            onPress={canAskAgain ? () => void requestPermission() : openSettings}
            style={{ marginTop: spacing.xl }}
          />
        ) : (
          <Button
            label={
              planRoute.isPending
                ? 'Trazando tu ruta…'
                : coords
                  ? 'Crear mi ruta'
                  : 'Buscando tu ubicación…'
            }
            icon="arrow-right"
            onPress={submit}
            loading={planRoute.isPending}
            disabled={!coords}
            style={{ marginTop: spacing.xl }}
          />
        )}

        {planRoute.isPending ? (
          <Text variant="small" tone="secondary" style={[styles.center, { marginTop: spacing.sm }]}>
            Estamos eligiendo los mejores lugares cerca de ti. Puede tardar unos segundos.
          </Text>
        ) : null}

        {planRoute.isError ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.error,
              {
                marginTop: spacing.md,
                padding: spacing.md,
                gap: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: colors.dangerMuted,
              },
            ]}>
            <Feather name="alert-circle" size={16} color={colors.danger} />
            <Text variant="small" tone="danger" style={styles.flex}>
              {planRoute.error.message}
            </Text>
          </View>
        ) : null}

        {journal.routes.length > 0 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <SectionHeader label="Tus rutas" meta={String(journal.routes.length)} />
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              {journal.routes.map((route) => (
                <SavedRouteCard key={route.plan.id} route={route} />
              ))}
            </View>
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Field({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginTop: spacing.xl, gap: spacing.sm + 2 }}>
      <View style={styles.fieldTitle}>
        <Text variant="bodyStrong">{title}</Text>
        {hint ? (
          <Text variant="small" tone="tertiary">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SavedRouteCard({ route: { plan, visitedStopIds } }: { route: SavedRoute }) {
  const { colors, spacing, radius } = useTheme();
  const total = plan.stops.length;
  const done = visitedStopIds.length;
  const progress = total > 0 ? Math.min(1, done / total) : 0;
  const completed = total > 0 && done >= total;

  return (
    <Link href={{ pathname: '/route/[id]', params: { id: plan.id } }} asChild>
      <PressableScale
        accessibilityRole="link"
        accessibilityLabel={`${plan.title}, ${done} de ${total} paradas visitadas`}
        pressedScale={0.98}
        style={{
          padding: spacing.lg,
          gap: spacing.sm,
          borderRadius: radius.md,
          borderWidth: 1,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}>
        <Text variant="heading" numberOfLines={2}>
          {plan.title}
        </Text>
        <View style={styles.fieldTitle}>
          <Text variant="small" tone="secondary">
            {total} paradas · {formatMinutes(plan.totalMinutes)} ·{' '}
            {formatDistance(plan.totalMeters)}
          </Text>
          <Text variant="numeric" style={{ color: completed ? colors.success : colors.accent }}>
            {completed ? 'Completada' : `${done}/${total}`}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${progress * 100}%`,
                backgroundColor: completed ? colors.success : colors.accent,
              },
            ]}
          />
        </View>
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  center: { textAlign: 'center' },
  fieldTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  input: { minHeight: 88, textAlignVertical: 'top', borderWidth: 1 },
  error: { flexDirection: 'row', alignItems: 'flex-start' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
