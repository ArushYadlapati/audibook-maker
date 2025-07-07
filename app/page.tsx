import React from "react";
import Navbar from "./components/Navbar";
import Introduction from "./components/Intro";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const page = () => {
    return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Introduction />
    </div>
  );
};

export default page;
