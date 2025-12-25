import Image from "next/image";

export default function CarCard({ car, onReserve, showReserve }) {
  return (
    <div className="gradient-card rounded-3xl p-5 shadow-card">
      <div className="relative mb-4 h-40 overflow-hidden rounded-2xl">
        <Image
          src={car.image_url || "/placeholder.svg"}
          alt={car.model}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl">{car.model}</h3>
          <p className="text-sm text-ink/70">
            {car.seats} seter • {car.transmission} • {car.fuel}
          </p>
          {car.isUnavailable && (
            <p className="mt-1 text-xs uppercase tracking-wide text-coral">Opptatt i valgt periode</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{car.daily_price} kr</p>
          <p className="text-xs uppercase tracking-wide text-ink/60">Per dag</p>
        </div>
      </div>
      {showReserve && (
        <button
          onClick={() => onReserve(car)}
          disabled={!car.active || car.isUnavailable}
          className="mt-4 w-full rounded-full bg-tide px-4 py-2 text-sm uppercase tracking-wide text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/40"
        >
          Reserver bil
        </button>
      )}
    </div>
  );
}
