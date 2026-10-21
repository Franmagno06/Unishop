// "1 anúncio", "0 anúncios", "48 anúncios" (RN-CAT-02).
export function formatListingCount(count: number): string {
  return `${count} ${count === 1 ? 'anúncio' : 'anúncios'}`
}
