import { createOpenAI } from '@ai-sdk/openai';
import { getServerAuth } from '@/lib/server-utils';
import { experimental_transcribe as transcribe } from 'ai';
import config from '@/config';
// import OpenAI from "openai";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - OpenAI's limit
const SUPPORTED_MIME_TYPES = [
    'audio/webm', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
    'audio/ogg', 'audio/flac'
];

const openAi = createOpenAI({
    apiKey: config.OPENAI_API_KEY,
});


// const openai = new OpenAI({
//     apiKey: config.OPENAI_API_KEY!,
// });

// Polyfill File for Node.js/Expo environment
if (typeof globalThis.File === 'undefined') {
    const { Blob } = require('buffer');

    globalThis.File = class File extends Blob {
        name: string;
        lastModified: number;
        webkitRelativePath: string = '';

        constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
            super(fileBits, options);
            this.name = fileName;
            this.lastModified = options?.lastModified ?? Date.now();
        }

        // Explicitly declare properties/methods inherited from Blob to satisfy TypeScript
        get size(): number { return super.size; }
        get type(): string { return super.type; }
        arrayBuffer(): Promise<ArrayBuffer> { return super.arrayBuffer(); }
        stream(): ReadableStream<Uint8Array> { return super.stream(); }
        text(): Promise<string> { return super.text(); }
        slice(start?: number, end?: number, contentType?: string): Blob { return super.slice(start, end, contentType); }
        async bytes(): Promise<Uint8Array> {
            const buffer = await this.arrayBuffer();
            return new Uint8Array(buffer);
        }
    };
}

export async function POST(req: Request) {
    const startTime = Date.now();

    try {
        // Validate environment
        if (!config.OPENAI_API_KEY) {
            console.error('Missing OPENAI_API_KEY environment variable');
            return Response.json(
                { error: 'Service configuration error' },
                { status: 500 }
            );
        }

        // Authentication
        const userInfo = getServerAuth(req);
        if (!userInfo) {
            return Response.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        const body = await req.json();
        const { audioBase64, mimeType } = body;

        if (!audioBase64 || typeof audioBase64 !== 'string') {
            return Response.json(
                { error: 'Missing or invalid audioBase64 field' },
                { status: 400 }
            );
        }

        if (!mimeType || typeof mimeType !== 'string') {
            return Response.json(
                { error: 'Missing or invalid mimeType field' },
                { status: 400 }
            );
        }

        // Validate MIME type
        if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
            return Response.json(
                {
                    error: 'Unsupported audio format',
                    supportedFormats: SUPPORTED_MIME_TYPES
                },
                { status: 400 }
            );
        }

        // Convert and validate audio data
        let audioBuffer: Buffer;
        try {
            audioBuffer = Buffer.from(audioBase64, 'base64');
        } catch (error) {
            return Response.json(
                { error: 'Invalid base64 audio data' },
                { status: 400 }
            );
        }

        // Check file size
        if (audioBuffer.length > MAX_FILE_SIZE) {
            return Response.json(
                {
                    error: 'Audio file too large',
                    maxSize: '25MB',
                    receivedSize: `${Math.round(audioBuffer.length / 1024 / 1024)}MB`
                },
                { status: 413 }
            );
        }

        // Check for empty file
        if (audioBuffer.length === 0) {
            return Response.json(
                { error: 'Empty audio file' },
                { status: 400 }
            );
        }

        const fileExtension = getFileExtension(mimeType);
        // const audioFile = new File([audioBuffer], `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`, {
        //     type: mimeType
        // });

        const transcript = await transcribe({
            model: openAi.transcription('whisper-1'),
            audio: audioBuffer,
            providerOptions: {
                openai: {
                    // Optional: you can add timestamp granularities
                    timestampGranularities: ['word'],
                },
            },
        });
        console.log("transcript", transcript)

        // const data = await openai.audio.transcriptions.create({
        //     file: audioFile,
        //     model: "whisper-1",
        // });

        return Response.json({
            transcription: transcript.text,
            language: transcript.language,
            duration: transcript.durationInSeconds,
        });
        // return Response.json(data)
    } catch (error: any) {
        console.error("Transcription error:", error);
        return Response.json({ error: error.message || 'Failed to transcribe audio.' }, { status: 500 });
    }
}

function getFileExtension(mimeType: string): string {
    const mimeMap: { [key: string]: string } = {
        'audio/webm': 'webm',
        'audio/wav': 'wav',
        'audio/wave': 'wav',
        'audio/x-wav': 'wav',
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/mp4': 'm4a',
        'audio/m4a': 'm4a',
        'audio/ogg': 'ogg',
        'audio/flac': 'flac',
    };

    return mimeMap[mimeType] || 'webm';
}
