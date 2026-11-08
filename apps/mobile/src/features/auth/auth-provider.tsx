import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { AuthFailure, linkErrorMessage } from './auth-errors';

interface AuthContextValue {
  // true solo mientras se lee la sesión guardada en el dispositivo.
  loading: boolean;
  user: User | null;
  // true si hay sesión y no queda ningún paso de acceso por completar.
  isAuthenticated: boolean;
  // true mientras el usuario debe elegir una contraseña nueva tras abrir el enlace.
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  // Devuelve true si la cuenta debe confirmarse con el enlace enviado al correo.
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  resendSignup: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  // Abre la sesión con los datos del enlace recibido por correo.
  handleAuthLink: (url: string) => Promise<void>;
  completeRecovery: (password: string) => Promise<void>;
  cancelRecovery: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function client(): SupabaseClient {
  if (!supabase) {
    throw new AuthFailure('Falta configurar la URL de Supabase en apps/mobile/.env.');
  }
  return supabase;
}

// A esta dirección vuelve el usuario después de abrir el enlace del correo.
const authRedirectUrl = () => Linking.createURL('auth-callback');

/** Convierte los errores que Supabase devuelve como dato en excepciones. */
function unwrap<T extends { error: Error | null }>(result: T): T {
  if (result.error) throw result.error;
  return result;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  // Abrir el enlace de recuperación ya abre sesión, pero la app debe seguir
  // en la pantalla de acceso hasta que el usuario elija su nueva contraseña.
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // INITIAL_SESSION llega de inmediato con lo guardado en el dispositivo.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user: session?.user ?? null,
      isAuthenticated: session !== null && !recovering,
      recovering,

      signIn: async (email, password) => {
        unwrap(await client().auth.signInWithPassword({ email, password }));
      },

      signUp: async (name, email, password) => {
        const { data } = unwrap(
          await client().auth.signUp({
            email,
            password,
            options: { data: { full_name: name }, emailRedirectTo: authRedirectUrl() },
          }),
        );
        // Por seguridad, Supabase no da error si el correo ya existe y confirmado:
        // devuelve un usuario sin identidades.
        if (data.user?.identities?.length === 0) {
          throw new AuthFailure(
            'Ya existe una cuenta con este correo. Inicia sesión.',
            'user_already_exists',
          );
        }
        return data.session === null;
      },

      resendSignup: async (email) => {
        unwrap(
          await client().auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: authRedirectUrl() },
          }),
        );
      },

      requestPasswordReset: async (email) => {
        unwrap(await client().auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() }));
      },

      handleAuthLink: async (url) => {
        // Supabase devuelve el resultado en el fragmento de la URL (lo que va tras "#").
        const params = new URLSearchParams(url.split('#')[1] ?? '');
        const errorCode = params.get('error_code');
        if (errorCode) throw new AuthFailure(linkErrorMessage(errorCode), errorCode);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) {
          throw new AuthFailure('Este enlace no es válido. Pide uno nuevo.');
        }

        const isRecovery = params.get('type') === 'recovery';
        if (isRecovery) setRecovering(true);
        try {
          unwrap(
            await client().auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }),
          );
        } catch (error) {
          setRecovering(false);
          throw error;
        }
      },

      completeRecovery: async (password) => {
        unwrap(await client().auth.updateUser({ password }));
        setRecovering(false);
      },

      cancelRecovery: async () => {
        await client().auth.signOut();
        setRecovering(false);
      },

      signOut: async () => {
        unwrap(await client().auth.signOut());
      },
    }),
    [loading, session, recovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
