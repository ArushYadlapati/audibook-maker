import { textToSpeech } from "@/app/api/tts/googleTTS"

export async function POST(request: Request) {
    try {
        const { text, voice, languageCode, speed, pitch } = await request.json();

    const result = await textToSpeech(text, {
            voice: voice,
            languageCode,
            speed,
            pitch,
            audioEncoding: 'MP3'
        });

        return new Response(result.audioContent, {
            headers: {
                'Content-Type': result.contentType,
                'Content-Disposition': `attachment; filename="tts_output.${result.fileExtension}"`
            }
        });

    } catch (error) {
        return Response.json(
            { error: error instanceof Error ? error.message : 'TTS conversion failed' },
            { status: 500 }
        );
    }
}
