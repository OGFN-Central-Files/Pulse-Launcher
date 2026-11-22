import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useAuth } from "../hooks/useAuth";

import { Auth } from "./pages/auth";
import { Home } from "./pages/home";
import { Library } from "./pages/library";
import { Settings } from "./pages/settings";
import { Shop } from "./pages/shop";

import "./styles/app.css";
import { Frame } from "./components/frame";
import { Sidebar } from "./components/sidebar";
import { CustomToaster } from "./components/toaster";
import { GalaxyBackground } from "./components/GalaxyBackground";
import { Updater } from "./components/Updater";
import { Leaderboard } from "./pages/leaderboard";
import { ServerStatus } from "./pages/status";
import { useEffect } from "react";
import { useProfileStore } from "../stores/profile";
import { useConfigStore } from "../stores/settings";

function App() {
  const auth = useAuth.user();
  const reduceMotion = useConfigStore((s) => s.reduceMotion);

  if (!auth.hydrated) {
    return null;
  }

  useEffect(() => {
    if (auth.isValidSession() && auth.accessToken && auth.accountId) {
      useProfileStore
        .getState()
        .fetchProfile(auth.accountId, "athena", auth.accessToken);
      useProfileStore
        .getState()
        .fetchProfile(auth.accountId, "common_core", auth.accessToken);
    }
  }, []);

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <div className="relative w-full h-full overflow-hidden">
        <GalaxyBackground />
        <Updater />
        <BrowserRouter>
          <Frame />
          {!auth.isValidSession() ? (
            <Routes>
              <Route path="*" element={<Auth />} />
            </Routes>
          ) : (
            <>
              <Sidebar />
              <main className="fixed top-12 left-18 right-0 bottom-0 overflow-auto text-white">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/status" element={<ServerStatus />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </>
          )}
          <CustomToaster />
        </BrowserRouter>
      </div>
    </MotionConfig>
  );
}

export default App;
