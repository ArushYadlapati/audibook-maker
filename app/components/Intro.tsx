import React from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SimpleSlider from "./Slider";
import HowtoUse from "./Usage";
import Footer from "./Footer";
import Link from "next/link";

export default function page() {
  var settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };
  return (
    <div>
      <div>
        <h1 className="text-4xl font-bold text-center mt-20">
          Transform <span className="text-blue-500">Text</span> into{" "}
          <span className="text-blue-500">Audio</span> with Multiple Voices and
          Languages
        </h1>
        <h2 className="text-3xl font-bold text-center mt-5">
          <span className="text-blue-500"> Free Forever. No sign up needed. </span>
        </h2>
        <Link href="/converter">
          <div className="flex text-center items-center justify-center mt-6 w-full mb-10">
            <span className="bg-blue-500 p-3 rounded-2xl pl-10 pr-10 text-white font-semibold text-lg hover:bg-blue-600 transition duration-300 cursor-pointer">
              Convert Now!
            </span>
          </div>
        </Link>
      </div>
      <SimpleSlider />
      <HowtoUse />
      <Footer />
    </div>
  );
}
