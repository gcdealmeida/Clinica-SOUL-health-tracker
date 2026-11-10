import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { PillarChartPoint } from '@/lib/pillarDetailHistory'

interface PillarChartProps {
  type: 'line' | 'dualLine' | 'bars' | 'none'
  data: PillarChartPoint[]
  unit?: string
}

export const PillarDetailChart: React.FC<PillarChartProps> = ({ type, data, unit }) => {
  if (type === 'none' || !data || data.length < 2) {
    return null
  }

  const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
  const xAxis = (
    <XAxis
      dataKey="label"
      stroke="currentColor"
      className="text-[10px] text-muted-foreground fill-current"
      tickLine={false}
      axisLine={false}
      dy={4}
    />
  )
  const yAxis = (
    <YAxis
      stroke="currentColor"
      className="text-[10px] text-muted-foreground fill-current"
      tickLine={false}
      axisLine={false}
      dx={-4}
      domain={['auto', 'auto']}
    />
  )

  const tooltipSingle = (
    <Tooltip
      contentStyle={{
        backgroundColor: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border))',
        borderRadius: '0.75rem',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
      formatter={(val: any) => [`${val} ${unit || ''}`, 'Valor']}
      labelFormatter={(label) => `Data: ${label}`}
    />
  )

  const tooltipDual = (
    <Tooltip
      contentStyle={{
        backgroundColor: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border))',
        borderRadius: '0.75rem',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
      formatter={(val: any, name: any) => [
        `${val} mmHg`,
        name === 'sys' ? 'Sistólica' : 'Diastólica',
      ]}
      labelFormatter={(label) => `Data: ${label}`}
    />
  )

  return (
    <div className="w-full h-44 mt-3 pt-2 pb-1">
      {type === 'dualLine' && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltipDual}
            <Line
              type="monotone"
              dataKey="sys"
              name="sys"
              stroke="#059669"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#059669' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="dia"
              name="dia"
              stroke="#0d9488"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#0d9488' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {type === 'line' && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltipSingle}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#059669"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#059669' }}
              activeDot={{ r: 5.5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {type === 'bars' && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltipSingle}
            <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
