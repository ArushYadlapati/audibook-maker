import React from "react";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black text-white mt-20">
      <div className="max-w-7xl mx-auto py-10 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Audio Book Maker</h1>
          <p className="text-gray-400 text-sm">
            Turn text into immersive audio experiences.
          </p>
        </div>

        {/* Links */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm text-gray-400">
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/converter">Converter</a>
            </li>
            <li>
              <a href="/library">Library</a>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Made By</h3>
          <div className="flex mt-2 flex-col gap-4">
            <div className="flex flex-col">
              <span className="font-semibold">Minh Nguyen</span>
              <a href="mailto:khaiminhnguyen1902@gmail.com">
                khaiminhnguyen1902@gmail.com
              </a>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Arush Y</span>
              <a href="mailto:arush.yadlapati@gmail.com">
                arush.yadlapati@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-gray-500 text-sm border-t border-gray-800 py-4">
        &copy; {new Date().getFullYear()} Audio Book Maker. All rights reserved.
        Freedom Week Project
      </div>
    </footer>
  );
};

export default Footer;
