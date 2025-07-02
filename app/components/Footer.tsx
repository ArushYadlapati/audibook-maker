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
              <a href="#">Home</a>
            </li>
            <li>
              <a href="#">Features</a>
            </li>
            <li>
              <a href="#">Pricing</a>
            </li>
            <li>
              <a href="#">Contact</a>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Follow Us</h3>
          <div className="flex gap-4">
            <a href="#">
              <Facebook className="w-5 h-5 text-gray-400 hover:text-white" />
            </a>
            <a href="#">
              <Twitter className="w-5 h-5 text-gray-400 hover:text-white" />
            </a>
            <a href="#">
              <Instagram className="w-5 h-5 text-gray-400 hover:text-white" />
            </a>
            <a href="#">
              <Linkedin className="w-5 h-5 text-gray-400 hover:text-white" />
            </a>
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
