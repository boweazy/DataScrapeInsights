import { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AnimatedStatsCardProps {
  title: string;
  value: number | string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  iconColor?: string;
  suffix?: string;
  prefix?: string;
  loading?: boolean;
}

export default function AnimatedStatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-[#FFD700]',
  suffix = '',
  prefix = '',
  loading = false,
}: AnimatedStatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Animate number counting
  useEffect(() => {
    if (loading || typeof value !== 'number') return;

    const duration = 1000; // 1 second
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, loading]);

  const formattedValue = typeof value === 'number'
    ? displayValue.toLocaleString()
    : value;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative overflow-hidden
        bg-[#0D0D0D]/80 backdrop-blur-sm
        border-2 border-[#FFD700]/20
        rounded-xl p-6
        transition-all duration-300
        ${isHovered ? 'border-[#FFD700]/50 shadow-2xl shadow-[#FFD700]/20 scale-105' : 'shadow-lg'}
        group
      `}
    >
      {/* Animated background glow */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 via-transparent to-transparent
          transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
      />

      {/* Floating particles effect on hover */}
      {isHovered && (
        <>
          <div className="absolute top-2 right-2 w-1 h-1 bg-[#FFD700]/60 rounded-full animate-ping" />
          <div className="absolute top-4 right-8 w-1 h-1 bg-[#FFD700]/40 rounded-full animate-ping delay-100" />
          <div className="absolute top-6 right-14 w-1 h-1 bg-[#FFD700]/30 rounded-full animate-ping delay-200" />
        </>
      )}

      <div className="relative">
        {/* Header with icon */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#F5F5DC]/70 text-sm font-medium uppercase tracking-wider">
            {title}
          </h3>
          <div
            className={`
              p-2.5 rounded-lg
              bg-[#FFD700]/10
              transition-all duration-300
              ${isHovered ? 'bg-[#FFD700]/20 rotate-12 scale-110' : ''}
            `}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>

        {/* Value */}
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-8 w-32 bg-[#3B2F2F] rounded"></div>
            <div className="h-4 w-24 bg-[#3B2F2F]/60 rounded"></div>
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-[#F5F5DC] mb-2 font-mono">
              {prefix}{formattedValue}{suffix}
            </div>

            {/* Change indicator */}
            {change && (
              <div className="flex items-center gap-1">
                {change.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    change.isPositive ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {change.isPositive ? '+' : ''}{change.value}%
                </span>
                <span className="text-[#F5F5DC]/50 text-sm ml-1">vs last period</span>
              </div>
            )}
          </>
        )}

        {/* Bottom border glow effect */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 h-0.5
            bg-gradient-to-r from-transparent via-[#FFD700] to-transparent
            transition-opacity duration-300
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        />
      </div>
    </div>
  );
}

// Mini Stats Card for smaller spaces
export function MiniStatsCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        flex items-center gap-3 p-3
        bg-[#0D0D0D]/60 border border-[#3B2F2F]/50
        rounded-lg transition-all duration-200
        ${isHovered ? 'border-[#FFD700]/30 bg-[#0D0D0D]/80' : ''}
      `}
    >
      <div
        className={`
          p-2 rounded-lg bg-[#FFD700]/10
          transition-transform duration-200
          ${isHovered ? 'scale-110' : ''}
        `}
      >
        <Icon className="w-4 h-4 text-[#FFD700]" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-[#F5F5DC]/60 uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold text-[#F5F5DC] font-mono">{value}</div>
      </div>
    </div>
  );
}

// Sparkline mini chart for trend visualization
export function SparklineStats({
  label,
  value,
  data,
  change,
}: {
  label: string;
  value: number;
  data: number[];
  change: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="bg-[#0D0D0D]/60 border border-[#3B2F2F]/50 rounded-lg p-4 hover:border-[#FFD700]/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-[#F5F5DC]/60 uppercase tracking-wider mb-1">
            {label}
          </div>
          <div className="text-2xl font-bold text-[#F5F5DC] font-mono">
            {value.toLocaleString()}
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold ${
            change >= 0
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {change >= 0 ? '+' : ''}{change}%
        </span>
      </div>

      {/* Sparkline */}
      <div className="flex items-end h-8 gap-0.5">
        {data.map((point, i) => {
          const height = ((point - min) / range) * 100;
          return (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-[#FFD700]/50 to-[#FFD700]/20 rounded-t transition-all duration-300 hover:from-[#FFD700]/80 hover:to-[#FFD700]/40"
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
