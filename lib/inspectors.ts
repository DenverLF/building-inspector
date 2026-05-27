export const INSPECTORS = [
  'Anda Mpalala',
  'Claude Muller',
  'Due Wayne Petersen',
  'Emile Snygans',
  'Happyboy Ludidi',
  'Keezia Langeveldt',
  'Mario Horn',
  'Mzuyanda Jezile',
  'Nompumelelo Williams',
  'Roberto Cupido',
  'Thanusha Pillay',
  'Vizikhungo Luzipo',
  'Yolisa Madaza',
]

export function getInitials(name: string | null | undefined): string {
  if (!name) return 'IN'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}
