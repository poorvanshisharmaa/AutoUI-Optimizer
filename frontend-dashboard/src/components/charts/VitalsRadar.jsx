import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts'

export default function VitalsRadar({ suggestions }) {
  const categories = ['vitals', 'render', 'bundle', 'network', 'architecture']
  const counts = Object.fromEntries(categories.map(c => [c, 0]))
  suggestions.forEach(s => {
    if (counts[s.category] !== undefined) counts[s.category]++
  })

  const data = categories.map(c => ({
    category: c.charAt(0).toUpperCase() + c.slice(1),
    issues: counts[c],
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#2d2d44" />
        <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <PolarRadiusAxis tick={false} axisLine={false} />
        <Radar dataKey="issues" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
