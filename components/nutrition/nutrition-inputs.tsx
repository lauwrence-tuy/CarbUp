export function NutritionPreview({
  calories,
  protein,
  carbs,
  fat
}: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2 rounded-[20px] bg-cds-layer p-3">
      <PreviewStat label="Kcal" value={calories.toLocaleString()} />
      <PreviewStat label="C" value={`${carbs}g`} />
      <PreviewStat label="P" value={`${protein}g`} />
      <PreviewStat label="F" value={`${fat}g`} />
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-cds-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

export function GramsInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <input
        className="min-h-11 w-full rounded-full border border-white/[0.06] bg-black/30 px-4 text-sm font-semibold text-white outline-none placeholder:text-cds-text-helper focus:border-cds-interactive"
        inputMode="numeric"
        min={0}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        type="number"
        value={value}
      />
    </label>
  );
}
