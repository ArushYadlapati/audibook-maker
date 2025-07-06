"use client";

import React, { useState, useEffect } from "react";
import { RefreshCcw, File } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface Book {
  _id: string;
  bookName: string;
  authorName: string;
  bookText: string;
  fileName?: string;
  uploadDate: string;
  textLength: number;
}

// Spinner component
const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    ></path>
  </svg>
);

const Library = () => {
  const [allBooks, setAllBooks] = useState<Book[]>([]); // all fetched books
  const [books, setBooks] = useState<Book[]>([]); // filtered books to display
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      if (!loading) setRefreshing(true);
      const response = await fetch("/api/books", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setAllBooks(data.books);
        setBooks(data.books);
      } else {
        setError(data.message || "Failed to fetch books");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An error in fetching the books occurred"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle search input change and filter books
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.trim() === "") {
      setBooks(allBooks);
    } else {
      const lowerTerm = term.toLowerCase();
      const filtered = allBooks.filter(
        (book) =>
          book.bookName.toLowerCase().includes(lowerTerm) ||
          book.authorName.toLowerCase().includes(lowerTerm)
      );
      setBooks(filtered);
    }
  };

  const downloadAsText = (book: Book) => {
    let fileName = "";
    try {
      fileName = book.bookName.substring(1);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An error with the book name occurred"
      );
    }
    const content = `${fileName}\nby ${book.authorName}\n\n${book.bookText}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const file = document.createElement("a");
    file.href = url;
    file.download = `${fileName} - ${book.authorName}.txt`;
    document.body.appendChild(file);
    file.click();
    document.body.removeChild(file);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Library</h1>
          <div className="text-center">
            <p>Loading books...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Library</h1>
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
            <button
              onClick={fetchBooks}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Library</h1>

        {/* Search box */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by book name or author..."
            className="placeholder:text-gray-300 w-full px-4 py-2 border rounded shadow-sm focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>

        {books.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-600">
              No books found matching your search.
            </p>
          </div>
        ) : (
          <>
            <p className="text-lg font-semibold mb-4">
              Showing {books.length} book{books.length !== 1 ? "s" : ""}
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => (
                <div
                  key={book._id}
                  className="border dark:border-gray-400 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-bold mb-2">{book.bookName}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    by {book.authorName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {book.textLength.toLocaleString()} characters
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {new Date(book.uploadDate).toLocaleDateString()}
                  </p>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    <p className="font-medium mb-1">Preview:</p>
                    <p className="line-clamp-3">
                      {book.bookText.substring(0, 150)}
                      {book.bookText.length > 150 ? "..." : ""}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                      Download as:
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadAsText(book)}
                        className="cursor-pointer flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                        title="Download as Text"
                      >
                        <File size={14} />
                        TXT
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={fetchBooks}
            className="cursor-pointer flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 mx-auto"
          >
            {refreshing ? <Spinner /> : <RefreshCcw size={16} />}
            {refreshing ? "Refreshing..." : "Refresh Library"}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Library;
