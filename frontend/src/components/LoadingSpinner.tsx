export default function LoadingSpinner({ label = '読み込み中...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
