import mongoose from 'mongoose';
import multer from 'multer';
import { MongoClient, ObjectId } from 'mongodb';
import pdfParse from 'pdf-parse';
import EpubMetadata from 'epub-metadata';
import { Request, ParamsDictionary, Response } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import * as dotenv from "dotenv";

dotenv.config();

let MONGODB_URI = process.env.MONGODB_URI || "";

if (MONGODB_URI === undefined) {
    MONGODB_URI = "";
}

let cachedDb: any = null;
let bookBucket: any = null;
let coverBucket: any = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    const client = await MongoClient.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const db = client.db(MONGODB_URI.split('/').pop().split('?')[0]);
    cachedDb = db;

    if (!bookBucket) {
        bookBucket = db.collection('book_files');
    }
    if (!coverBucket) {
        coverBucket = db.collection('book_covers');
    }

    return db;
}

const bookSchema = new mongoose.Schema({
    fileName: {type: String, required: true},
    fileId: {type: mongoose.Schema.Types.ObjectId, required: true},
    bookTitle: {type: String, required: false},
    bookAuthor: {type: String, required: false},
    coverFileId: {type: mongoose.Schema.Types.ObjectId, required: false},
    extractedText: {type: String, required: false},
    uploadDate: {type: Date, default: Date.now}
});

const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);

const upload = multer({storage: multer.memoryStorage()});
const multerUpload = upload.single('bookFile');

function parseFilenameForBookInfo(filename: string) {
    let title = '';
    let author = '';
    const baseName = filename.substring(0, filename.lastIndexOf('.'));
    const match = baseName.match(/_OceanofPDF\.com_(.+?)_-_(.+)/i);
    if (match && match.length >= 3) {
        title = match[1].replace(/_/g, ' ').trim();
        author = match[2].replace(/_/g, ' ').trim();
    }
    return {title, author};
}

async function extractBookInfo(fileBuffer: {
    toString: (arg0: string) => string;
}, fileType: string, originalName: string) {
    let extractedText = '';
    let title = '';
    let author = '';
    let coverImageBuffer = null;

    const filenameInfo = parseFilenameForBookInfo(originalName);
    if (filenameInfo.title) {
        title = filenameInfo.title;
    }
    if (filenameInfo.author) {
        author = filenameInfo.author;
    }

    try {
        if (fileType.includes('pdf')) {
            const data = await pdfParse(fileBuffer);
            extractedText = data.text;
            if (!title && data.info && data.info.Title) {
                title = data.info.Title;
            }
            if (!author && data.info && data.info.Author) {
                author = data.info.Author;
            }
        } else if (fileType.includes('epub') || fileType.endsWith('.epub')) {
            const metadata = new EpubMetadata(fileBuffer);
            await metadata.parse();
            if (!title && metadata.title) {
                title = metadata.title;
            }
            if (!author && metadata.creator) {
                author = metadata.creator;
            }
        } else if (fileType.includes('text') || fileType.endsWith('.txt')) {
            extractedText = fileBuffer.toString('utf8');
        }
    } catch (error) {
        console.error(`Error extracting info from ${fileType}:`, error);
        extractedText = fileBuffer.toString('utf8');
    }
    return {extractedText, title, author, coverImageBuffer};
}

export default async function handler(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>, number>) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    await connectToDatabase();

    await new Promise((resolve, reject) => {
        multerUpload(req, res, async (err) => {
            if (err) {
                console.error('Multer error:', err);
                return reject(new Error('File upload failed.'));
            }
            resolve();
        });
    });

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, buffer, mimetype } = req.file;

    try {
        const { extractedText, title, author, coverImageBuffer } = await extractBookInfo(buffer, mimetype, originalname);

        const uploadBookStream = bookBucket.openUploadStream(originalname, {
            chunkSizeBytes: 1024 * 255,
            metadata: {
                contentType: mimetype,
                fileSize: buffer.length
            }
        });
        uploadBookStream.end(buffer);
        const bookFileId = await new Promise((resolve, reject) => {
            uploadBookStream.on('finish', () => resolve(uploadBookStream.id));
            uploadBookStream.on('error', reject);
        });

        let coverFileId = null;
        if (coverImageBuffer) {

            const coverMimeType = 'image/jpeg';
            const uploadCoverStream = coverBucket.openUploadStream(`${originalname}_cover.jpg`, {
                chunkSizeBytes: 1024 * 255,
                metadata: {
                    contentType: coverMimeType,
                    fileSize: coverImageBuffer.length
                }
            });
            uploadCoverStream.end(coverImageBuffer);
            coverFileId = await new Promise((resolve, reject) => {
                uploadCoverStream.on('finish', () => resolve(uploadCoverStream.id));
                uploadCoverStream.on('error', reject);
            });
        }

        const newBook = new Book({
            fileName: originalname,
            fileId: bookFileId,
            bookTitle: title || 'Untitled',
            bookAuthor: author || 'Unknown Author',
            coverFileId: coverFileId,
            extractedText: extractedText
        });

        await newBook.save();

        res.status(201).json({
            message: 'Book uploaded and info extracted successfully!',
            bookId: newBook._id,
            extractedTitle: newBook.bookTitle,
            extractedAuthor: newBook.bookAuthor,
            coverFileId: newBook.coverFileId
        });

    } catch (error) {

    }
}