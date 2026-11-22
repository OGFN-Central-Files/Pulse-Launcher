import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

type FortniteProfile = {
  rvn: number;
  commandRevision: number;
  stats: any;
  items: Record<string, any>;
};

type ProfileStore = {
  hydrated: boolean;
  profiles: Record<string, FortniteProfile>;

  setHydrated: () => void;
  setProfile: (profileId: string, profile: FortniteProfile) => void;
  clearProfiles: () => void;

  fetchProfile: (
    accountId: string,
    profileId: "athena" | "common_core",
    token: string,
  ) => Promise<void>;

  getFavoriteCharacter: () => string | null;
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profiles: {},

      setHydrated: () => set({ hydrated: true }),

      setProfile: (profileId, profile) =>
        set((state) => ({
          profiles: {
            ...state.profiles,
            [profileId]: profile,
          },
        })),

      clearProfiles: () => set({ profiles: {} }),

      fetchProfile: async (accountId, profileId, token) => {
        if (!accountId || !profileId || !token) return;

        const res = await api.postQueryProfile(accountId, profileId, token);

        if (!res.success) throw new Error(res.error);

        const fullUpdate = res.data.profileChanges?.find(
          (c: any) => c.changeType === "fullProfileUpdate",
        );

        if (!fullUpdate?.profile) return;

        set((state) => ({
          profiles: {
            ...state.profiles,
            [profileId]: fullUpdate.profile,
          },
        }));
      },

      getFavoriteCharacter: () => {
        const athena = get().profiles["athena"];
        return athena?.stats?.attributes?.favorite_character ?? null;
      },
    }),
    {
      name: "storage:profiles",
      partialize: (state) => ({
        profiles: state.profiles,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
