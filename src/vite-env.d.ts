/// <reference types="vite/client" />

export type ContentPagesResult = {
  battleroyalenewsv2?: {
    news: {
      motds: Array<{
        id: string;
        image: string;
        title: string;
        body: string;
        hidden: bool;
      }>;
    };
  };
};

export type Build = {
  path: string;
  splash?: string | null;
  open: boolean;
  enabled: boolean;
  version: string;
  season: string;
};

export type LibraryState = {
  build: Build[];
  addItem: (item: Build) => void;
  removeItem: (path: string) => void;
  toggleOpen: (path: string) => void;
  toggleEnabled: (path: string) => void;
  clearLibrary: () => void;
};

export type Profile = {
  accountId: string | null;
  displayName: string | null;
  email: string | null;
  password: string | null;
  hydrated: boolean;
  setProfile: (profile: {
    accountId?: string | null;
    displayName?: string | null;
    email: string | null;
    password: string | null;
    accessToken: string;
  }) => void;
  clearProfile: () => void;
  login: (profile: {
    accountId: string;
    displayName: string;
    email: string | null;
    password: string | null;
    accessToken: string;
  }) => void;
  logout: () => void;
  setHydrated: () => void;
  accessToken: string;
};

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  images: {
    featured?: string;
    icon: string;
  };
  rarity: {
    value: string;
    displayValue: string;
  };
};

export type View = "home" | "library" | "shop" | "settings";

export type ConfigState = {
  minimizeOnLaunch: boolean;
  theme: string;

  editOnRelease: boolean;

  disablePreEdits: boolean;
  resetOnRelease: boolean;
  alwaysOnTop: boolean;
  mobileBuilds: boolean;

  reduceMotion: boolean;

  setMobileBuilds: (value: boolean) => void;
  setResetOnRelease: (value: boolean) => void;
  setDisablePreEdits: (value: boolean) => void;
  setEditOnRelease: (value: boolean) => void;
  setAlwaysOnTop: (value: boolean) => void;
  setMinimizeOnLaunch: (value: boolean) => void;
  toggleMinimizeOnLaunch: () => void;
  setTheme: (theme: string) => void;

  setReduceMotion: (value: boolean) => void;
};

export type Theme = {
  background: {
    primary: string;
    secondary: string;
  };

  text: {
    primary: string;
    secondary: string;
  };

  button: {
    base: string;
    hover: string;
    active: string;
  };

  border: string;

  gradient: {
    from: string;
    to: string;
  };

  /** Signature hex color used for glows, focus rings, and primary buttons. */
  accent: string;
};
