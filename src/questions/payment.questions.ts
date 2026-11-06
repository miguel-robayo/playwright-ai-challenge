import type { NetworkGuards } from '../interactions/network-guards';
import type { App } from '../pages/app';
import type { PaymentField } from '../pages/payment.page';

const CSRF_FIELD = 'csrfmiddlewaretoken';

/**
 * POST /payment interceptado, ya saneado: el token CSRF nunca aparece, solo si estaba
 * presente y no vacío. Es seguro adjuntarlo, imprimirlo o mostrarlo en un error.
 */
export interface InterceptedPayment {
  readonly method: string;
  readonly url: string;
  readonly contentType: string | undefined;
  /** Campos del formulario salvo el CSRF. */
  readonly fields: Readonly<Record<string, string>>;
  readonly csrfTokenPresent: boolean;
  /** Error con el que terminó la petición en el navegador. */
  readonly failure: string | undefined;
}

/** ¿Qué POST /payment interceptó el guard? Lee el registro del guard; no navega. */
export function interceptedPayments(guards: NetworkGuards): InterceptedPayment[] {
  return guards.paymentRequests.map((request) => {
    const params = new URLSearchParams(request.postData ?? '');
    const csrf = params.get(CSRF_FIELD);
    params.delete(CSRF_FIELD);
    return {
      method: request.method,
      url: request.url,
      contentType: request.contentType,
      fields: Object.fromEntries(params),
      csrfTokenPresent: Boolean(csrf && csrf.length > 0),
      failure: request.failure,
    };
  });
}

/** ¿Qué campos del pago indican que falta un valor y es válido el formulario? */
export async function paymentFormValidity(
  app: App,
): Promise<{ valueMissing: Record<PaymentField, boolean>; formIsValid: boolean }> {
  return app.payment.readValidity();
}
