"use client";

import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import Link from "next/link";
import { Book, getCover } from "../../lib/bookCovers";

export default function SimpleSlider() {
  const [books, setBooks] = useState<Book[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [flippedBookId, setFlippedBookId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBooks() {
      setIsLoading(true);
      const res = await fetch("/api/books");
      const data = await res.json();
      if (data.success) {
        const sorted = data.books
          .sort(
            (a: Book, b: Book) =>
              new Date(b.uploadDate).getTime() -
              new Date(a.uploadDate).getTime()
          )
          .slice(0, 10);
        setBooks(sorted);
      }
      setIsLoading(false);
    }
    loadBooks();
  }, []);

  useEffect(() => {
    async function loadCovers() {
      const newCovers: Record<string, string> = {};
      await Promise.all(
        books.map(async (book) => {
          const coverUrl = await getCover(book);
          newCovers[book._id] = coverUrl;
        })
      );
      setCovers(newCovers);
    }
    if (books.length > 0) loadCovers();
  }, [books]);

  const toggleFlip = (id: string) => {
    setFlippedBookId(flippedBookId === id ? null : id);
  };

  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 2500,
    slidesToShow: 5,
    slidesToScroll: 5,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3 } },
      { breakpoint: 600, settings: { slidesToShow: 2, slidesToScroll: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1 } },
    ],
  };

  return (
    <div className="slider-container p-4">
      <Slider {...settings}>
        {isLoading
          ? [...Array(10)].map((_, i) => (
              <div key={i} className="p-2">
                <div className="relative w-full h-[500px] bg-gray-300 rounded-lg animate-pulse" />
              </div>
            ))
          : books.map((book) => (
              <div key={book._id} className="p-2">
                <div
                  className="relative w-full h-[500px] cursor-pointer"
                  onClick={() => toggleFlip(book._id)}
                >
                  <div
                    className={`relative w-full h-[600px] transition-transform duration-500 transform-style-preserve-3d ${
                      flippedBookId === book._id ? "rotate-y-180" : ""
                    }`}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Front */}
                    <div
                      className="absolute w-full h-[600px] backface-hidden rounded overflow-hidden shadow-lg hover:scale-105 transition-transform duration-200"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <img
                        src={covers[book._id] || "/fallback-book-cover.jpg"}
                        alt={book.bookName}
                        className="w-full h-[500px] object-cover"
                      />
                    </div>

                    {/* Back */}
                    <div
                      className="absolute w-full h-[500px] backface-hidden rotate-y-180 bg-white rounded-lg shadow-lg p-4 flex flex-col justify-center items-center"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <h2 className="text-xl font-semibold mb-2 text-center text-black">
                        {book.bookName}
                      </h2>
                      <p className="text-gray-700 mb-1">
                        <strong>Author:</strong> {book.authorName}
                      </p>
                      <p className="text-gray-700 mb-4 text-sm">
                        Uploaded:{" "}
                        {new Date(book.uploadDate).toLocaleDateString()}
                      </p>
                      <Link href="/library">
                        <button className="cursor-pointer bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">
                          Go to Library
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
      </Slider>
    </div>
  );
}
