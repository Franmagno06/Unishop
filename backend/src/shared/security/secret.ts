// Valor sensível que nunca aparece em log, JSON nem mensagem de erro (backend.md §16, api.md §6).
// Só `reveal()` entrega o valor, e deve ser chamado no ponto de uso (cabeçalho, driver).
export class Secret {
  readonly #value: string

  constructor(value: string) {
    this.#value = value
  }

  reveal(): string {
    return this.#value
  }

  toString(): string {
    return '[REDACTED]'
  }

  toJSON(): string {
    return '[REDACTED]'
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return '[REDACTED]'
  }
}
