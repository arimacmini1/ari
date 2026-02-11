/**
 * Metric Sparkline Component
 * Renders a simple line chart for metric trending
 */

interface MetricSparklineProps {
  data: number[]
  min?: number
  max?: number
  color?: string
  height?: number
  width?: number
  className?: string
  title?: string
}

export function MetricSparkline({
  data,
  min = 0,
  max = 100,
  color = "currentColor",
  height = 20,
  width = 60,
  className = "",
  title = "",
}: MetricSparklineProps) {
  if (data.length === 0) {
    return <div className={`w-${width} h-${height} bg-secondary/30 rounded ${className}`} title={title} />
  }

  // Normalize data to 0-1 range
  const range = max - min
  const normalized = data.map((v) => (v - min) / range)

  // Create SVG path
  const padding = 2
  const availableWidth = width - padding * 2
  const availableHeight = height - padding * 2
  const pointSpacing = availableWidth / (data.length - 1 || 1)

  let pathData = ""
  normalized.forEach((value, idx) => {
    const x = padding + idx * pointSpacing
    const y = padding + availableHeight * (1 - value) // Invert Y axis
    const cmd = idx === 0 ? "M" : "L"
    pathData += `${cmd}${x.toFixed(1)},${y.toFixed(1)} `
  })

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`inline-block ${className}`}
      title={title}
    >
      {/* Background */}
      <rect width={width} height={height} fill="transparent" />

      {/* Baseline */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={color} strokeWidth="0.5" opacity="0.3" />

      {/* Trend line */}
      <path d={pathData} stroke={color} strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />

      {/* Area under curve */}
      <path
        d={`${pathData}L${width - padding},${height - padding} L${padding},${height - padding} Z`}
        fill={color}
        opacity="0.1"
      />
    </svg>
  )
}
