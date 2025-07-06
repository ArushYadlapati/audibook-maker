// utils/generateCoverURL.ts
export function generateCoverURL(title: string, author: string): string {
  const cleanTitle = title.length > 40 ? title.slice(0, 37) + "…" : title;
  const cleanAuthor = author.length > 30 ? author.slice(0, 27) + "…" : author;
  const text = encodeURIComponent(`${cleanTitle}\nby ${cleanAuthor}`);
  return `https://placehold.co/300x500/1f2937/ffffff?text=${text}&font=roboto&bold=true`;
}
