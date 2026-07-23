import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

interface RadarMetric {
  key: string;
  label: string;
}

interface RadarDataItem {
  label: string;
  color: string;
  values: Record<string, number>;
}

export function LanguageRadar({
  data,
  metrics,
  size = 400,
}: {
  data: RadarDataItem[];
  metrics: RadarMetric[];
  size?: number;
}) {
  const chartData = metrics.map((m) => {
    const entry: Record<string, string | number> = { metric: m.label };
    for (const item of data) {
      entry[item.label] = item.values[m.key] ?? 0;
    }
    return entry;
  });

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={size} height={size}>
        <RechartsRadar data={chartData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
          />
          {data.map((item) => (
            <Radar
              key={item.label}
              name={item.label}
              dataKey={item.label}
              stroke={item.color}
              fill={item.color}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
