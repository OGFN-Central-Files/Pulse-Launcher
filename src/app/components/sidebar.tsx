import {
  Home,
  Library,
  Settings,
  ShoppingCart,
  Trophy,
  Server,
  LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";
import { Config } from "../../util/config";
import { themeAlpha } from "../../util/color";

type NavId = "home" | "library" | "shop" | "status" | "leaderboard" | "settings";

type NavEntry = {
  id: NavId;
  path: string;
  icon: LucideIcon;
  label: string;
};

export function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<NavId | null>(null);
  const nav = useNavigate();
  const location = useLocation();
  const colors = useTheme();

  const navItems: NavEntry[] = [
    { id: "home", path: "/", icon: Home, label: "Home" },
    { id: "library", path: "/library", icon: Library, label: "Library" },
    { id: "shop", path: "/shop", icon: ShoppingCart, label: "Shop" },
    { id: "status", path: "/status", icon: Server, label: "Servers" },
  ];

  if (Config.LEADERBOARD_ENABLED) {
    navItems.push({
      id: "leaderboard",
      path: "/leaderboard",
      icon: Trophy,
      label: "Leaderboard",
    });
  }

  const bottomItems: NavEntry[] = [
    { id: "settings", path: "/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  function NavRow({ item }: { item: NavEntry }) {
    const Icon = item.icon;
    const active = isActive(item.path);
    const hovered = hoveredItem === item.id;
    const textClass = active || hovered ? colors.current.text.primary : colors.current.text.secondary;

    return (
      <button
        key={item.id}
        onClick={() => nav(item.path)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className="group relative w-full flex items-center justify-center py-2.5 rounded-xl cursor-pointer transition-[background-color,transform] duration-150 active:scale-95"
        style={{
          backgroundColor: active
            ? "rgba(255,255,255,0.07)"
            : hovered
              ? "rgba(255,255,255,0.04)"
              : "transparent",
        }}
        aria-label={item.label}
      >
        {active && (
          <motion.div
            layoutId="sidebarActive"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full"
            style={{ backgroundColor: colors.current.accent }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          />
        )}

        <Icon
          size={19}
          strokeWidth={2}
          className={`relative z-10 shrink-0 transition-colors duration-150 ${textClass}`}
          style={active ? { color: colors.current.accent } : undefined}
        />

        <div
          className={`absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border backdrop-blur-xl ${colors.current.border} z-50`}
          style={{ backgroundColor: themeAlpha(colors.current.background.primary, 0.9) }}
        >
          {item.label}
        </div>
      </button>
    );
  }

  return (
    <div
      className={`fixed left-0 top-12 bottom-0 w-18 border-r ${colors.current.border} backdrop-blur-xl flex flex-col z-40`}
      style={{ backgroundColor: themeAlpha(colors.current.background.primary, 0.55) }}
    >
      <nav className="flex flex-col gap-1.5 flex-1 px-2.5 pt-4">
        {navItems.map((item) => (
          <NavRow key={item.id} item={item} />
        ))}
      </nav>

      <div className={`flex flex-col gap-1.5 px-2.5 pb-2.5 border-t ${colors.current.border} pt-2.5`}>
        {bottomItems.map((item) => (
          <NavRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
