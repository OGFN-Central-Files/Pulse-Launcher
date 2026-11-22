import { useEffect, useState } from "react";
import axios from "axios";
import { Config } from "../util/config";
import { ShopItem } from "../vite-env";

export function useShopItems() {
  const [featured, setFeatured] = useState<ShopItem[]>([]);
  const [daily, setDaily] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [expiration, setExpiration] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(
          `${Config.BACKEND_URL}/fortnite/api/storefront/v2/catalog`,
        );

        const json = res.data;

        const dailyEntries =
          json.storefronts.find((s: any) => s.name === "BRDailyStorefront")
            ?.catalogEntries || [];

        const featuredEntries =
          json.storefronts.find((s: any) => s.name === "BRWeeklyStorefront")
            ?.catalogEntries || [];

        const loadItems = async (entries: any[]) => {
          const items: ShopItem[] = [];

          for (const entry of entries) {
            const id = entry.itemGrants?.[0]?.templateId?.split(":")[1];
            if (!id) continue;

            const price = entry.prices?.[0]?.finalPrice ?? 0;

            const res = await fetch(
              `https://fortnite-api.com/v2/cosmetics/br/${id}`,
            );
            const data = await res.json();
            if (data.status !== 200) continue;

            setExpiration(json.expiration);

            items.push({
              id: data.data.id,
              name: data.data.name,
              description: data.data.description,
              price,
              images: data.data.images,
              rarity: data.data.rarity,
            });
          }

          return items;
        };

        setFeatured(await loadItems(featuredEntries));
        setDaily(await loadItems(dailyEntries));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { featured, daily, loading, expiration };
}
