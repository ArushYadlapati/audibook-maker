"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.toggle("dark");
    const dark = root.classList.contains("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
    setIsDark(dark);
  };

  return (
    <button
      onClick={toggleTheme}
      className="cursor-pointer p-2 bg-transparent"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Moon size={24} className="text-white" />
      ) : (
        <Sun size={24} className="text-black" />
      )}
    </button>
  );
}
