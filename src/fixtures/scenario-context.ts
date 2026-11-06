import type { RegistrationProfile } from '../data/registration-profile';
import type { App } from '../pages/app';
import type { CartLine } from '../questions/cart.questions';
import type { ListedProduct } from '../questions/products.questions';
import type { PaymentCard } from '../data/payment-card';
import type { AddToCartResult } from '../tasks/cart.tasks';

/**
 * Datos que un escenario comparte entre sus pasos. Cada clave tiene un tipo fijo:
 * añadir una clave aquí es la única forma de compartir un dato nuevo.
 */
export interface ScenarioMemory {
  /** Producto que la preparación del escenario añadió al carrito. */
  productInCart: ListedProduct;
  /** Productos añadidos al carrito en el escenario, en orden, con la respuesta del servidor. */
  addedProducts: readonly AddToCartResult[];
  /** Producto tal como aparecía en el listado antes de abrir su detalle. */
  listedProduct: ListedProduct;
  /** Contenido del carrito al terminar la preparación, para comprobar su persistencia. */
  cartSnapshot: readonly CartLine[];
  /** Error capturado al usar un localizador sobre una variante del DOM (pruebas de resiliencia). */
  locatorError: Error;
  /** Error con el que se rechazó una propuesta de la IA (escenarios negativos de datos). */
  aiRejection: Error;
  /** Tarjeta sintética enviada en el formulario de pago. */
  paymentCard: PaymentCard;
  /** Perfil sintético del usuario del escenario. */
  profile: RegistrationProfile;
  /**
   * Sesión de navegador sobre la que actúan y comprueban los pasos. Si no se registra,
   * es la del test (`app`); un paso que abre otra sesión la registra aquí.
   */
  activeSession: App;
}

/**
 * Memoria tipada de un escenario. El fixture `scenario` crea una instancia nueva
 * por test, así que nada se comparte entre escenarios ni entre workers.
 */
export class ScenarioContext {
  readonly #values = new Map<keyof ScenarioMemory, ScenarioMemory[keyof ScenarioMemory]>();

  remember<K extends keyof ScenarioMemory>(key: K, value: ScenarioMemory[K]): void {
    this.#values.set(key, value);
  }

  recall<K extends keyof ScenarioMemory>(key: K): ScenarioMemory[K] {
    if (!this.#values.has(key)) {
      throw new Error(`El escenario no registró "${key}" en un paso anterior`);
    }
    return this.#values.get(key) as ScenarioMemory[K];
  }

  /** Como `recall`, pero devuelve `fallback` si el dato no se registró. */
  recallOr<K extends keyof ScenarioMemory>(key: K, fallback: ScenarioMemory[K]): ScenarioMemory[K] {
    return this.#values.has(key) ? this.recall(key) : fallback;
  }
}
