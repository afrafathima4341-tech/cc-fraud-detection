const compactUnits = [
  { threshold: 1_000_000_000, suffix: 'B' },
  { threshold: 1_000_000, suffix: 'M' },
  { threshold: 1_000, suffix: 'K' },
]

export function formatNumber(value) {
  const number = Number(value)
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(number) ? number : 0)
}

export function formatCompactNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'

  const unit = compactUnits.find(({ threshold }) => Math.abs(number) >= threshold)
  if (!unit) return formatNumber(number)

  const compactValue = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
    .format(number / unit.threshold)
  return `${compactValue}${unit.suffix}`
}

export function formatINR(value) {
  const number = Number(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0)
}

export function formatCompactINR(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return formatINR(0)
  if (Math.abs(number) < 1_000) return formatINR(number)
  return `₹${formatCompactNumber(number)}`
}