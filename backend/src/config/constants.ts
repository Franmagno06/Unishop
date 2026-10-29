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
