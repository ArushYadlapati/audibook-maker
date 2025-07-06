"use client";
import { useEffect, useState } from "react";

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
      className="cursor-pointer rounded border h-[40px] w-[40px] border-gray-300 dark:border-white"
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}
