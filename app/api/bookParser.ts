export const parseBookInfo = (fileName: string) => {
    const type = fileName.split('.').pop()?.toLowerCase() || "Unknown";

    if (fileName.includes('oceanofpdf.com')) {
        const cleaned = fileName.replace(/\.(pdf|epub|txt)$/i, '').replace(/^OceanofPDF\.com_?/, '');
        const parts = cleaned.split(/_-_|_-\s|\s-_|\s-\s/);

        if (parts.length >= 2) {
            const title = parts.slice(0, -1).join(' - ');
            const author = parts[parts.length - 1];

            const bookName = replaceTextParts(title);
            const authorName = replaceTextParts(author);


            return {
                bookName,
                authorName,
                type: type,
                isOceanPDF: true,
            };
        }
    }

    return {
        bookName: fileName,
        authorName: "Unknown",
        fileType: type,
        isOceanPDF: false,
    };
};

function replaceTextParts(text: string,): string {
    return text.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()).trim();
}