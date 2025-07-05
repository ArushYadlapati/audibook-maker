import { MongoClient, ServerApiVersion, Db, Collection } from 'mongodb';
import * as dotenv from 'dotenv';
import { NextApiRequest, NextApiResponse } from 'next';

dotenv.config();

const uri = "mongodb+srv://mongoBookDB:eUEeUHDJ3rW3PcGB@books.osrfk4l.mongodb.net/?retryWrites=true&w=majority&appName=books";
// const uri = process.env.MONGODB_URI || '';

let client: MongoClient;
let database: Db;
let collection: Collection;

const connectToDatabase = async () => {
    if (client && database && collection) return;  // Already connected

    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });

    await client.connect();
    database = client.db('bookDB');
    collection = database.collection('books');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await connectToDatabase(); // Ensure DB is connected

        const { bookName, authorName, bookText, fileName } = req.body;

        if (!bookName || !authorName || !bookText) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existingBook = await collection.findOne({
            bookName,
            authorName,
        });

        if (existingBook) {
            return res.status(409).json({ message: 'Book already exists in database' });
        }

        const bookDocument = {
            bookName,
            authorName,
            bookText,
            fileName,
            uploadDate: new Date(),
            textLength: bookText.length
        };

        const result = await collection.insertOne(bookDocument);

        return res.status(201).json({
            message: 'Book uploaded successfully',
            bookId: result.insertedId,
        });
    } catch (error) {
        console.error('Error uploading book:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}