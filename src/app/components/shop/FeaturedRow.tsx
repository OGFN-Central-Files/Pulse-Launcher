"use client";

import { ShopItem } from "../../../vite-env";
import { BigFeaturedCard } from "./BigFeaturedCard";
import { useTheme } from "../../../hooks/useTheme";
import { themeAlpha } from "../../../util/color";

export function FeaturedRow({ items }: { items: ShopItem[] }) {
  const left = items[0];
  const middle = items[1];
  const colors = useTheme();

  return (
    <div
      className={`rounded-2xl border ${colors.current.border} backdrop-blur-xl p-4`}
      style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.6) }}
    >
      <div className="grid grid-cols-[2fr_2fr_1fr] max-w-lg gap-3 h-105">
        {left && <BigFeaturedCard item={left} />}

        {middle && <BigFeaturedCard item={middle} />}
      </div>
    </div>
  );
}
