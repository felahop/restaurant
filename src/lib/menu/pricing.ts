/**
 * Проверка выбора добавок и цена порции. Один и тот же код работает в браузере (подсказки и цена)
 * и на сервере (расчёт заказа по ценам из базы, этап 4).
 */
import type { MenuModifierGroup } from "./types";

export type ChosenModifier = { id: string; name: string; price: number; groupId: string; groupName: string };

export type SelectionResult =
  { ok: true; modifiers: ChosenModifier[] } | { ok: false; errors: { groupId: string | null; message: string }[] };

export function validateModifierSelection(
  groups: MenuModifierGroup[],
  selectedIds: readonly string[],
): SelectionResult {
  const errors: { groupId: string | null; message: string }[] = [];
  const unique = [...new Set(selectedIds)];
  if (unique.length !== selectedIds.length) {
    errors.push({ groupId: null, message: "Добавка выбрана дважды" });
  }

  const index = new Map<string, { group: MenuModifierGroup; modifier: MenuModifierGroup["modifiers"][number] }>();
  for (const group of groups) for (const modifier of group.modifiers) index.set(modifier.id, { group, modifier });

  const chosen: ChosenModifier[] = [];
  for (const id of unique) {
    const hit = index.get(id);
    if (!hit) {
      errors.push({ groupId: null, message: "Такой добавки нет у этого блюда" });
      continue;
    }
    if (!hit.modifier.isAvailable) {
      errors.push({ groupId: hit.group.id, message: `«${hit.modifier.name}» сейчас нет` });
      continue;
    }
    chosen.push({
      id,
      name: hit.modifier.name,
      price: hit.modifier.price,
      groupId: hit.group.id,
      groupName: hit.group.name,
    });
  }

  for (const group of groups) {
    const count = chosen.filter((m) => m.groupId === group.id).length;
    if (count < group.minSelect) {
      errors.push({
        groupId: group.id,
        message:
          group.minSelect === 1 ? `Выберите: ${group.name.toLowerCase()}` : `Выберите не меньше ${group.minSelect}`,
      });
    }
    if (count > group.maxSelect) {
      errors.push({ groupId: group.id, message: `Можно выбрать не больше ${group.maxSelect}` });
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, modifiers: chosen };
}

export function unitPrice(basePrice: number, modifiers: readonly { price: number }[]): number {
  return modifiers.reduce((sum, m) => sum + m.price, basePrice);
}

/** Подсказка о правилах группы для интерфейса. */
export function groupRuleHint(group: Pick<MenuModifierGroup, "minSelect" | "maxSelect">): string {
  const { minSelect, maxSelect } = group;
  if (minSelect >= 1 && maxSelect === 1) return "Выберите один вариант";
  if (minSelect >= 1) return `Обязательно, до ${maxSelect}`;
  if (maxSelect === 1) return "По желанию";
  return `По желанию, до ${maxSelect}`;
}

/** Блюдо требует выбора, если хотя бы одна группа обязательна. */
export function requiresChoice(groups: readonly Pick<MenuModifierGroup, "minSelect">[]): boolean {
  return groups.some((g) => g.minSelect > 0);
}

/** Выбор по умолчанию: в обязательных группах «один из» — первый доступный вариант. */
export function defaultSelection(groups: MenuModifierGroup[]): string[] {
  const ids: string[] = [];
  for (const g of groups) {
    if (g.minSelect >= 1 && g.maxSelect === 1) {
      const first = g.modifiers.find((m) => m.isAvailable);
      if (first) ids.push(first.id);
    }
  }
  return ids;
}
