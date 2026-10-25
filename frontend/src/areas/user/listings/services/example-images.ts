// Fotos de exemplo (SVG gerado, sem arquivo nem rede) para ver a galeria e os cards com imagem
// enquanto não há upload de verdade. Cada foto de um mesmo anúncio tem um desenho diferente,
// para as miniaturas serem distinguíveis.
const PALETTE: Record<number, { background: string; ink: string }> = {
  1: { background: '#dbeafe', ink: '#1e4f86' },
  2: { background: '#e0e7ff', ink: '#3f3d99' },
  3: { background: '#fde9d6', ink: '#9a4a12' },
  4: { background: '#d9f2e3', ink: '#1d6b45' },
  5: { background: '#fbe0ea', ink: '#9b2c55' },
  6: { background: '#e8e8ee', ink: '#44485a' },
}

const escapeXml = (text: string) =>
  text.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!)

export function exampleImage(categoryId: number, title: string, index: number): string {
  const { background, ink } = PALETTE[categoryId] ?? PALETTE[6]!
  const initial = escapeXml(([...title.trim()][0] ?? '?').toUpperCase())
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>` +
    `<rect width='800' height='600' fill='${background}'/>` +
    `<circle cx='${140 + index * 130}' cy='${120 + (index % 2) * 60}' r='${70 + index * 14}' fill='${ink}' fill-opacity='0.12'/>` +
    `<rect x='${520 - index * 60}' y='360' width='320' height='320' rx='40' fill='${ink}' fill-opacity='0.08' transform='rotate(${index * 12} 680 520)'/>` +
    `<text x='400' y='330' font-size='230' text-anchor='middle' fill='${ink}' font-family='Georgia,serif' font-weight='700'>${initial}</text>` +
    `<text x='400' y='520' font-size='34' text-anchor='middle' fill='${ink}' font-family='sans-serif'>Foto ${index + 1} · exemplo</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Quantas fotos de exemplo cada anúncio tem (de 1 a 5, para exercitar a galeria). O nº 1 tem 3,
// como o Figma (tela 08a).
export function exampleImageCount(listingId: number): number {
  return listingId === 1 ? 3 : 1 + (listingId % 5)
}

export function exampleImages(listingId: number, categoryId: number, title: string): string[] {
  return Array.from({ length: exampleImageCount(listingId) }, (_, index) => exampleImage(categoryId, title, index))
}
