import { themes } from "../app/styles";
import { useConfigStore } from "../stores/settings";
import { useMemo } from "react";

type ThemeName = keyof typeof themes;

export function useTheme() {
  const { theme: themeName, setTheme: setThemeStore } = useConfigStore();

  const current = useMemo(() => {
    const name = themeName as ThemeName;
    return themes[name] || themes.obsidian;
  }, [themeName]);

  const setTheme = (name: ThemeName) => {
    if (themes[name]) {
      setThemeStore(name);
    }
  };

  return {
    current,
    themeName: themeName as ThemeName,
    setTheme,
    themes,
  };
}
