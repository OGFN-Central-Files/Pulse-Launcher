import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { News } from "../components/home/news";
import { useTheme } from "../../hooks/useTheme";

export function Home() {
  const auth = useAuth.user();
  const colors = useTheme();

  if (!auth.isValidSession()) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, damping: 30, stiffness: 330 }}
      className="p-6 md:p-8 w-full h-full text-white overflow-y-auto"
    >
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Welcome back{auth.displayName ? `, ${auth.displayName}` : ""}
        </h1>
        <p className={`mt-2 text-sm font-medium ${colors.current.text.secondary}`}>
          Here's everything new across Pulse.
        </p>
      </div>

      <News />
    </motion.div>
  );
}
