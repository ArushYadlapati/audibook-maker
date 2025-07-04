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
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (book: Book) => {
    setSelectedBook(book);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedBook(null);
    setIsModalOpen(false);
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
          <div key={book.id} className="p-2" onClick={() => openModal(book)}>
            <div className="rounded overflow-hidden shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200">
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

      {isModalOpen && selectedBook && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl relative">
            <button
              className="absolute top-2 right-2 text-xl font-bold text-gray-700 hover:text-black"
              onClick={closeModal}
            >
              &times;
            </button>
            <img
              src={selectedBook.imageUrl}
              alt={selectedBook.title}
              className="w-full h-[600px] object-cover rounded mb-4"
            />
            <h2 className="text-2xl font-semibold mb-2">
              {selectedBook.title}
            </h2>
            <p className="text-gray-700 mb-1">
              <strong>Author:</strong> {selectedBook.author}
            </p>
            <p className="text-gray-700">
              <strong>Genre:</strong> {selectedBook.genre}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimpleSlider;
