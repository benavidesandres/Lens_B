import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { AuthHero } from '@/features/auth/auth-hero';
import { useAuth } from '@/features/auth/auth-provider';
import {
  CheckEmailStep,
  ForgotStep,
  NewPasswordStep,
  SignInStep,
  SignUpStep,
} from '@/features/auth/auth-steps';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/theme/use-theme';

type Step = 'signIn' | 'signUp' | 'checkSignup' | 'forgot' | 'checkRecovery';

export default function AuthScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [step, setStep] = useState<Step>('signIn');
  // Se conserva entre pasos para no pedir el correo dos veces.
  const [email, setEmail] = useState('');
  // Solo en memoria: permite entrar en cuanto se confirme el correo.
  const [pendingPassword, setPendingPassword] = useState('');
  const address = email.trim().toLowerCase();
  const showTabs = !auth.recovering && (step === 'signIn' || step === 'signUp');

  const awaitConfirmation = (password: string) => {
    setPendingPassword(password);
    setStep('checkSignup');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior="padding">
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.grow}>
        <AuthHero compact={!showTabs} />

        <View
          style={[
            styles.sheet,
            {
              marginTop: -radius.xl * 1.4,
              paddingHorizontal: spacing.gutter,
              paddingTop: spacing.xl,
              paddingBottom: insets.bottom + spacing.xl,
              gap: spacing.xl,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              backgroundColor: colors.background,
            },
          ]}>
          {!isSupabaseConfigured ? (
            <View
              style={{
                padding: spacing.md,
                borderRadius: radius.sm,
                backgroundColor: colors.dangerMuted,
              }}>
              <Text variant="small" tone="danger">
                Falta la URL de Supabase en apps/mobile/.env. Agrégala y reinicia la app.
              </Text>
            </View>
          ) : null}

          {showTabs ? (
            <View
              accessibilityRole="tablist"
              style={[
                styles.tabs,
                {
                  padding: spacing.xs,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceMuted,
                },
              ]}>
              <Tab label="Entrar" active={step === 'signIn'} onPress={() => setStep('signIn')} />
              <Tab
                label="Crear cuenta"
                active={step === 'signUp'}
                onPress={() => setStep('signUp')}
              />
            </View>
          ) : null}

          <Animated.View
            key={auth.recovering ? 'newPassword' : step}
            entering={FadeIn.duration(220)}>
            {auth.recovering ? <NewPasswordStep /> : null}
            {!auth.recovering && step === 'signIn' ? (
              <SignInStep
                email={email}
                onEmailChange={setEmail}
                onForgot={() => setStep('forgot')}
                onNeedsVerification={awaitConfirmation}
              />
            ) : null}
            {!auth.recovering && step === 'signUp' ? (
              <SignUpStep
                email={email}
                onEmailChange={setEmail}
                onNeedsVerification={awaitConfirmation}
              />
            ) : null}
            {!auth.recovering && step === 'checkSignup' ? (
              <CheckEmailStep
                email={address}
                resend={() => auth.resendSignup(address)}
                confirm={() => auth.signIn(address, pendingPassword)}
                onBack={() => setStep('signUp')}>
                Ábrelo y vuelve aquí para entrar. Si el navegador muestra un error después de
                abrirlo, no importa: tu correo ya quedó confirmado.
              </CheckEmailStep>
            ) : null}
            {!auth.recovering && step === 'forgot' ? (
              <ForgotStep
                email={email}
                onEmailChange={setEmail}
                onSent={() => setStep('checkRecovery')}
                onBack={() => setStep('signIn')}
              />
            ) : null}
            {!auth.recovering && step === 'checkRecovery' ? (
              <CheckEmailStep
                email={address}
                resend={() => auth.requestPasswordReset(address)}
                onBack={() => setStep('forgot')}>
                Ábrelo desde este teléfono para crear tu contraseña nueva.
              </CheckEmailStep>
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.tab,
        {
          borderRadius: radius.sm + 2,
          backgroundColor: active ? colors.surface : 'transparent',
          boxShadow: active ? colors.shadow : undefined,
        },
      ]}>
      <Text variant="smallStrong" tone={active ? 'primary' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  sheet: { flexGrow: 1 },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
