import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = "mongodb+srv://mongoBookDB:eUEeUHDJ3rW3PcGB@books.osrfk4l.mongodb.net/?retryWrites=true&w=majority&appName=books";

export async function POST(request: NextRequest) {
    try {
        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        });

        await client.connect();
        const database = client.db('bookDB');
        const collection = database.collection('books');

        const body = await request.json();
        const { bookName, authorName, bookText, fileName } = body;

        if (!bookName || !authorName || !bookText) {
            await client.close();
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        const existingBook = await collection.findOne({
            bookName,
            authorName,
        });

        if (existingBook) {
            await client.close();
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
            textLength: bookText.length
        };

        const result = await collection.insertOne(bookDocument);
        await client.close();

        return NextResponse.json({
            message: 'Book uploaded successfully',
            bookId: result.insertedId,
        }, { status: 201 });

    } catch (error) {
        console.error('Error uploading book:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}