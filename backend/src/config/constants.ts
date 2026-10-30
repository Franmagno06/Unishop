// Limites das Regras de Negócio §9 e prazos das RN-ACE.
export const LIMITS = {
  nameMin: 3,
  nameMax: 150,
  emailMax: 150,
  passwordMin: 8,
  passwordMax: 72, // limite do bcrypt (RN-ACE-04)
} as const

export const BCRYPT_COST = 12
export const PASSWORD_RESET_MINUTES = 30 // RN-ACE-10
export const LAST_SEEN_THROTTLE_MS = 60_000

export const PAGINATION = { defaultLimit: 20, maxLimit: 50 } as const

// Limites do anúncio (Regras §9, RN-ANU-12) e das imagens (RN-ANU-03, desvio de 4 MB confirmado em 16/10/2026).
export const LISTING_LIMITS = {
  nameMin: 3,
  nameMax: 150,
  descriptionMin: 10,
  descriptionMax: 2000,
  priceMinCents: 1, // R$ 0,01
  priceMaxCents: 9_999_999, // R$ 99.999,99
  quantityMin: 1,
  quantityMax: 999,
  searchMax: 100,
} as const

export const IMAGE_LIMITS = {
  maxBytes: 4 * 1024 * 1024,
  maxPerListing: 5,
  mimeTypes: ['image/jpeg', 'image/png'],
} as const
