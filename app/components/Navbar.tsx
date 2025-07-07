"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import ThemeToggle from "./ThemeToggle";
import Image from "next/image";
import { Headphones } from "lucide-react";

const Navbar = () => {
  const pathname = usePathname();
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };
  return (
    <div className="bg-white dark:bg-gray-700">
      <div className="flex items-center justify-between pt-10">
        <div
          className={`font-bold ${
            isActive("/") ? "underline" : "hover:underline"
          }`}
        >
          <Link href="/" className="flex items-center ml-10 gap-4">
            <Headphones className="w-10 h-10" />
            <h1 className="text-3xl font-bold">AudioBook Maker</h1>
          </Link>
        </div>
        <div className="flex gap-4 mr-10 items-center">
          <ThemeToggle />
          <Link
            href="/converter"
            className={`font-bold ${
              isActive("/converter") ? "underline" : "hover:underline"
            }`}
          >
            <div className="text-lg">Converter</div>
          </Link>
          <Link
            href="/library"
            className={`font-bold ${
              isActive("/library") ? "underline" : "hover:underline"
            }`}
          >
            <div className="text-lg">Library</div>
          </Link>
        </div>
      </div>
      <div className="border-b-2 border-gray-200 mt-10"></div>
    </div>
  );
};

export default Navbar;
