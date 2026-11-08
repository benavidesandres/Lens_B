import { isAuthError } from '@supabase/supabase-js';

/** Error de autenticación con un mensaje listo para mostrar. */
export class AuthFailure extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AuthFailure';
  }
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Tu correo aún no está confirmado. Abre el enlace que te enviamos.',
  user_already_exists: 'Ya existe una cuenta con este correo. Inicia sesión.',
  email_exists: 'Ya existe una cuenta con este correo. Inicia sesión.',
  weak_password: 'Esa contraseña es muy fácil de adivinar. Prueba con otra.',
  same_password: 'La nueva contraseña debe ser distinta de la anterior.',
  otp_expired: 'Este enlace ya caducó o ya se usó. Pide uno nuevo.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera un momento e inténtalo.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e inténtalo.',
  email_address_invalid: 'Revisa que tu correo esté bien escrito.',
  signup_disabled: 'El registro de cuentas nuevas está desactivado.',
};

export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthFailure) return error.message;
  if (isAuthError(error)) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
    if (error.name === 'AuthRetryableFetchError') {
      return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
    }
  }
  return 'Algo salió mal. Inténtalo de nuevo.';
}

export function linkErrorMessage(code: string): string {
  return MESSAGES[code] ?? 'Este enlace no es válido. Pide uno nuevo.';
}

export function authErrorCode(error: unknown): string | undefined {
  if (error instanceof AuthFailure) return error.code;
  return isAuthError(error) ? error.code : undefined;
}
