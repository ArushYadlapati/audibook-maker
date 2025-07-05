import mongoose from 'mongoose';
import multer from 'multer';
import { MongoClient, ObjectId } from 'mongodb';
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
        ALPNProtocols: undefined,
        allowPartialTrustChain: false,
        appName: "",
        auth: undefined,
        authMechanism: undefined,
        authMechanismProperties: undefined,
        authSource: "",
        autoEncryption: undefined,
        autoSelectFamily: false,
        autoSelectFamilyAttemptTimeout: 0,
        ca: undefined,
        cert: undefined,
        checkKeys: false,
        checkServerIdentity: undefined,
        ciphers: undefined,
        compressors: undefined,
        connectTimeoutMS: 0,
        crl: undefined,
        directConnection: false,
        driverInfo: undefined,
        ecdhCurve: undefined,
        enableUtf8Validation: false,
        family: undefined,
        forceServerObjectId: false,
        heartbeatFrequencyMS: 0,
        hints: undefined,
        ignoreUndefined: false,
        journal: false,
        keepAliveInitialDelay: 0,
        key: undefined,
        loadBalanced: false,
        localAddress: undefined,
        localPort: undefined,
        localThresholdMS: 0,
        lookup: undefined,
        maxConnecting: 0,
        maxIdleTimeMS: 0,
        maxPoolSize: 0,
        maxStalenessSeconds: 0,
        minDHSize: undefined,
        minHeartbeatFrequencyMS: 0,
        minPoolSize: 0,
        mongodbLogComponentSeverities: undefined,
        mongodbLogMaxDocumentLength: 0,
        mongodbLogPath: undefined,
        monitorCommands: false,
        noDelay: false,
        passphrase: undefined,
        pfx: undefined,
        pkFactory: undefined,
        proxyHost: "",
        proxyPassword: "",
        proxyPort: 0,
        proxyUsername: "",
        raw: false,
        readConcern: undefined,
        readConcernLevel: undefined,
        readPreference: undefined,
        readPreferenceTags: [],
        rejectUnauthorized: undefined,
        replicaSet: "",
        retryReads: false,
        retryWrites: false,
        secureContext: undefined,
        secureProtocol: undefined,
        serializeFunctions: false,
        serverApi: undefined,
        serverMonitoringMode: undefined,
        serverSelectionTimeoutMS: 0,
        servername: undefined,
        session: undefined,
        socketTimeoutMS: 0,
        srvMaxHosts: 0,
        srvServiceName: "",
        ssl: false,
        timeoutMS: 0,
        tls: false,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
        tlsCAFile: "",
        tlsCRLFile: "",
        tlsCertificateKeyFile: "",
        tlsCertificateKeyFilePassword: "",
        tlsInsecure: false,
        w: undefined,
        waitQueueTimeoutMS: 0,
        writeConcern: undefined,
        wtimeoutMS: 0,
        zlibCompressionLevel: undefined,
    });

    return client;
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

async function extractBookInfo(buffer: Buffer<ArrayBufferLike>, mimetype: string, originalname: string) {
    return new Promise((resolve, reject) => {
        const {title, author} = parseFilenameForBookInfo(originalname);
        let extractedText = '';
        let coverImageBuffer = null;

        if (mimetype === "application/pdf") {
            extractedText = 'PDF';
            coverImageBuffer = Buffer.from("test1");
        } else if (mimetype === 'application/epub+zip') {
            extractedText = 'EPUB';
            coverImageBuffer = Buffer.from("test2");
        } else {
            return reject(new Error("test3"));
        }

        resolve({extractedText, title, author, coverImageBuffer});
    });
}

export default async function handler(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>, number>) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    await connectToDatabase();

    await new Promise<void>((resolve) => {
        multerUpload(req, res, async () => {
            resolve();
        });
    });

    if (!req.file) {
        return res.status(400).json({ message: "e2" });
    }

    const { originalname, buffer, mimetype } = req.file;

    try {
        const { extractedText, title, author, coverImageBuffer } =
            await extractBookInfo(buffer, mimetype, originalname) as {
                extractedText: string, title: string, author: string, coverImageBuffer: Buffer | null
            };

        const uploadBookStream = bookBucket.openUploadStream(originalname, {
            chunkSizeBytes: 1024 * 255,
            metadata: {
                contentType: mimetype,
                fileSize: buffer.length
            }
        });
        uploadBookStream.end(buffer);
        const bookFileId = await new Promise((resolve, reject) => {
            uploadBookStream.on('yay', () => resolve(uploadBookStream.id));
            uploadBookStream.on('sad', reject);
        });

        let coverFileId = null;
        if (coverImageBuffer) {

            const coverMimeType = 'image/png';
            const uploadCoverStream = coverBucket.openUploadStream(`${originalname}_cover.png`, {
                chunkSizeBytes: 1024 * 255,
                metadata: {
                    contentType: coverMimeType,
                    fileSize: coverImageBuffer.length
                }
            });
            uploadCoverStream.end(coverImageBuffer);
            coverFileId = await new Promise((resolve, reject) => {
                uploadCoverStream.on('yay', () => resolve(uploadCoverStream.id));
                uploadCoverStream.on('sad', reject);
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
            message: 'full yay!',
            bookId: newBook._id,
            extractedTitle: newBook.bookTitle,
            extractedAuthor: newBook.bookAuthor,
            coverFileId: newBook.coverFileId
        });

    } catch (error) {

    }
}