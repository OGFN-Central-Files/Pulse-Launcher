"use client";

import { ShopItem } from "../../../vite-env";
import { SmallShopCard } from "./SmallShopCard";
import { useTheme } from "../../../hooks/useTheme";
import { themeAlpha } from "../../../util/color";

export function DailyGrid({ items }: { items: ShopItem[] }) {
  const colors = useTheme();

  return (
    <div
      className={`rounded-2xl border ${colors.current.border} backdrop-blur-xl p-4`}
      style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.6) }}
    >
      <div className="grid grid-cols-3 gap-3 max-w-3xl">
        {items.map((item) => (
          <SmallShopCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
