interface Props {
  completed: number;
  total: number;
  size?: number;
}

export default function ProgressRing({ completed, total, size = 80 }: Props) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#7F77DD"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-800 leading-none">{pct}%</span>
        <span className="text-xs text-gray-400 leading-none mt-0.5">{completed}/{total}</span>
      </div>
    </div>
  );
}
