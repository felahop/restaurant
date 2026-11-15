"use client";

import { setReservationStatusAction } from "@/app/admin/(panel)/reservations/actions";
import { StatusSelect } from "./StatusSelect";

const OPTIONS = [
  { value: "NEW", label: "Новая" },
  { value: "CONFIRMED", label: "Подтверждена" },
  { value: "COMPLETED", label: "Гости пришли" },
  { value: "CANCELED", label: "Отменена" },
];

export function ReservationStatus({ id, status, label }: { id: string; status: string; label: string }) {
  return <StatusSelect value={status} options={OPTIONS} label={label} onSave={(next) => setReservationStatusAction(id, next)} />;
}
