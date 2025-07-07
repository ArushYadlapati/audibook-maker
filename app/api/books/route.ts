import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI || "";

let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 10000,
        maxStalenessSeconds: 90,
    });

    try {
        await client.connect();
        const db = client.db('bookDB');
        await db.command({ ping: 1 });

        cachedClient = client;
        cachedDb = db;

        return { client, db };
    } catch (error) {
        throw error;
    }
}

export async function GET(request: NextRequest) {
    try {
        const { client, db } = await connectToDatabase();
        const collection = db.collection('books');

        const books = await collection.find({}).sort({ uploadDate: -1 }).toArray();

        const serializedBooks = books.map((book: { _id: { toString: () => any; }; uploadDate: { toISOString: () => any; }; }) => ({
            ...book,
            _id: book._id.toString(),
            uploadDate: book.uploadDate.toISOString()
        }));

        return NextResponse.json({
            success: true,
            count: books.length,
            books: serializedBooks
        }, { status: 200 });

    } catch (error) {

        return NextResponse.json({
            success: false,
            message: 'Failed to fetch books',
            error: error
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (jsonError) {
            return NextResponse.json(
                { message: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const { bookName, authorName, bookText, fileName } = body;

        if (!bookName || !authorName || !bookText) {
            return NextResponse.json(
                { message: 'Missing required fields: bookName, authorName, and bookText are required' },
                { status: 400 }
            );
        }

        const { client, db } = await connectToDatabase();
        const collection = db.collection('books');

        const existingBook = await collection.findOne({
            bookName,
            authorName,
        });

        if (existingBook) {
            return NextResponse.json(
                { message: 'Book already exists in database' },
                { status: 409 }
            );
        }

        const bookDocument = {
            bookName,
            authorName,
            bookText,
            fileName,
            uploadDate: new Date(),
            textLength: bookText.length,
            environment: process.env.NODE_ENV || 'unknown'
        };

        const result = await collection.insertOne(bookDocument);

        return NextResponse.json({
            message: 'Book uploaded successfully',
            bookId: result.insertedId,
            environment: process.env.NODE_ENV || 'unknown'
        }, { status: 201 });

    } catch (error) {
        if (error === 'MongoServerSelectionError') {
            return NextResponse.json(
                { message: 'Database connection timeout' },
                { status: 503 }
            );
        }

        if (error === 8000 || error === 'AtlasError') {
            return NextResponse.json(
                { message: 'Database authentication failed' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            {
                message: 'Internal server error',
                error: error,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
