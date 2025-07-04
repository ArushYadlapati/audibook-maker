"use client";

import React, { useState } from "react";
import Slider from "react-slick";
import rawBooks from "../data/books.json";

type Book = {
  id: number;
  title: string;
  imageUrl: string;
  author: string;
  genre: string;
};

const books: Book[] = rawBooks as Book[];

function SimpleSlider() {
  const [flippedBookId, setFlippedBookId] = useState<number | null>(null);

  const toggleFlip = (bookId: number) => {
    setFlippedBookId(flippedBookId === bookId ? null : bookId);
  };

  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 2500,
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
            <div
              className="relative w-full h-[350px] cursor-pointer"
              onClick={() => toggleFlip(book.id)}
            >
              <div
                className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
                  flippedBookId === book.id ? "rotate-y-180" : ""
                }`}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front of the card */}
                <div className="absolute w-full h-full backface-hidden rounded overflow-hidden shadow-lg hover:scale-105 transition-transform duration-200">
                  <img
                    src={book.imageUrl}
                    alt={book.title}
                    className="w-full h-[300px] object-cover"
                  />
                  <div className="px-4 py-2 bg-black text-white text-center">
                    <h3 className="text-lg font-semibold">{book.title}</h3>
                  </div>
                </div>
                {/* Back of the card */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-lg shadow-lg p-4 flex flex-col justify-center items-center">
                  <h2 className="text-xl font-semibold mb-2 text-center">
                    {book.title}
                  </h2>
                  <p className="text-gray-700 mb-1">
                    <strong>Author:</strong> {book.author}
                  </p>
                  <p className="text-gray-700 mb-4">
                    <strong>Genre:</strong> {book.genre}
                  </p>
                  <button
                    className="cursor-pointer bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
                    onClick={() => toggleFlip(book.id)}
                  >
                    Back to Cover
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default SimpleSlider;
