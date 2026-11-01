// A barra invertida, % e _ têm sentido especial no LIKE: o texto digitado entra como texto comum.
export const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`)
