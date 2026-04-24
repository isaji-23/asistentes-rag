import { clsx } from "clsx";

interface BadgeProps {
  status: "pending" | "indexed" | "failed";
  className?: string;
}

const statusConfig = {
  pending: {
    label: "Indexando",
    classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  indexed: {
    label: "Listo",
    classes: "bg-green-100 text-green-800 border-green-200",
  },
  failed: {
    label: "Error",
    classes: "bg-red-100 text-red-800 border-red-200",
  },
};

export function Badge({ status, className }: BadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        config.classes,
        className
      )}
    >
      {status === "pending" && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-yellow-500"
          style={{ animation: "pulse 1.5s ease-in-out infinite" }}
        />
      )}
      {config.label}
    </span>
  );
}
