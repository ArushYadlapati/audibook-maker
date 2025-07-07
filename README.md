# [AudioBook Maker](https://audiobook-maker.vercel.app/)

![nhbadge](https://img.shields.io/badge/made%20for%20neighborhood-bf8f73?style=for-the-badge&logo=hackclub&logoColor=ffffff)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## User Guide
1. The [Converter page](https://audiobook-maker.vercel.app/converter) allows you to convert a text source
(EPUB, PDF, or TXT) to an AudioBook. There is a live preview section, where you can easily skip sections. This 
is powered my Microsoft Azure's [Cognitive Services](https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/).
The download process uses Google Cloud's [Text-to-Speech API](https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize),
which has richer voices and better quality than the Microsoft Azure, but is more expensive and slower. You can choose the amount of characters to
download, because of its limits. Additionally, you can choose to upload the book to the Library, which is public. However, users
can't delete uploaded content at the moment.
2. There is no login, and everything is free and public.
3. The [Library page](https://audiobook-maker.vercel.app/library) allows you to download the .TXT of uploaded books.
Then, you can convert them to AudioBooks using the Converter page. Again, the Library is public, so anyone can see the books.

## Authors

- [@ArushYadlapati](https://github.com/ArushYadlapati)
- [@Khaiminh1902](https://github.com/Khaiminh1902)



