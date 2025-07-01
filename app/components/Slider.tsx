"use client";

import React from "react";
import Slider from "react-slick";
import books from "../data/books.json"; // adjust path if needed

function Responsive() {
  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 5,
    initialSlide: 0,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
          initialSlide: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <div className="slider-container p-4">
      <Slider {...settings}>
        {books.map((book) => (
          <div key={book.id} className="p-2">
            <div className="rounded overflow-hidden shadow-lg">
              <img
                src={book.imageUrl}
                alt={book.title}
                className="w-full h-[300px] object-cover"
              />
              <div className="px-4 py-2 bg-black text-white text-center">
                <h3 className="text-lg font-semibold">{book.title}</h3>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default Responsive;
