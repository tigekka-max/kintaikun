import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabel } from "@/lib/month";

export function MonthNav({ basePath, month }: { basePath: string; month: string }) {
  return (
    <div className="month-nav" aria-label="対象月">
      <Link className="icon-button secondary" href={`${basePath}?month=${addMonths(month, -1)}`} aria-label="前月">
        <ChevronLeft size={18} />
      </Link>
      <strong>{monthLabel(month)}</strong>
      <Link className="icon-button secondary" href={`${basePath}?month=${addMonths(month, 1)}`} aria-label="次月">
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}
