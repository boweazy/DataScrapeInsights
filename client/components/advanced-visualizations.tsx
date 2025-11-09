import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useEffect, useRef } from 'react';

// Heatmap Component
export function HeatmapChart({ data, title = 'Activity Heatmap' }: { data: any; title?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellWidth = width / (data[0]?.length || 7);
    const cellHeight = height / (data.length || 24);

    // Find max value for color scaling
    const maxValue = Math.max(...data.flat());

    // Draw heatmap
    data.forEach((row: number[], rowIndex: number) => {
      row.forEach((value: number, colIndex: number) => {
        const intensity = value / maxValue;
        const hue = 45; // Gold color
        const lightness = 80 - intensity * 60; // Darker = more intense

        ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
        ctx.fillRect(
          colIndex * cellWidth,
          rowIndex * cellHeight,
          cellWidth - 2,
          cellHeight - 2
        );

        // Add value text
        if (value > 0) {
          ctx.fillStyle = intensity > 0.5 ? '#fff' : '#1a1a2e';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            value.toString(),
            colIndex * cellWidth + cellWidth / 2,
            rowIndex * cellHeight + cellHeight / 2
          );
        }
      });
    });

  }, [data]);

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        <CardDescription>24-hour activity pattern by day of week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <canvas ref={canvasRef} width={700} height={480} className="max-w-full" />
        </div>
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-400">Mon</span>
          <span className="text-gray-400">Tue</span>
          <span className="text-gray-400">Wed</span>
          <span className="text-gray-400">Thu</span>
          <span className="text-gray-400">Fri</span>
          <span className="text-gray-400">Sat</span>
          <span className="text-gray-400">Sun</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Gauge Chart Component
export function GaugeChart({
  value,
  max = 100,
  title = 'Performance Score',
  description,
}: {
  value: number;
  max?: number;
  title?: string;
  description?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 30;
    const radius = 100;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#2d2d44';
    ctx.stroke();

    // Calculate angle based on value
    const percentage = value / max;
    const angle = Math.PI + percentage * Math.PI;

    // Draw value arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, angle);
    ctx.lineWidth = 20;

    // Color based on value
    const gradient = ctx.createLinearGradient(centerX - radius, 0, centerX + radius, 0);
    if (percentage < 0.5) {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#f59e0b');
    } else if (percentage < 0.75) {
      gradient.addColorStop(0, '#f59e0b');
      gradient.addColorStop(1, '#FFD700');
    } else {
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(1, '#10b981');
    }

    ctx.strokeStyle = gradient;
    ctx.stroke();

    // Draw value text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value.toString(), centerX, centerY - 10);

    // Draw max text
    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.fillText(`/ ${max}`, centerX, centerY + 20);

  }, [value, max]);

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <canvas ref={canvasRef} width={300} height={200} />
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-400">
            {((value / max) * 100).toFixed(1)}% of maximum
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Funnel Chart Component
export function FunnelChart({
  data,
  title = 'Conversion Funnel',
}: {
  data: Array<{ stage: string; value: number; color?: string }>;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const maxValue = Math.max(...data.map(d => d.value));
    const stageHeight = (height - (data.length - 1) * 10) / data.length;

    ctx.clearRect(0, 0, width, height);

    data.forEach((stage, index) => {
      const percentage = stage.value / maxValue;
      const barWidth = width * 0.8 * percentage;
      const x = (width - barWidth) / 2;
      const y = index * (stageHeight + 10);

      // Draw funnel segment
      const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
      gradient.addColorStop(0, stage.color || '#FFD700');
      gradient.addColorStop(1, stage.color || '#00D9FF');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + barWidth, y);
      ctx.lineTo(x + barWidth * 0.9, y + stageHeight);
      ctx.lineTo(x + barWidth * 0.1, y + stageHeight);
      ctx.closePath();
      ctx.fill();

      // Draw text
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stage.stage, width / 2, y + stageHeight / 2);

      // Draw value
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(stage.value.toLocaleString(), width / 2, y + stageHeight / 2 + 20);
    });

  }, [data]);

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        <CardDescription>Step-by-step conversion analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <canvas ref={canvasRef} width={400} height={400} className="mx-auto" />
        <div className="mt-4 space-y-2">
          {data.map((stage, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-400">{stage.stage}</span>
              <span className="text-white font-semibold">
                {((stage.value / data[0].value) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Tree Map Component
export function TreeMapChart({
  data,
  title = 'Data Distribution',
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const total = data.reduce((sum, item) => sum + item.value, 0);

    ctx.clearRect(0, 0, width, height);

    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    const colors = ['#FFD700', '#00D9FF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    data.forEach((item, index) => {
      const area = (item.value / total) * width * height;
      const rectWidth = Math.min(area / 100, width - currentX);
      const rectHeight = Math.min(100, height - currentY);

      ctx.fillStyle = item.color || colors[index % colors.length];
      ctx.fillRect(currentX, currentY, rectWidth, rectHeight);

      // Draw border
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.strokeRect(currentX, currentY, rectWidth, rectHeight);

      // Draw label if space allows
      if (rectWidth > 60 && rectHeight > 40) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          item.label,
          currentX + rectWidth / 2,
          currentY + rectHeight / 2 - 10
        );
        ctx.font = '10px sans-serif';
        ctx.fillText(
          item.value.toLocaleString(),
          currentX + rectWidth / 2,
          currentY + rectHeight / 2 + 10
        );
      }

      currentX += rectWidth;
      rowHeight = Math.max(rowHeight, rectHeight);

      if (currentX >= width - 20) {
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }
    });

  }, [data]);

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        <CardDescription>Hierarchical data visualization</CardDescription>
      </CardHeader>
      <CardContent>
        <canvas ref={canvasRef} width={600} height={400} className="mx-auto" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.slice(0, 6).map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{
                  backgroundColor: item.color || ['#FFD700', '#00D9FF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 6]
                }}
              />
              <span className="text-gray-400">{item.label}</span>
              <span className="text-white ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Sparkline Component
export function SparklineChart({
  data,
  color = '#FFD700',
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1 || 1);

    ctx.clearRect(0, 0, width, height);

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    data.forEach((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * (height - 10) - 5;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw area
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fill();

  }, [data, color, height]);

  return <canvas ref={canvasRef} width={200} height={height} className="w-full" />;
}
