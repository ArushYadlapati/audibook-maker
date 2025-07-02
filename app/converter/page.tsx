"use client";

import React, {useEffect, useRef, useState} from 'react';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
    AlertCircle,
    CheckCircle,
    Download,
    FileText,
    Pause,
    Play,
    Settings,
    Square,
    Upload,
    Volume2
} from 'lucide-react';

declare global {
    interface Window {
        pdfjsLib?: any;
        lamejs?: any;
        JSZip?: any;
    }
}

interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
}

interface PDFPageProxy {
    getTextContent(): Promise<{ items: Array<{ str: string }> }>;
}

interface PDFLib {
    getDocument(params: { data: ArrayBuffer }): { promise: Promise<PDFDocumentProxy> };
    GlobalWorkerOptions: {
        workerSrc: string;
    };
}

interface LameEncoder {
    encodeBuffer(buffer: Int16Array): Uint8Array;
    flush(): Uint8Array;
}

interface LameJS {
    Mp3Encoder: new (channels: number, sampleRate: number, bitRate: number) => LameEncoder;
}

const Converter = () => {
    const [file, setFile] = useState<File | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [isExtracting, setIsExtracting] = useState<boolean>(false);
    const [isConverting, setIsConverting] = useState<boolean>(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [volume, setVolume] = useState<number>(0.8);
    const [rate, setRate] = useState<number>(1);
    const [pitch, setPitch] = useState<number>(1);
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [textChunks, setTextChunks] = useState<string[]>([]);
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
    const [pdfLib, setPdfLib] = useState<PDFLib | null>(null);
    const [lamejsLib, setLamejsLib] = useState<LameJS | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        const loadPdfJs = async () => {
            try {
                if (window.pdfjsLib) {
                    setPdfLib(window.pdfjsLib);
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

                const loadPromise = new Promise<void>((resolve, reject) => {
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load PDF.js'));
                });

                document.head.appendChild(script);
                await loadPromise;

                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    setPdfLib(window.pdfjsLib);
                }
            } catch (error) {
                console.error('Failed to load PDF.js:', error);
            }
        };

        loadPdfJs();
    }, []);

    useEffect(() => {
        const loadLameJs = async () => {
            try {
                if (window.lamejs) {
                    setLamejsLib(window.lamejs);
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.0/lame.min.js';

                const loadPromise = new Promise<void>((resolve, reject) => {
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load Lame.js'));
                });

                document.head.appendChild(script);
                await loadPromise;

                if (window.lamejs) {
                    setLamejsLib(window.lamejs);
                }
            } catch (error) {
                console.error('Failed to load Lame.js:', error);
            }
        };

        loadLameJs();
    }, []);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            setVoices(availableVoices);
            if (availableVoices.length > 0 && !voice) {
                const englishVoice = availableVoices.find(v => v.lang.startsWith('en-US')) ||
                    availableVoices.find(v => v.lang.startsWith('en')) ||
                    availableVoices[0];
                setVoice(englishVoice);
            }
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }

        setTimeout(loadVoices, 100);
    }, [voice]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = event.target.files?.[0];
        if (!uploadedFile) return;

        const fileName = uploadedFile.name.toLowerCase();
        const validTypes = ['.pdf', '.epub', '.txt'];
        const isValidType = validTypes.some(type => fileName.endsWith(type)) ||
            uploadedFile.type.includes('pdf') ||
            uploadedFile.type.includes('text');

        if (!isValidType) {
            setError('Please upload a PDF, EPUB, or TXT file');
            return;
        }

        setFile(uploadedFile);
        setError('');
        setSuccess('');
        setAudioUrl('');
        setAudioBlob(null);
        setExtractedText('');
        setProgress(0);
        setCurrentChunkIndex(0);
    };

    const extractTextFromPDF = async (file: File): Promise<string> => {
        if (!pdfLib) {
            return "";
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            const totalPages = pdf.numPages;

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';

                setProgress((i / totalPages) * 100);
            }

            return fullText.trim();
        } catch (error) {
            return "";
        }
    };

    const extractTextFromEPUB = async (file: File): Promise<string> => {
        try {

            const JSZip = await new Promise<any>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                script.onload = () => {
                    if (window.JSZip) {
                        resolve(window.JSZip);
                    } else {
                        reject(new Error('JSZip not loaded'));
                    }
                };
                script.onerror = () => reject(new Error('Failed to load JSZip'));
                document.head.appendChild(script);
            });

            const zip = new JSZip();
            const contents = await zip.loadAsync(file);

            let fullText = '';
            const htmlFiles: string[] = [];

            contents.forEach((relativePath: string, zipEntry: any) => {
                if (relativePath.match(/\.(html|xhtml|htm)$/i) && !zipEntry.dir) {
                    htmlFiles.push(relativePath);
                }
            });

            htmlFiles.sort();

            for (let i = 0; i < htmlFiles.length; i++) {
                const htmlContent = await contents.file(htmlFiles[i]).async('string');

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;

                const scripts = tempDiv.querySelectorAll('script, style');
                scripts.forEach(el => el.remove());

                const text = tempDiv.textContent || tempDiv.innerText || '';
                fullText += text + '\n\n';

                setProgress(((i + 1) / htmlFiles.length) * 100);
            }

            return fullText.trim();
        } catch (error) {
            return "";
        }
    };

    const extractTextFromTXT = async (file: File): Promise<string> => {
        try {
            return await file.text();
        } catch (error) {
            return "";
        }
    };

    const extractText = async () => {
        if (!file) return;

        setIsExtracting(true);
        setError('');
        setSuccess('');
        setProgress(0);

        try {
            let text = '';
            const fileName = file.name.toLowerCase();

            if (file.type.includes('pdf') || fileName.endsWith('.pdf')) {
                text = await extractTextFromPDF(file);
            } else if (fileName.endsWith('.epub')) {
                text = await extractTextFromEPUB(file);
            } else if (fileName.endsWith('.txt') || file.type.includes('text')) {
                text = await extractTextFromTXT(file);
            }

            text = text.replace(/\s+/g, ' ').trim();

            setExtractedText(text);
            setSuccess(`Text extracted successfully! (${text.length} characters)`);

            const chunks = splitTextIntoChunks(text, 200);
            setTextChunks(chunks);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
        } finally {
            setIsExtracting(false);
            setProgress(0);
        }
    };

    const splitTextIntoChunks = (text: string, maxLength: number): string[] => {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length === 0) {

            const words = text.split(' ');
            const chunks: string[] = [];
            for (let i = 0; i < words.length; i += 30) {
                chunks.push(words.slice(i, i + 30).join(' '));
            }
            return chunks;
        }

        const chunks: string[] = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxLength) {
                currentChunk += sentence;
            } else {
                if (currentChunk.trim()) chunks.push(currentChunk.trim());
                currentChunk = sentence;
            }
        }

        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        return chunks.filter(chunk => chunk.length > 0);
    };

    const createAudioFromText = async () => {
        if (!textChunks.length) return;

        setIsConverting(true);
        setError('');
        setProgress(0);
        setCurrentChunkIndex(0);
        recordedChunksRef.current = [];

        try {

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 44100
            });

            const destination = audioContextRef.current.createMediaStreamDestination();

            const mediaRecorder = new MediaRecorder(destination.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });

                    let finalBlob = audioBlob;
                    let fileName = `${file?.name?.replace(/\.[^/.]+$/, '') || 'converted'}_audio`;

                    if (lamejsLib) {
                        try {
                            finalBlob = await convertToMp3(audioBlob);
                            fileName += '.mp3';
                        } catch (mp3Error) {
                            console.warn('MP3 conversion failed, using original format:', mp3Error);
                            fileName += '.webm';
                        }
                    } else {
                        fileName += '.webm';
                    }

                    setAudioBlob(finalBlob);
                    const url = URL.createObjectURL(finalBlob);
                    setAudioUrl(url);

                    downloadAudioFile(finalBlob, fileName);

                    setSuccess('Audio created and downloaded successfully!');
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    setError(`Failed to process audio: ${errorMessage}`);
                }
            };

            mediaRecorder.start();

            await processAllChunks();

            setTimeout(() => {
                mediaRecorder.stop();
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                }
            }, 500);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to create audio: ${errorMessage}`);
            if (audioContextRef.current) {
                await audioContextRef.current.close();
            }
        } finally {
            setIsConverting(false);
        }
    };

    const processAllChunks = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            let chunkIndex = 0;

            const processNextChunk = () => {
                if (chunkIndex >= textChunks.length) {
                    resolve();
                    return;
                }

                const utterance = new SpeechSynthesisUtterance(textChunks[chunkIndex]);

                if (voice) utterance.voice = voice;
                utterance.rate = rate;
                utterance.pitch = pitch;
                utterance.volume = volume;

                utterance.onend = () => {
                    chunkIndex++;
                    setCurrentChunkIndex(chunkIndex);
                    setProgress((chunkIndex / textChunks.length) * 100);

                    if (chunkIndex < textChunks.length) {
                        setTimeout(processNextChunk, 100);
                    } else {
                        resolve();
                    }
                };

                utterance.onerror = (event) => {
                    reject(new Error(`Speech synthesis error: ${event.error}`));
                };

                speechSynthesis.speak(utterance);
            };

            processNextChunk();
        });
    };

    const convertToMp3 = async (webmBlob: Blob): Promise<Blob> => {
        if (!lamejsLib || !audioContextRef.current) {
            throw new Error('MP3 encoder not loaded');
        }

        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

        const samples = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        const buffer = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
            buffer[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7FFF;
        }

        const mp3encoder = new lamejsLib.Mp3Encoder(1, sampleRate, 128);
        const mp3Data: Uint8Array[] = [];

        const blockSize = 1152;
        for (let i = 0; i < buffer.length; i += blockSize) {
            const mono = buffer.subarray(i, i + blockSize);
            const mp3buf = mp3encoder.encodeBuffer(mono);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }

        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        return new Blob(mp3Data, { type: 'audio/mp3' });
    };

    const downloadAudioFile = (blob: Blob, fileName: string) => {
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const playLive = () => {
        if (isPlaying) {
            speechSynthesis.pause();
            setIsPaused(true);
            setIsPlaying(false);
        } else if (isPaused) {
            speechSynthesis.resume();
            setIsPaused(false);
            setIsPlaying(true);
        } else {

            setIsPlaying(true);
            setIsPaused(false);
            playTextLive();
        }
    };

    const playTextLive = async () => {
        if (!textChunks.length) return;

        let chunkIndex = 0;
        setCurrentChunkIndex(0);

        const speakChunk = () => {
            if (chunkIndex >= textChunks.length) {
                setIsPlaying(false);
                setIsPaused(false);
                return;
            }

            const utterance = new SpeechSynthesisUtterance(textChunks[chunkIndex]);

            if (voice) utterance.voice = voice;
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = volume;

            utterance.onend = () => {
                chunkIndex++;
                setCurrentChunkIndex(chunkIndex);
                if (isPlaying && chunkIndex < textChunks.length) {
                    setTimeout(speakChunk, 100);
                } else {
                    setIsPlaying(false);
                    setIsPaused(false);
                }
            };

            utterance.onerror = (event) => {
                setIsPlaying(false);
                setIsPaused(false);
            };

            setCurrentUtterance(utterance);
            speechSynthesis.speak(utterance);
        };

        speakChunk();
    };

    const stopPlayback = () => {
        speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentChunkIndex(0);
    };

    const downloadAudio = () => {
        if (!audioBlob) return;

        const fileName = lamejsLib ?
            `${file?.name?.replace(/\.[^/.]+$/, '') || 'converted'}_audio.mp3` :
            `${file?.name?.replace(/\.[^/.]+$/, '') || 'converted'}_audio.webm`;

        downloadAudioFile(audioBlob, fileName);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        Document to Audio Converter
                    </h2>

                    <div className="mb-6">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".pdf,.epub,.txt"
                                className="hidden"
                            />
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">
                                Upload a PDF, EPUB, or TXT file
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Choose File
                            </button>
                            {file && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-medium">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {(isExtracting || isConverting) && (
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>{isExtracting ? 'Extracting text...' : 'Converting to audio...'}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {file && !extractedText && (
                        <div className="mb-6">
                            <button
                                onClick={extractText}
                                disabled={isExtracting}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                { isExtracting ? 'Converting...' : 'Convert to Audiobook' }
                            </button>
                        </div>
                    )}

                    {extractedText && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                Voice Settings
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Voice</label>
                                    <select
                                        value={voice?.name || ''}
                                        onChange={(e) => setVoice(voices.find(v => v.name === e.target.value) || null)}
                                        className="w-full p-2 border rounded-md"
                                    >
                                        {voices.map((v) => (
                                            <option key={v.name} value={v.name}>
                                                {v.name} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Speed: {rate}x</label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.1"
                                        value={rate}
                                        onChange={(e) => setRate(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Pitch: {pitch}</label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.1"
                                        value={pitch}
                                        onChange={(e) => setPitch(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Volume: {Math.round(volume * 100)}%</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {extractedText && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Text Preview</h3>
                            <div className="bg-gray-100 p-4 rounded-lg max-h-40 overflow-y-auto text-sm">
                                {extractedText.substring(0, 500)}
                                {extractedText.length > 500 && '...'}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {extractedText.length} characters | {textChunks.length} speech segments
                            </p>
                        </div>
                    )}

                    {extractedText && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">Audio Controls</h3>

                            <div className="flex flex-wrap gap-3 mb-4">
                                <button
                                    onClick={playLive}
                                    disabled={isExtracting || isConverting}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    {isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play Live'}
                                </button>

                                <button
                                    onClick={stopPlayback}
                                    disabled={!isPlaying && !isPaused}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Square className="w-4 h-4" />
                                    Stop
                                </button>

                                <button
                                    onClick={createAudioFromText}
                                    disabled={isExtracting || isConverting || isPlaying}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Volume2 className="w-4 h-4" />
                                    {isConverting ? 'Creating & Downloading...' : 'Create & Download MP3'}
                                </button>

                                {audioBlob && (
                                    <button
                                        onClick={downloadAudio}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Again
                                    </button>
                                )}
                            </div>

                            {(isPlaying || isPaused || isConverting) && (
                                <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                                    <p><strong>Status:</strong> {isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Converting'}</p>
                                    {textChunks.length > 0 && (
                                        <p><strong>Progress:</strong> {currentChunkIndex} / {textChunks.length} segments</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {audioUrl && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">Generated Audio</h3>
                            <audio
                                controls
                                src={audioUrl}
                                className="w-full"
                                preload="metadata"
                            >
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}
                </div>
            </div>
            <Footer/>
        </div>
    );
};

export default Converter;