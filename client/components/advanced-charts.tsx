import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler } from 'chart.js';
import { Doughnut, Line, Bar, Pie } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Filler
);

// SFS Theme colors
const SFS_COLORS = {
  primary: '#FFD700',
  secondary: '#1a1a2e',
  accent: '#00D9FF',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

interface ChartProps {
  data: any;
  title?: string;
  description?: string;
}

// Advanced Doughnut Chart for data distribution
export function DataDistributionChart({ data, title = 'Data Distribution', description }: ChartProps) {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label: 'Distribution',
        data: data.values || [],
        backgroundColor: [
          SFS_COLORS.primary,
          SFS_COLORS.accent,
          SFS_COLORS.success,
          SFS_COLORS.warning,
          SFS_COLORS.error,
          SFS_COLORS.info,
        ],
        borderColor: SFS_COLORS.secondary,
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#fff',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: SFS_COLORS.secondary,
        titleColor: SFS_COLORS.primary,
        bodyColor: '#fff',
        borderColor: SFS_COLORS.primary,
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Doughnut data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

// Advanced Line Chart for trends
export function TrendLineChart({ data, title = 'Trend Analysis', description }: ChartProps) {
  const chartData = {
    labels: data.labels || [],
    datasets: (data.datasets || []).map((dataset: any, index: number) => ({
      label: dataset.label,
      data: dataset.data,
      borderColor: dataset.color || [SFS_COLORS.primary, SFS_COLORS.accent, SFS_COLORS.success][index],
      backgroundColor: dataset.fill
        ? `${dataset.color || [SFS_COLORS.primary, SFS_COLORS.accent, SFS_COLORS.success][index]}33`
        : 'transparent',
      fill: dataset.fill || false,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: dataset.color || [SFS_COLORS.primary, SFS_COLORS.accent, SFS_COLORS.success][index],
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff',
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: SFS_COLORS.secondary,
        titleColor: SFS_COLORS.primary,
        bodyColor: '#fff',
        borderColor: SFS_COLORS.primary,
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#fff',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#fff',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

// Advanced Bar Chart for comparisons
export function ComparisonBarChart({ data, title = 'Comparison Analysis', description }: ChartProps) {
  const chartData = {
    labels: data.labels || [],
    datasets: (data.datasets || []).map((dataset: any, index: number) => ({
      label: dataset.label,
      data: dataset.data,
      backgroundColor: dataset.color || [SFS_COLORS.primary, SFS_COLORS.accent, SFS_COLORS.success][index],
      borderColor: dataset.color || [SFS_COLORS.primary, SFS_COLORS.accent, SFS_COLORS.success][index],
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff',
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: SFS_COLORS.secondary,
        titleColor: SFS_COLORS.primary,
        bodyColor: '#fff',
        borderColor: SFS_COLORS.primary,
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#fff',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#fff',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

// Sentiment Analysis Pie Chart
export function SentimentPieChart({ data, title = 'Sentiment Analysis', description }: ChartProps) {
  const chartData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        label: 'Sentiment Distribution',
        data: [data.positive || 0, data.neutral || 0, data.negative || 0],
        backgroundColor: [SFS_COLORS.success, SFS_COLORS.info, SFS_COLORS.error],
        borderColor: SFS_COLORS.secondary,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#fff',
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: SFS_COLORS.secondary,
        titleColor: SFS_COLORS.primary,
        bodyColor: '#fff',
        borderColor: SFS_COLORS.primary,
        borderWidth: 1,
        padding: 12,
      },
    },
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Pie data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

// Real-time Activity Chart
export function RealTimeActivityChart({ data, title = 'Real-Time Activity', description }: ChartProps) {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label: 'Activity',
        data: data.values || [],
        borderColor: SFS_COLORS.accent,
        backgroundColor: `${SFS_COLORS.accent}33`,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: SFS_COLORS.secondary,
        titleColor: SFS_COLORS.primary,
        bodyColor: '#fff',
        borderColor: SFS_COLORS.primary,
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#fff',
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#fff',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
