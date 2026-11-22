import { Config } from "../util/config";
import { ContentPagesResult } from "../vite-env";

const URL =
  import.meta.env.NODE_ENV === "development"
    ? "http://127.0.0.1:3551"
    : Config.BACKEND_URL;

export const BACKEND_BASE_URL = URL;

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        error: text || `Request failed: ${response.status}`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export const ENDPOINTS = {
  CONTENT_PAGES: "/content/api/pages/fortnite-game",
  SHOP: "/fortnite/api/storefront/v2/catalog",
  LOGIN: "/account/api/oauth/token",

  MCP_QUERY_PROFILE: "/fortnite/api/game/v2/profile",

  LEADERBOARD_STATSV2: "/fortnite/api/statsv2/leaderboards",
  LEADERBOARD_GLOBAL: "/fortnite/api/leaderboards/type/global/stat",

  DISCORD_AUTH: "/api/coral/auth/discord",
  DISCORD_SESSION: "/api/coral/auth/discord/session",
  AUTH_EXCHANGE: "/api/coral/auth/exchange",

  HYPE_LEADERBOARD: "/api/exlo/leaderboard/hype",
  NEWS: "/api/launcher/news",
  VERSION: "/api/launcher/version",
  GAMESERVER_LIST: "/api/coral/gameserver/list",
  PAKS: "/api/launcher/paks",
  MOBILE_PAKS: "/api/launcher/mobile-paks",
} as const;

export type GameServerEntry = {
  serverId: string;
  name: string;
  region: string;
  playlist: string;
  maxPlayers: number;
  playerCount: number;
  status: string;
  lastSeen: number;
  registeredAt: number;
};

export type HypeLeaderboardEntry = {
  id: number;
  username: string;
  hype: number;
  division: number;
  discordAvatar: string | null;
};

export type LauncherNewsItem = {
  type: string;
  title: string;
  message: string;
  image: string;
  date?: string;
};

export type LauncherVersionResult = {
  version: string | null;
  url?: string;
  size?: number;
};

export type DiscordSessionResult = {
  status: "pending" | "ok";
  account_id?: string;
  access_token?: string;
  displayName?: string;
};

export type ExchangeCodeResult = {
  code: string;
  exchangeCode: string;
  accountId: string;
  expiresInSeconds: number;
};

export const api = {
  getContentPages: () => request<ContentPagesResult>(ENDPOINTS.CONTENT_PAGES),

  getShopCatalog: () => request<any>(ENDPOINTS.SHOP),

  login: (email: string, password: string) =>
    request<any>(ENDPOINTS.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${email}:${password}`)}`,
      },
      body: `grant_type=password&username=${email}&password=${password}`,
    }),

  postQueryProfile: (
    accountId: string,
    profileId: "athena" | "common_core",
    token: string,
    rvn: number = -1,
  ) =>
    request<any>(
      `${ENDPOINTS.MCP_QUERY_PROFILE}/${accountId}/client/QueryProfile?profileId=${profileId}&rvn=${rvn}`,
      {
        method: "POST",
        headers: {
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    ),

  getStatsV2Leaderboard: (leaderboardName: string, maxSize: number = 100) =>
    request<{
      maxSize: number;
      entries: {
        displayName: string;
        account: string;
        value: number;
      }[];
    }>(
      `${ENDPOINTS.LEADERBOARD_STATSV2}/${leaderboardName}?maxSize=${maxSize}`,
    ),

  postGlobalLeaderboard: (
    leaderboardName: string,
    window: "alltime" | "weekly" | "daily" = "alltime",
  ) =>
    request<{
      statName: string;
      statWindow: string;
      entries: {
        accountId: string;
        displayName: string;
        rank: number;
        value: number;
      }[];
    }>(`${ENDPOINTS.LEADERBOARD_GLOBAL}/${leaderboardName}/window/${window}`, {
      method: "POST",
    }),

  getPaks: () =>
    request<{
      paks: {
        name: string;
        url: string;
        size: number;
      }[];
    }>("/api/launcher/paks"),

  getDiscordSession: (state: string) =>
    request<DiscordSessionResult>(
      `${ENDPOINTS.DISCORD_SESSION}?state=${encodeURIComponent(state)}`,
    ),

  getExchangeCode: (accessToken: string) =>
    request<ExchangeCodeResult>(ENDPOINTS.AUTH_EXCHANGE, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  getHypeLeaderboard: (limit = 100) =>
    request<{ leaderboard: HypeLeaderboardEntry[]; total: number }>(
      `${ENDPOINTS.HYPE_LEADERBOARD}?limit=${limit}`,
    ),

  getNews: () => request<{ news: LauncherNewsItem[] }>(ENDPOINTS.NEWS),

  getLauncherVersion: () =>
    request<LauncherVersionResult>(ENDPOINTS.VERSION),

  getServerList: () =>
    request<{ count: number; servers: GameServerEntry[] }>(
      ENDPOINTS.GAMESERVER_LIST,
    ),

  getMobilePaks: () =>
    request<{ paks: { name: string; url: string; size: number }[] }>(
      ENDPOINTS.MOBILE_PAKS,
    ),
};
