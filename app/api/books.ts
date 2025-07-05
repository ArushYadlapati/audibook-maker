import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI || "";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { bookName, authorName, bookText, fileName } = req.body;

        if (!bookName || !authorName || !bookText) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        await client.connect();
        const database = client.db('bookDB');
        const collection = database.collection('books');

        const existingBook = await collection.findOne({
            bookName: bookName,
            authorName: authorName
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

        res.status(201).json({
            message: 'Book uploaded successfully',
            bookId: result.insertedId
        });

    } catch (error) {
        console.error('Error uploading book:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        await client.close();
    }
}