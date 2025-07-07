export type Book = {
  _id: string;
  bookName: string;
  authorName: string;
  isbn?: string;
  bookText: string;
  uploadDate: string;
};

export async function fetchCoverByISBN(isbn: string): Promise<string | null> {
  if (!isbn) return null;
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}

export async function fetchCoverBySearch(
  title: string,
  author: string
): Promise<string | null> {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
    title
  )}&author=${encodeURIComponent(author)}&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCover(book: Book): Promise<string> {
  if (book.isbn) {
    const coverByISBN = await fetchCoverByISBN(book.isbn);
    if (coverByISBN) {
      return coverByISBN;
    }
  }
  const coverBySearch = await fetchCoverBySearch(
    book.bookName,
    book.authorName
  );
  if (coverBySearch) {
    return coverBySearch;
  }
  return "/images/fallback-book-cover.png";
}
