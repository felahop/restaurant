/**
 * Позиции электронного чека (54-ФЗ) для онлайн-оплаты.
 * Правило ЮKassa: сумма позиций чека (цена × количество) должна совпадать с суммой платежа.
 * Скидка по промокоду и оплата бонусами распределяются по блюдам пропорционально их стоимости;
 * доставка идёт отдельной позицией без скидки. Деньги — в копейках.
 */

export type ReceiptSourceLine = { name: string; quantity: number; lineTotal: number };

export type ReceiptLine = {
  description: string;
  quantity: number;
  /** Цена за единицу, копейки. */
  unitPrice: number;
  kind: "dish" | "delivery";
};

const MAX_DESCRIPTION = 128;

/** Распределение суммы пропорционально весам методом наибольших остатков: сумма частей ровно равна target. */
export function distribute(target: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (target * w) / total);
  const parts = raw.map(Math.floor);
  let rest = target - parts.reduce((s, p) => s + p, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0) break;
    parts[i]! += 1;
    rest -= 1;
  }
  return parts;
}

export function buildReceiptLines(input: {
  lines: ReceiptSourceLine[];
  deliveryFee: number;
  /** Сумма платежа (итог заказа). */
  total: number;
}): ReceiptLine[] {
  const dishesTarget = input.total - input.deliveryFee;
  if (dishesTarget < 0) throw new Error("Итог меньше стоимости доставки — чек не собрать");
  const shares = distribute(
    dishesTarget,
    input.lines.map((l) => l.lineTotal),
  );
  const out: ReceiptLine[] = [];
  input.lines.forEach((l, idx) => {
    const lineSum = shares[idx]!;
    if (l.quantity <= 0 || lineSum <= 0) return;
    const description = l.name.slice(0, MAX_DESCRIPTION);
    const unit = Math.floor(lineSum / l.quantity);
    const rem = lineSum - unit * l.quantity;
    // Цена за единицу должна быть целой в копейках: остаток уходит в отдельную позицию из одной штуки.
    if (rem === 0) out.push({ description, quantity: l.quantity, unitPrice: unit, kind: "dish" });
    else {
      if (l.quantity > 1) out.push({ description, quantity: l.quantity - 1, unitPrice: unit, kind: "dish" });
      out.push({ description, quantity: 1, unitPrice: unit + rem, kind: "dish" });
    }
  });
  if (input.deliveryFee > 0) out.push({ description: "Доставка", quantity: 1, unitPrice: input.deliveryFee, kind: "delivery" });
  return out;
}

export function receiptSum(lines: ReceiptLine[]): number {
  return lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}
