import axios from "axios";

export async function getGoogleBooksCover(
  title: string,
  author: string
): Promise<string | null> {
  try {
    const query = encodeURIComponent(`intitle:${title}+inauthor:${author}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
    const res = await axios.get(url);

    if (res.data.totalItems > 0) {
      const volume = res.data.items[0].volumeInfo;
      if (volume.imageLinks?.thumbnail) {
        // Return a better sized cover by replacing "zoom=1" or using smallThumbnail
        return volume.imageLinks.thumbnail.replace("http:", "https:");
      }
    }
    return null;
  } catch (e) {
    console.error("Google Books API error:", e);
    return null;
  }
}
