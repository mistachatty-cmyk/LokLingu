import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PieData {
  label: string;
  value: number;
  color: string;
}

export function ProgressPie({ data, size = 280 }: { data: PieData[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as PieData;
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
              return (
                <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs font-mono">
                  <span style={{ color: d.color }}>{d.label}</span>: {d.value.toLocaleString()} ({pct}%)
                </div>
              );
            }}
          />
          {data.length > 0 && total > 0 && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold">
              {total.toLocaleString()}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3">
        {data.map((d) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={d.label} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground font-mono">
                {d.label}: <strong className="text-foreground">{pct}%</strong>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
