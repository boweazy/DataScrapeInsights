import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';

export type ProgressStatus = 'pending' | 'inProgress' | 'completed' | 'failed';

interface ProgressStep {
  id: string;
  label: string;
  status: ProgressStatus;
  message?: string;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: number;
  title?: string;
}

export default function ProgressIndicator({
  steps,
  currentStep = 0,
  title,
}: ProgressIndicatorProps) {
  return (
    <div className="bg-[#0D0D0D]/80 border-2 border-[#FFD700]/20 rounded-lg p-6">
      {title && (
        <h3 className="text-lg font-semibold text-[#F5F5DC] mb-6">{title}</h3>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Connection line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  absolute left-5 top-11 w-0.5 h-full
                  ${
                    step.status === 'completed'
                      ? 'bg-[#FFD700]'
                      : 'bg-[#3B2F2F]'
                  }
                `}
              />
            )}

            {/* Step container */}
            <div className="flex items-start gap-4">
              {/* Status icon */}
              <div className="relative flex-shrink-0">
                {step.status === 'completed' && (
                  <div className="w-10 h-10 rounded-full bg-[#FFD700] flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#0D0D0D]" />
                  </div>
                )}

                {step.status === 'inProgress' && (
                  <div className="w-10 h-10 rounded-full border-2 border-[#FFD700] bg-[#FFD700]/10 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-5 h-5 text-[#FFD700] animate-spin" />
                  </div>
                )}

                {step.status === 'failed' && (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                )}

                {step.status === 'pending' && (
                  <div className="w-10 h-10 rounded-full bg-[#3B2F2F] border-2 border-[#3B2F2F] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#F5F5DC]/40" />
                  </div>
                )}

                {/* Pulsing ring for active step */}
                {step.status === 'inProgress' && (
                  <span className="absolute inset-0 flex">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-30" />
                  </span>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`font-medium ${
                      step.status === 'completed'
                        ? 'text-[#F5F5DC]'
                        : step.status === 'inProgress'
                        ? 'text-[#FFD700]'
                        : step.status === 'failed'
                        ? 'text-red-400'
                        : 'text-[#F5F5DC]/50'
                    }`}
                  >
                    {step.label}
                  </h4>

                  {/* Status badge */}
                  <span
                    className={`
                      px-2 py-0.5 rounded text-xs font-semibold
                      ${
                        step.status === 'completed'
                          ? 'bg-[#FFD700]/20 text-[#FFD700]'
                          : step.status === 'inProgress'
                          ? 'bg-[#FFD700]/20 text-[#FFD700]'
                          : step.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-[#3B2F2F] text-[#F5F5DC]/50'
                      }
                    `}
                  >
                    {step.status === 'completed' && 'Done'}
                    {step.status === 'inProgress' && 'In Progress'}
                    {step.status === 'failed' && 'Failed'}
                    {step.status === 'pending' && 'Pending'}
                  </span>
                </div>

                {/* Optional message */}
                {step.message && (
                  <p className="text-sm text-[#F5F5DC]/60 mt-1">{step.message}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple linear progress bar
export function LinearProgress({
  value,
  max = 100,
  label,
  showPercentage = true,
}: {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
}) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-[#F5F5DC]/70">{label}</span>}
          {showPercentage && (
            <span className="text-[#FFD700] font-semibold font-mono">{percentage}%</span>
          )}
        </div>
      )}

      <div className="w-full h-2 bg-[#3B2F2F] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#FFD700] to-[#E6C200] rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${percentage}%` }}
        >
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

// Circular progress (donut chart style)
export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const percentage = (value / max) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#3B2F2F"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#goldGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#E6C200" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-[#FFD700] font-mono">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      {label && <span className="text-sm text-[#F5F5DC]/70">{label}</span>}
    </div>
  );
}

// Loading dots animation
export function LoadingDots({ text = 'Loading' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-[#F5F5DC]/70">
      <span>{text}</span>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
