import { Scale } from "lucide-react";

export function WeightTrendCard() {
  return (
    <article className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-app-hover">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#8b7cf6] text-white">
            <Scale className="size-6" aria-hidden="true" />
          </span>
          <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
            Weight trend
          </h2>
        </div>
        <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-bold text-app-secondary">
          7d
        </span>
      </div>
      <p className="mt-7 text-2xl font-bold tracking-[-0.03em] text-white">
        Holding steady
      </p>
      <p className="mt-2 text-base leading-6 text-app-secondary">
        Your target is balanced for current training load.
      </p>
      <div className="mt-6 flex items-end gap-2">
        {[34, 48, 42, 56, 52, 64, 60].map((height, index) => (
          <span
            key={index}
            className={`flex-1 rounded-full ${
              index === 6 ? "bg-app-green" : "bg-white/[0.10]"
            }`}
            style={{ height }}
          />
        ))}
      </div>
    </article>
  );
}
