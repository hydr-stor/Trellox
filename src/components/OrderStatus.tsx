import { orderStatuses } from "../../shared/brand";
import type { Order } from "../types";

export function Status({ status }: { status: Order["status"] }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {orderStatuses[status]}
    </span>
  );
}
