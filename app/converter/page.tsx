"use client";

import React, {useEffect, useRef, useState} from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { AlertCircle, CheckCircle, Play, Settings, Square, Upload } from "lucide-react";

import { PDFLib, LameJS } from "./convertHandler";

const Converter = () => {
    const [file, setFile] = useState<File | null>(null);
    const [extractedText, setExtractedText] = useState<string>("");
    const [isExtracting, setIsExtracting] = useState<boolean>(false);
    const [, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [volume, setVolume] = useState<number>(0.8);
    const [rate, setRate] = useState<number>(1);
    const [pitch, setPitch] = useState<number>(1);
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const [textChunks, setTextChunks] = useState<string[]>([]);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const isPlayingRef = useRef(false);
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
    const [savedChunkIndex, setSavedChunkIndex] = useState<number>(0); // Track saved position
    const [pdfLib, setPdfLib] = useState<PDFLib | null>(null);
    const [, setLamejsLib] = useState<LameJS | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadPdfJs = async () => {
            try {
                if (window.pdfjsLib) {
                    setPdfLib(window.pdfjsLib);
                    return;
                }

                const script = document.createElement("script");
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

                const loadPromise = new Promise<void>((resolve) => {
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

        loadPdfJs().then();
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

                const loadPromise = new Promise<void>((resolve) => {
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

        loadLameJs().then();
    }, []);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            setVoices(availableVoices);
            if (availableVoices.length > 0 && !voice) {
                const englishVoice = availableVoices.find(v => v.lang.startsWith("en-US")) ||
                    availableVoices.find(v => v.lang.startsWith("en")) ||
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
        const validTypes = [".pdf", ".epub", ".txt"];
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

            text = cleanText(text);

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

    const cleanText = (text: string): string => {
        // Normalize whitespace first
        let cleaned = text.replace(/\s+/g, ' ').trim();

        if (cleaned.length === 0) return '';

        // Find the actual content start - skip copyright and table of contents
        let startIndex = 0;

        // Look for the actual content start patterns
        const contentPatterns = [
            /PROLOGUE\s+[A-Z]/i,  // PROLOGUE followed by capital letter (actual content)
            /CHAPTER\s+1\s+[A-Z]/i,  // CHAPTER 1 followed by capital letter
            /CHAPTER\s+ONE\s+[A-Z]/i,  // CHAPTER ONE followed by capital letter
            /PART\s+1\s+[A-Z]/i,  // PART 1 followed by capital letter
            /PART\s+ONE\s+[A-Z]/i   // PART ONE followed by capital letter
        ];

        for (const pattern of contentPatterns) {
            const match = cleaned.match(pattern);
            if (match && match.index !== undefined) {
                startIndex = match.index;
                console.log(`Starting content at: "${cleaned.slice(startIndex, startIndex + 50)}..."`);
                break;
            }
        }

        // Return the cleaned text starting from actual content
        return cleaned.slice(startIndex);
    };

    const splitTextIntoChunks = (inText: string): string[] => {
        const text = cleanText(inText);
        // Fast cleanup: normalize whitespace and remove non-sentence-safe characters
        const cleaned: string = text
            .replace(/[^\w\s.,!?;:()\-'"]/g, '') // remove unsafe characters
            .replace(/\s+/g, ' ') // collapse whitespace
            .trim();

        if (cleaned.length === 0) return [];

        // Find and skip table of contents
        const tocPatterns = [
            /table\s+of\s+contents/i,
            /contents/i,
            /chapter\s+\d+.*?\.\.\./i,
            /part\s+\d+.*?\.\.\./i,
            /section\s+\d+.*?\.\.\./i,
            /^\s*\d+\.\s+.*?\.\.\./im, // numbered items with dots
            /^\s*chapter\s+\d+/im,
            /^\s*part\s+[ivx]+/im // Roman numerals
        ];

        let startIndex = 0;
        let tocEndIndex = -1;

        // Look for table of contents patterns
        for (const pattern of tocPatterns) {
            const match = cleaned.match(pattern);
            if (match) {
                const tocStart = match.index || 0;

                // Find the end of TOC by looking for:
                // 1. First actual chapter/section start
                // 2. Multiple consecutive lines without dots
                // 3. A paragraph that's longer than typical TOC entries

                let searchStart = tocStart + match[0].length;
                let foundEnd = false;

                // Method 1: Look for chapter/section beginning
                const chapterPatterns = [
                    /(?:^|\n\s*)(chapter\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)(?:\s|$))/i,
                    /(?:^|\n\s*)(part\s+(?:one|two|three|four|five|i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)(?:\s|$))/i,
                    /(?:^|\n\s*)(section\s+(?:one|two|three|four|five|\d+)(?:\s|$))/i,
                    /(?:^|\n\s*)(\d+\.\s+[A-Z])/,
                    /(?:^|\n\s*)(introduction|foreword|preface|prologue)(?:\s|$)/i
                ];

                for (const chapterPattern of chapterPatterns) {
                    const chapterMatch = cleaned.slice(searchStart).match(chapterPattern);
                    if (chapterMatch && chapterMatch.index !== undefined) {
                        tocEndIndex = searchStart + chapterMatch.index;
                        foundEnd = true;
                        break;
                    }
                }

                // Method 2: Look for end of dotted lines pattern
                if (!foundEnd) {
                    const lines = cleaned.slice(searchStart).split('\n');
                    let consecutiveNonDottedLines = 0;
                    let currentPos = searchStart;

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        currentPos += line.length + 1; // +1 for newline

                        if (trimmedLine.length === 0) {
                            continue;
                        }

                        // Check if line looks like TOC entry (has dots, page numbers, etc.)
                        const isTocLine = /\.{2,}|\d+\s*$|^\s*\d+\.\s+/.test(trimmedLine);

                        if (!isTocLine && trimmedLine.length > 50) {
                            consecutiveNonDottedLines++;
                            if (consecutiveNonDottedLines >= 2) {
                                tocEndIndex = currentPos - line.length - 1;
                                foundEnd = true;
                                break;
                            }
                        } else {
                            consecutiveNonDottedLines = 0;
                        }
                    }
                }

                // If we found TOC but not the end, skip a reasonable amount
                if (!foundEnd) {
                    const tocText = cleaned.slice(tocStart);
                    const firstParagraphEnd = tocText.indexOf('\n\n');
                    if (firstParagraphEnd > 0) {
                        tocEndIndex = tocStart + firstParagraphEnd;
                    } else {
                        tocEndIndex = Math.min(tocStart + 2000, cleaned.length);
                    }
                }

                break;
            }
        }

        // Set start index after TOC
        if (tocEndIndex > 0) {
            startIndex = tocEndIndex;
            console.log(`Skipping table of contents, starting at character ${startIndex}`);
        }

        // Get the text after TOC
        const textToProcess = cleaned.slice(startIndex);

        const chunks: string[] = [];
        let current = '';
        const maxChunkSize = 200; // Optimal size for speech synthesis

        for (let i = 0; i < textToProcess.length; i++) {
            const c = textToProcess[i];
            current += c;

            // Check for sentence boundaries
            const isSentenceEnd = (c === '.' || c === '!' || c === '?') &&
                (i === textToProcess.length - 1 || textToProcess[i + 1] === ' ');

            // Create chunk if we hit sentence boundary and have reasonable length
            if (isSentenceEnd && current.trim().length > 20) {
                const trimmed = current.trim();
                if (trimmed.length > 0) {
                    chunks.push(trimmed);
                    current = '';
                }
            }
            // Force chunk if it gets too long (break at word boundary)
            else if (current.length > maxChunkSize) {
                const lastSpace = current.lastIndexOf(' ');
                if (lastSpace > 0) {
                    const chunk = current.slice(0, lastSpace).trim();
                    if (chunk.length > 0) {
                        chunks.push(chunk);
                        current = current.slice(lastSpace + 1);
                    }
                }
            }
        }

        // Add any remaining text
        const finalTrimmed = current.trim();
        if (finalTrimmed.length > 0) {
            chunks.push(finalTrimmed);
        }

        console.log(`Created ${chunks.length} chunks, skipped ${startIndex} characters`);
        return chunks;
    };


    const playLive = () => {
        speechSynthesis.cancel();
        setIsPlaying(true);
        isPlayingRef.current = true;
        playTextLive(savedChunkIndex).then();
    };


    const playTextLive = async (startIndex: number = 0) => {
        if (!textChunks.length) return;

        let currentIndex = startIndex;
        setCurrentChunkIndex(currentIndex);

        const speakChunk = () => {
            if (currentIndex >= textChunks.length) {
                setIsPlaying(false);
                setSavedChunkIndex(0);
                return;
            }

            if (!isPlayingRef) {
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

                if (isPlayingRef) {
                    setTimeout(speakChunk, 10);
                }
            };

            utterance.onerror = () => {
                setIsPlaying(false);
                setSavedChunkIndex(currentIndex);
            };

            setCurrentUtterance(utterance);
            speechSynthesis.speak(utterance);
        };

        speakChunk();
    };

    const stopPlayback = () => {
        speechSynthesis.cancel();
        setIsPlaying(false);
        isPlayingRef.current = false;
        setSavedChunkIndex(currentChunkIndex);
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
                    <div className="mb-6">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.epub,.txt" className="hidden"/>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">
                                Upload a PDF, EPUB, or TXT file
                            </p>
                            <button onClick={() => fileInputRef.current?.click()}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Choose File
                            </button>

                            {file && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-medium">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {(isExtracting) && (
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
                                {isExtracting ? "Extracting..." : "Extract Text"}
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
                            <h3 className="text-lg font-semibold mb-2">Book</h3>
                            <div className="bg-gray-100 p-4 rounded-lg max-h-40 overflow-y-auto text-sm">
                                {extractedText}
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
                                    disabled={isExtracting || isPlaying}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {<Play className="w-4 h-4" />}
                                    Play
                                </button>

                                <button
                                    onClick={stopPlayback}
                                    disabled={!isPlaying}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Square className="w-4 h-4" />
                                    Stop
                                </button>
                            </div>

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

                </div>
            </div>
            <Footer/>
        </div>
    );
};

export default Converter;