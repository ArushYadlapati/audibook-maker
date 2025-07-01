import Link from "next/link";
import React from "react";

const Navbar = () => {
  return (
    <div>
      <div className="flex items-center justify-between mt-10">
        <div>
          <Link href="/">
            <h1 className="text-3xl font-bold ml-10">Audio Book Maker</h1>
          </Link>
        </div>
        <div className="flex gap-4 mr-10">
          <Link href="/converter" className="hover:underline">
            <div className="text-lg">Converter</div>
          </Link>
          <Link href="/library" className="hover:underline">
            <div className="text-lg">Library</div>
          </Link>
        </div>
      </div>
      <div className="border-b-2 border-gray-200 mt-10"></div>
    </div>
  );
};

export default Navbar;
