"use client";

import React, {useEffect, useRef, useState} from 'react';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { AlertCircle, CheckCircle, Download, FileText, Pause, Play,
         Settings, Square, Upload, Volume2 } from 'lucide-react';

import { PDFLib, LameJS, PDFDocumentProxy, PDFPageProxy, LameEncoder } from './convertHandler';

const Converter = () => {
    const [file, setFile] = useState<File | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [isExtracting, setIsExtracting] = useState<boolean>(false);
    const [isConverting, setIsConverting] = useState<boolean>(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string>('');
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
    const [savedChunkIndex, setSavedChunkIndex] = useState<number>(0); // Track saved position
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [pdfLib, setPdfLib] = useState<PDFLib | null>(null);
    const [lamejsLib, setLamejsLib] = useState<LameJS | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const processingRef = useRef<boolean>(false); // Prevent multiple simultaneous processing

    useEffect(() => {
        const loadPdfJs = async () => {
            try {
                if (window.pdfjsLib) {
                    setPdfLib(window.pdfjsLib);
                    return;
                }

                const script = document.createElement("script");
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

                const loadPromise = new Promise<void>((resolve, reject) => {
                    script.onload = () => resolve();
                });

                document.head.appendChild(script);
                await loadPromise;

                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                    setPdfLib(window.pdfjsLib);
                }
            } catch (error) {
                console.log(error);
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

                const script = document.createElement("script");
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.0/lame.min.js';

                const loadPromise = new Promise<void>((resolve, reject) => {
                    script.onload = () => resolve();
                });

                document.head.appendChild(script);
                await loadPromise;

                if (window.lamejs) {
                    setLamejsLib(window.lamejs);
                }
            } catch (error) {
                console.log(error);
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
        setSavedChunkIndex(0);
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

            // Clean up text but preserve structure
            text = text.replace(/\s+/g, ' ').trim();

            if (!text || text.length < 10) {
                throw new Error('No readable text found in the document');
            }

            setExtractedText(text);
            setSuccess(`Text extracted successfully! (${text.length} characters)`);

            // Improved chunking for better speech synthesis
            const chunks = splitTextIntoChunks(text);
            setTextChunks(chunks);
            setCurrentChunkIndex(0);
            setSavedChunkIndex(0);

            console.log(`Created ${chunks.length} chunks from ${text.length} characters`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(`Failed to extract text: ${errorMessage}`);
        } finally {
            setIsExtracting(false);
            setProgress(0);
        }
    };

    // Improved text chunking function
    const splitTextIntoChunks = (text: string): string[] => {
        // Clean the text first - be more aggressive about cleaning
        const cleanText = text.replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Remove problematic characters
            .trim();

        if (cleanText.length === 0) {
            return [];
        }

        // For very short text, return as single chunk
        if (cleanText.length < 100) {
            return [cleanText];
        }

        // Split by sentences first - improved regex to handle more cases
        const sentenceRegex = /[.!?]+(?:\s+|$)/g;
        const sentences = cleanText.split(sentenceRegex)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (sentences.length === 0) {
            // Fallback: split by paragraphs
            const paragraphs = cleanText.split(/\n\s*\n/)
                .map(p => p.trim())
                .filter(p => p.length > 0);

            if (paragraphs.length > 0) {
                // Further split long paragraphs
                const chunks: string[] = [];
                paragraphs.forEach(paragraph => {
                    if (paragraph.length <= 500) {
                        chunks.push(paragraph);
                    } else {
                        // Split long paragraphs by sentences or phrases
                        const phrases = paragraph.split(/[,;:](?:\s+)/)
                            .map(p => p.trim())
                            .filter(p => p.length > 0);

                        let currentChunk = '';
                        phrases.forEach(phrase => {
                            if (currentChunk.length + phrase.length + 2 <= 500) {
                                currentChunk += (currentChunk ? ', ' : '') + phrase;
                            } else {
                                if (currentChunk) chunks.push(currentChunk);
                                currentChunk = phrase;
                            }
                        });
                        if (currentChunk) chunks.push(currentChunk);
                    }
                });
                return chunks;
            }

            // Final fallback: split by word count
            const words = cleanText.split(' ');
            const chunks: string[] = [];
            const wordsPerChunk = 100; // Reduced for more reliable synthesis

            for (let i = 0; i < words.length; i += wordsPerChunk) {
                const chunk = words.slice(i, i + wordsPerChunk).join(' ');
                if (chunk.trim()) {
                    chunks.push(chunk.trim());
                }
            }
            return chunks;
        }

        // Group sentences into chunks
        const chunks: string[] = [];
        let currentChunk = '';
        const maxChunkLength = 500; // Reduced from 800 for more reliable synthesis

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();
            if (!sentence) continue;

            // Add period back if it was removed by split and doesn't end with punctuation
            const formattedSentence = /[.!?]$/.test(sentence)
                ? sentence
                : sentence + '.';

            // Check if adding this sentence would exceed the limit
            const potentialLength = currentChunk.length + (currentChunk ? 1 : 0) + formattedSentence.length;

            if (potentialLength <= maxChunkLength) {
                currentChunk += (currentChunk ? ' ' : '') + formattedSentence;
            } else {
                // If current chunk is not empty, save it
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }

                // If the sentence itself is too long, split it further
                if (formattedSentence.length > maxChunkLength) {
                    const words = formattedSentence.split(' ');
                    let tempChunk = '';

                    for (const word of words) {
                        if (tempChunk.length + word.length + 1 <= maxChunkLength) {
                            tempChunk += (tempChunk ? ' ' : '') + word;
                        } else {
                            if (tempChunk) chunks.push(tempChunk);
                            tempChunk = word;
                        }
                    }
                    currentChunk = tempChunk;
                } else {
                    currentChunk = formattedSentence;
                }
            }
        }

        // Add the last chunk
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        // Filter out very short chunks and combine them
        const filteredChunks: string[] = [];
        let shortChunkBuffer = '';

        for (const chunk of chunks) {
            if (chunk.length < 50 && shortChunkBuffer.length + chunk.length < maxChunkLength) {
                shortChunkBuffer += (shortChunkBuffer ? ' ' : '') + chunk;
            } else {
                if (shortChunkBuffer) {
                    filteredChunks.push(shortChunkBuffer);
                    shortChunkBuffer = '';
                }
                filteredChunks.push(chunk);
            }
        }

        if (shortChunkBuffer) {
            filteredChunks.push(shortChunkBuffer);
        }

        console.log(`Text chunking complete: ${cleanText.length} chars -> ${filteredChunks.length} chunks`);
        return filteredChunks.filter(chunk => chunk.length > 0);
    };

    async function generateAudio(playing: boolean) {
        setIsPlaying(playing);

        if (!textChunks.length) {
            return;
        }

        processingRef.current = true;
        console.log(currentChunkIndex);
        recordedChunksRef.current = [];

        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 44100
            });

            const destination = audioContextRef.current.createMediaStreamDestination();
            const mediaRecorder = new MediaRecorder(destination.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                    console.log(`Recorded chunk: ${event.data.size} bytes`);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log(`Recording stopped. Total chunks: ${recordedChunksRef.current.length}`);

                try {
                    if (recordedChunksRef.current.length === 0) {
                        throw new Error('No audio data was recorded');
                    }

                    const audioBlob = new Blob(recordedChunksRef.current, {type: 'audio/webm'});
                    console.log(`Created audio blob: ${audioBlob.size} bytes`);

                    let finalBlob = audioBlob;
                    let fileName = `${file?.name?.replace(/\.[^/.]+$/, '') || 'converted'}_audio`;

                    if (lamejsLib && audioBlob.size > 0) {
                        try {
                            console.log('Converting to MP3...');
                            finalBlob = await convertToMp3(audioBlob);
                            fileName += '.mp3';
                            console.log(`MP3 conversion successful: ${finalBlob.size} bytes`);
                        } catch (mp3Error) {
                            console.warn('MP3 conversion failed, using original format:', mp3Error);
                            fileName += '.webm';
                            finalBlob = audioBlob;
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
                    console.error('Audio processing error:', error);
                    setError(`Failed to process audio: ${errorMessage}`);
                } finally {
                    processingRef.current = false;
                    setIsConverting(false);
                }
            };


        }
        catch (error) {
            console.log(error);
        }
    }

    const processAllChunksImproved = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            const totalChunks = textChunks.length;
            let processedChunks = 0;

            console.log(`Starting to process ${totalChunks} chunks`);

            const processChunk = (chunkIndex: number): Promise<void> => {
                return new Promise((resolveChunk) => {
                    if (chunkIndex >= totalChunks) {
                        console.log('All chunks processed successfully');
                        resolve();
                        return;
                    }

                    const chunkText = textChunks[chunkIndex];
                    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}: ${chunkText.substring(0, 50)}...`);

                    // Cancel any previous speech
                    speechSynthesis.cancel();

                    // Short delay to ensure clean state
                    setTimeout(() => {
                        const utterance = new SpeechSynthesisUtterance(chunkText);

                        if (voice) utterance.voice = voice;
                        utterance.rate = rate;
                        utterance.pitch = pitch;
                        utterance.volume = volume;

                        let hasCompleted = false;

                        const completeChunk = () => {
                            if (hasCompleted) return;
                            hasCompleted = true;

                            processedChunks++;
                            setCurrentChunkIndex(processedChunks);
                            setProgress((processedChunks / totalChunks) * 100);

                            console.log(`Completed chunk ${processedChunks}/${totalChunks}`);

                            // Process next chunk
                            if (processedChunks < totalChunks) {
                                setTimeout(() => {
                                    processChunk(processedChunks).then(resolveChunk);
                                }, 10);
                            } else {
                                resolveChunk();
                            }
                        };

                        const handleError = (event: SpeechSynthesisErrorEvent) => {
                            completeChunk();
                        };

                        // Safety timeout
                        const timeoutDuration = Math.max((chunkText.length / 8) * (1 / rate) * 1000, 5000);
                        const timeoutId = setTimeout(() => {
                            console.warn(`Chunk ${chunkIndex + 1} timed out`);
                            speechSynthesis.cancel();
                            completeChunk();
                        }, timeoutDuration);

                        utterance.onend = () => {
                            clearTimeout(timeoutId);
                            completeChunk();
                        };

                        utterance.onerror = (event) => {
                            clearTimeout(timeoutId);
                            handleError(event);
                        };

                        speechSynthesis.speak(utterance);

                    }, 200);
                });
            };

            // Start processing from chunk 0
            processChunk(0);
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
        console.log("playing", isPlaying)
        if (isPlaying) {
            speechSynthesis.pause();
            generateAudio(false);
        } else if (!isPlaying) {
            speechSynthesis.resume();
            generateAudio(true);
        } else {
            generateAudio(true);
            // Start from saved position
            playTextLive(savedChunkIndex);
        }
    };

    const playTextLive = async (startIndex: number = 0) => {
        if (!textChunks.length) return;

        let currentIndex = startIndex;
        setCurrentChunkIndex(currentIndex);

        const speakChunk = () => {
            // Check if we should stop (either finished or manually stopped)
            if (currentIndex >= textChunks.length) {
                generateAudio(false);
                setSavedChunkIndex(0); // Reset when finished
                return;
            }

            // Check if playback was stopped
            if (!isPlaying) {
                setSavedChunkIndex(currentIndex);
                return;
            }

            const utterance = new SpeechSynthesisUtterance(textChunks[currentIndex]);

            if (voice) utterance.voice = voice;
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = volume;

            utterance.onend = () => {
                currentIndex++;
                setCurrentChunkIndex(currentIndex);
                setSavedChunkIndex(currentIndex);

                // Continue to next chunk if still playing
                if (isPlaying) {
                    setTimeout(speakChunk, 10);
                }
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                generateAudio(false);
                setSavedChunkIndex(currentIndex);
            };

            setCurrentUtterance(utterance);
            speechSynthesis.speak(utterance);
        };

        speakChunk();
    };

    const stopPlayback = () => {
        speechSynthesis.cancel();
        generateAudio(false);
        // Save the current position when stopping
        setSavedChunkIndex(currentChunkIndex);
    };

    const resetPlayback = () => {
        speechSynthesis.cancel();
        generateAudio(false);
        setCurrentChunkIndex(0);
        setSavedChunkIndex(0);
    };

    const resetToBeginning = () => {
        speechSynthesis.cancel();
        generateAudio(false);
        setCurrentChunkIndex(0);
        setSavedChunkIndex(0);
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
                                <span>
                                    {isExtracting ? 'Extracting text...' :
                                        `Converting to audio... (${currentChunkIndex}/${textChunks.length} segments)`}
                                </span>
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
                                {isExtracting ? 'Extracting...' : 'Extract Text'}
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
                                {extractedText.substring(0, 1000)}
                                {extractedText.length > 1000 && '...'}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {extractedText.length.toLocaleString()} characters | {textChunks.length} speech segments
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
                                    {isPlaying ? 'Pause' : !isPlaying ? 'Resume' : 'Play Live'}
                                </button>

                                <button
                                    onClick={stopPlayback}
                                    disabled={!isPlaying}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Square className="w-4 h-4" />
                                    Stop
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

                            {(isConverting) && (
                                <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                                    <p><strong>Status:</strong> {isPlaying ? 'Playing' : !isPlaying ? 'Paused' : 'Converting'}</p>
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