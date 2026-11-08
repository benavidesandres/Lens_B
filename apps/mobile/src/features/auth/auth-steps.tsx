import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/theme/use-theme';

import { authErrorCode, authErrorMessage } from './auth-errors';
import { useAuth } from './auth-provider';
import { isPasswordValid, PasswordRules } from './password-rules';

const RESEND_COOLDOWN_SECONDS = 60;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

/** Estado común de una acción asíncrona: indicador de carga y mensaje de error. */
function useAuthAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, onError?: (cause: unknown) => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(authErrorMessage(cause));
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      onError?.(cause);
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, run };
}

function ErrorBanner({ message }: { message: string | null }) {
  const { colors, spacing, radius } = useTheme();
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          padding: spacing.md,
          gap: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: colors.dangerMuted,
        },
      ]}>
      <Feather name="alert-circle" size={16} color={colors.danger} style={styles.bannerIcon} />
      <Text variant="small" tone="danger" style={styles.flex}>
        {message}
      </Text>
    </View>
  );
}

function StepHeading({ title, children }: { title: string; children?: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {children ? <Text tone="secondary">{children}</Text> : null}
    </View>
  );
}

function TextLink({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
      <Text variant="smallStrong" tone={disabled ? 'tertiary' : 'accent'}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SignInStep({
  email,
  onEmailChange,
  onForgot,
  onNeedsVerification,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onForgot: () => void;
  onNeedsVerification: (password: string) => void;
}) {
  const { spacing } = useTheme();
  const { signIn, resendSignup } = useAuth();
  const { busy, error, setError, run } = useAuthAction();
  const [password, setPassword] = useState('');
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = () => {
    if (!isEmailValid(email)) return setError('Escribe un correo válido.');
    if (!password) return setError('Escribe tu contraseña.');
    const address = normalizeEmail(email);
    void run(
      () => signIn(address, password),
      (cause) => {
        if (authErrorCode(cause) !== 'email_not_confirmed') return;
        void resendSignup(address).catch(() => undefined);
        onNeedsVerification(password);
      },
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <StepHeading title="Qué bueno verte">Entra para seguir descubriendo.</StepHeading>
      <TextField
        label="Correo"
        icon="mail"
        value={email}
        onChangeText={onEmailChange}
        placeholder="tu@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <View style={{ gap: spacing.sm }}>
        <TextField
          ref={passwordRef}
          password
          label="Contraseña"
          icon="lock"
          value={password}
          onChangeText={setPassword}
          placeholder="Tu contraseña"
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <View style={styles.alignEnd}>
          <TextLink label="¿Olvidaste tu contraseña?" onPress={onForgot} />
        </View>
      </View>
      <ErrorBanner message={error} />
      <Button label="Entrar" icon="log-in" onPress={submit} loading={busy} />
    </View>
  );
}

export function SignUpStep({
  email,
  onEmailChange,
  onNeedsVerification,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onNeedsVerification: (password: string) => void;
}) {
  const { spacing } = useTheme();
  const { signUp } = useAuth();
  const { busy, error, setError, run } = useAuthAction();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = () => {
    if (name.trim().length < 2) return setError('Cuéntanos cómo te llamas.');
    if (!isEmailValid(email)) return setError('Escribe un correo válido.');
    if (!isPasswordValid(password)) return setError('Tu contraseña aún no cumple los requisitos.');
    void run(async () => {
      const needsVerification = await signUp(name.trim(), normalizeEmail(email), password);
      if (needsVerification) onNeedsVerification(password);
    });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <StepHeading title="Crea tu cuenta">Tu diario y tus rutas te estarán esperando.</StepHeading>
      <TextField
        label="Nombre"
        icon="user"
        value={name}
        onChangeText={setName}
        placeholder="¿Cómo te llamas?"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Correo"
        icon="mail"
        value={email}
        onChangeText={onEmailChange}
        placeholder="tu@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <View style={{ gap: spacing.sm }}>
        <TextField
          ref={passwordRef}
          password
          label="Contraseña"
          icon="lock"
          value={password}
          onChangeText={setPassword}
          placeholder="Crea una contraseña"
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <PasswordRules value={password} />
      </View>
      <ErrorBanner message={error} />
      <Button label="Crear cuenta" icon="arrow-right" onPress={submit} loading={busy} />
    </View>
  );
}

export function ForgotStep({
  email,
  onEmailChange,
  onSent,
  onBack,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onSent: () => void;
  onBack: () => void;
}) {
  const { spacing } = useTheme();
  const { requestPasswordReset } = useAuth();
  const { busy, error, setError, run } = useAuthAction();

  const submit = () => {
    if (!isEmailValid(email)) return setError('Escribe un correo válido.');
    void run(async () => {
      await requestPasswordReset(normalizeEmail(email));
      onSent();
    });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <StepHeading title="Recupera tu acceso">
        Te enviaremos un enlace a tu correo para crear una contraseña nueva.
      </StepHeading>
      <TextField
        autoFocus
        label="Correo"
        icon="mail"
        value={email}
        onChangeText={onEmailChange}
        placeholder="tu@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <ErrorBanner message={error} />
      <Button label="Enviar enlace" icon="send" onPress={submit} loading={busy} />
      <View style={styles.center}>
        <TextLink label="Volver a iniciar sesión" onPress={onBack} />
      </View>
    </View>
  );
}

export function CheckEmailStep({
  email,
  children,
  resend,
  confirm,
  onBack,
}: {
  email: string;
  children: ReactNode;
  resend: () => Promise<void>;
  // Si existe, se intenta entrar al volver a la app y desde el botón "Ya confirmé".
  confirm?: () => Promise<void>;
  onBack: () => void;
}) {
  const { colors, spacing } = useTheme();
  const { busy, error, run } = useAuthAction();
  const resendAction = useAuthAction();
  // El correo acaba de enviarse: hay que esperar antes de pedir otro.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Al volver del correo se entra sola; si aún no confirmó, no se muestra ningún error.
  useEffect(() => {
    if (!confirm) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') confirm().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [confirm]);

  const requestAgain = () => {
    void resendAction.run(async () => {
      await resend();
      setResent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={[styles.mailBadge, { backgroundColor: colors.accentMuted }]}>
        <Feather name="mail" size={24} color={colors.accent} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title" accessibilityRole="header">
          Revisa tu correo
        </Text>
        <Text tone="secondary">
          Enviamos un enlace a <Text variant="bodyStrong">{email}</Text>. {children} Si no aparece,
          mira en spam.
        </Text>
      </View>

      <ErrorBanner message={error ?? resendAction.error} />

      {confirm ? (
        <Button
          label={busy ? 'Comprobando…' : 'Ya confirmé, entrar'}
          icon="log-in"
          onPress={() => void run(confirm)}
          loading={busy}
        />
      ) : null}

      <View style={[styles.center, { gap: spacing.md }]}>
        {resent ? (
          <Text variant="small" style={{ color: colors.success }}>
            Te enviamos un enlace nuevo.
          </Text>
        ) : null}
        <TextLink
          disabled={cooldown > 0 || resendAction.busy}
          label={cooldown > 0 ? `Reenviar enlace en ${cooldown} s` : 'Reenviar enlace'}
          onPress={requestAgain}
        />
        <TextLink label="Usar otro correo" onPress={onBack} />
      </View>
    </View>
  );
}

export function NewPasswordStep() {
  const { spacing } = useTheme();
  const { completeRecovery, cancelRecovery } = useAuth();
  const { busy, error, setError, run } = useAuthAction();
  const [password, setPassword] = useState('');

  const submit = () => {
    if (!isPasswordValid(password)) return setError('Tu contraseña aún no cumple los requisitos.');
    void run(() => completeRecovery(password));
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <StepHeading title="Crea tu nueva contraseña">
        Correo verificado. Elige una contraseña para volver a entrar.
      </StepHeading>
      <View style={{ gap: spacing.sm }}>
        <TextField
          autoFocus
          password
          label="Nueva contraseña"
          icon="lock"
          value={password}
          onChangeText={setPassword}
          placeholder="Crea una contraseña"
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <PasswordRules value={password} />
      </View>
      <ErrorBanner message={error} />
      <Button label="Guardar y entrar" icon="check" onPress={submit} loading={busy} />
      <View style={styles.center}>
        <TextLink label="Cancelar" onPress={() => void cancelRecovery()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'flex-start' },
  bannerIcon: { marginTop: 2 },
  link: { minHeight: 24, justifyContent: 'center' },
  alignEnd: { alignItems: 'flex-end' },
  center: { alignItems: 'center' },
  mailBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
