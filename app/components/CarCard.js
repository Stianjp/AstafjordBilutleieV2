import Image from "next/image";

function SeatsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 19a5 5 0 0 1 10 0M18 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 19a4 4 0 0 1 8 0" />
    </svg>
  );
}

function TransmissionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M7 7h10M7 17h10M7 12h4" />
      <circle cx="7" cy="7" r="2.1" />
      <circle cx="17" cy="7" r="2.1" />
      <circle cx="17" cy="17" r="2.1" />
      <circle cx="7" cy="17" r="2.1" />
    </svg>
  );
}

function FuelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h4M15 8h2l2 2v6a2 2 0 1 1-4 0v-3" />
    </svg>
  );
}

export default function CarCard({ car, onReserve, showReserve }) {
  return (
    <div className="group gradient-card rounded-3xl p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative mb-4 h-40 overflow-hidden rounded-2xl">
        <Image
          src={car.image_url || "/placeholder.svg"}
          alt={car.model}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl">{car.model}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/70">
            <span className="inline-flex items-center gap-1.5">
              <SeatsIcon />
              <span>{car.seats} seter</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TransmissionIcon />
              <span>{car.transmission}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FuelIcon />
              <span>{car.fuel}</span>
            </span>
          </div>
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
