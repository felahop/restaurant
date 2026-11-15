/** Индикатор при переходе между разделами админки. */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Загружаем">
      <div className="h-5 w-30 animate-pulse rounded-sm bg-surface-2" />
      <div className="h-30 animate-pulse rounded-card bg-surface" />
    </div>
  );
}
