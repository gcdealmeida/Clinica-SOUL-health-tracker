/** Datas em horário local (nunca toISOString/UTC). */
export const todayStr = (): string => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/** "AAAA-MM-DD" local de N dias atrás (0 = hoje). */
export const daysAgoStr = (n: number): string => {
  const d = new Date(Date.now() - n * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "AAAA-MM-DD HH:MM" local agora. */
export const nowLocalDateTime = (): string => {
  const n = new Date()
  return `${todayStr()} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}
