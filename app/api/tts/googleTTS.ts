export interface TTSOptions {
    voice?: string;
    languageCode?: string;
    speed?: number;
    pitch?: number;
    audioEncoding?: 'LINEAR16' | 'MP3' | 'OGG_OPUS';
    sampleRateHertz?: number;
}

export interface TTSResult {
    audioContent: Buffer;
    contentType: string;
    fileExtension: string;
}

export async function textToSpeech(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const ttsKey = process.env.AUDIOBOOK_TTS_KEY || "";

    if (!ttsKey) {
        throw new Error('AUDIOBOOK_TTS_KEY environment variable is not set');
    }

    if (!text || text.trim().length === 0) {
        throw new Error('Text parameter is required and cannot be empty');
    }

    const {
        voice = 'en-US-Chirp3-HD-Aoede',
        languageCode = 'en-US',
        speed = 1.0,
        pitch = 0.0,
        audioEncoding = 'MP3',
        sampleRateHertz = 24000
    } = options;

    if (speed < 0.25 || speed > 4.0) {
        throw new Error('Speed must be between 0.25 and 4.0');
    }

    if (pitch < -20.0 || pitch > 20.0) {
        throw new Error('Pitch must be between -20.0 and 20.0');
    }

    const textChunks = splitTextIntoChunks(text, 4500);
    const audioBuffers: Buffer[] = [];

    try {
        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];

            const requestBody = {
                input: {
                    text: chunk
                },
                voice: {
                    languageCode: languageCode,
                    name: voice
                },
                audioConfig: {
                    audioEncoding: audioEncoding,
                    speakingRate: speed,
                    pitch: pitch,
                    sampleRateHertz: audioEncoding === 'LINEAR16' ? sampleRateHertz : undefined
                }
            };

            const response = await fetch(
                `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error?.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
            }

            const result = await response.json();

            const audioBuffer = Buffer.from(result.audioContent, 'base64');
            audioBuffers.push(audioBuffer);
        }

        const combinedBuffer = Buffer.concat(audioBuffers);

        const contentType = getContentType(audioEncoding);
        const fileExtension = getFileExtension(audioEncoding);

        return {audioContent: combinedBuffer, contentType, fileExtension
        };

    } catch (error) {
        console.error(error);

        return Promise.reject(
            new Error(Error.name)
        );
    }
}

function splitTextIntoChunks(text: string, maxChunkSize: number = 4500): string[] {
    if (text.length <= maxChunkSize) {
        return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }

            if (sentence.length > maxChunkSize) {
                const words = sentence.split(' ');
                let wordChunk = '';

                for (const word of words) {
                    if (wordChunk.length + word.length + 1 > maxChunkSize) {
                        if (wordChunk.trim()) {
                            chunks.push(wordChunk.trim());
                            wordChunk = '';
                        }
                    }
                    wordChunk += (wordChunk ? ' ' : '') + word;
                }

                if (wordChunk.trim()) {
                    currentChunk = wordChunk;
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function getContentType(audioEncoding: string): string {
    switch (audioEncoding) {
        case 'MP3':
            return 'audio/mpeg';
        case 'LINEAR16':
            return 'audio/wav';
        case 'OGG_OPUS':
            return 'audio/ogg';
        default:
            return 'audio/mpeg';
    }
}

function getFileExtension(audioEncoding: string): string {
    switch (audioEncoding) {
        case 'MP3':
            return 'mp3';
        case 'LINEAR16':
            return 'wav';
        case 'OGG_OPUS':
            return 'ogg';
        default:
            return 'mp3';
    }
}