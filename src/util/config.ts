type Config = {
  NAME: string;
  VERSION: string;
  BACKEND_URL: string;
  CURRENT_SEASON: number;
  CURRENT_VERSION: string;
  ALLOW_ALL_VERSIONS: boolean;
  DISCORD_LINK: string;
  LEADERBOARD_ENABLED: boolean;
  DONATE_LINK: string;
  LAUNCH_OPTIONS: {
    REDIRECT_DOWNLOAD: string;
    DOWNLOAD_PAKS: boolean;
    PAK_LINKS?: string[];

    DOWNLOAD_EXTRA_DLLS: boolean;
    DLL_LINKS?: string[];
  };
};

export const Config: Config = {
  NAME: "Pulse",
  VERSION: "8.0.1",
  BACKEND_URL: "http://pulsefn.de:2603",
  CURRENT_SEASON: 10,
  CURRENT_VERSION: "10.40",
  ALLOW_ALL_VERSIONS: false, // for importing it wont let u launch
  DISCORD_LINK: "https://discord.gg/VJRaGjAg",
  LEADERBOARD_ENABLED: true, // Arena Hype leaderboard, served by exloBackend (/api/exlo/leaderboard/hype)
  DONATE_LINK: "",
  LAUNCH_OPTIONS: {
    REDIRECT_DOWNLOAD:
      "https://ttttttttttttttttttttttttttttttttttt.vercel.app/Tellurium.dll", // if u dont know what this is, leave it AS IS...
    // Optional client-side pak/DLL links. Left empty in the public source — the
    // real, required game paks are served by the backend (/api/launcher/paks),
    // not hardcoded here. Set these only if you enable the flags above.
    DOWNLOAD_PAKS: false,
    PAK_LINKS: [],
    DOWNLOAD_EXTRA_DLLS: false,
    DLL_LINKS: [],
  },
};
