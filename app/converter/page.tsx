"use client";

import React, {useEffect, useRef, useState} from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { AlertCircle, CheckCircle, Play, Settings, Square, Upload, SkipBack, SkipForward } from "lucide-react";

import { PDFLib, LameJS } from "./convertHandler";

const Converter = () => {
    const [file, setFile] = useState<File | null>(null);
    const [extractedText, setExtractedText] = useState<string>("");
    const [isExtracting, setIsExtracting] = useState<boolean>(false);
    const [, setAudioBlob] = useState<Blob | null>(null);
    const [, setAudioUrl] = useState<string>('');
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
    const [savedChunkIndex, setSavedChunkIndex] = useState<number>(0);
    const [pdfLib, setPdfLib] = useState<PDFLib | null>(null);
    const [, setLamejsLib] = useState<LameJS | null>(null);
    const [, setCurrentWordIndex] = useState<number>(0);
    const [highlightedText, setHighlightedText] = useState<string>("");

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

    useEffect(() => {
        if (textChunks.length > 0 && currentChunkIndex < textChunks.length) {
            updateHighlightedText(currentChunkIndex, 0);
        }
    }, [currentChunkIndex, textChunks]);

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
        setCurrentWordIndex(0);
        setHighlightedText('');
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

            const chunks = splitTextIntoChunks(text);
            setTextChunks(chunks);
            setCurrentChunkIndex(0);
            setSavedChunkIndex(0);
            setCurrentWordIndex(0);

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
        let cleaned = text.replace(/\s+/g, ' ').trim();

        if (cleaned.length === 0) return '';

        let startIndex = 0;

        const contentPatterns = [
            /PROLOGUE\s+[A-Z]/i,
            /CHAPTER\s+1\s+[A-Z]/i,
            /CHAPTER\s+ONE\s+[A-Z]/i,
            /PART\s+1\s+[A-Z]/i,
            /PART\s+ONE\s+[A-Z]/i
        ];

        for (const pattern of contentPatterns) {
            const match = cleaned.match(pattern);
            if (match && match.index !== undefined) {
                startIndex = match.index;
                console.log(`Starting content at: "${cleaned.slice(startIndex, startIndex + 50)}..."`);
                break;
            }
        }

        return cleaned.slice(startIndex);
    };

    const splitTextIntoChunks = (text: string): string[] => {
        const chunks: string[] = [];
        let current = "";

        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            current += c;

            if ((c === '.' || c === '!' || c === '?') && (i === text.length - 1 || text[i + 1] === ' ')) {
                const trimmed = current.trim();
                if (trimmed.length > 0) {
                    chunks.push(trimmed);
                    current = '';
                }
            }
        }

        const finalTrimmed = current.trim();
        if (finalTrimmed.length > 0) {
            chunks.push(finalTrimmed);
        }

        return chunks;
    };

    const updateHighlightedText = (chunkIndex: number, wordIndex: number) => {
        if (chunkIndex >= textChunks.length) return;

        const chunk = textChunks[chunkIndex];
        const words = chunk.split(/(\s+)/);
        const actualWords = words.filter(word => word.trim().length > 0);

        if (wordIndex >= actualWords.length) {
            setHighlightedText(chunk);
            return;
        }

        let highlightedHtml = '';
        let actualWordIndex = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (word.trim().length > 0) {
                if (actualWordIndex === wordIndex) {
                    highlightedHtml += `<span class="bg-yellow-300 font-bold">${word}</span>`;
                } else {
                    highlightedHtml += word;
                }
                actualWordIndex++;
            } else {
                highlightedHtml += word;
            }
        }

        setHighlightedText(highlightedHtml);
    };

    const togglePlayback = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            playLive();
        }
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
                isPlayingRef.current = false;
                setSavedChunkIndex(0);
                setCurrentWordIndex(0);
                return;
            }

            if (!isPlayingRef.current) {
                setSavedChunkIndex(currentIndex);
                return;
            }

            const chunk = textChunks[currentIndex];
            const words = chunk.split(/(\s+)/).filter(word => word.trim().length > 0);
            const utterance = new SpeechSynthesisUtterance(chunk);

            if (voice) utterance.voice = voice;
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = volume;

            let wordIndex = 0;
            utterance.onboundary = (event) => {
                if (event.name === 'word') {
                    setCurrentWordIndex(wordIndex);
                    updateHighlightedText(currentIndex, wordIndex);
                    wordIndex++;
                }
            };

            utterance.onend = () => {
                currentIndex++;
                setCurrentChunkIndex(currentIndex);
                setSavedChunkIndex(currentIndex);
                setCurrentWordIndex(0);

                if (isPlayingRef.current) {
                    setTimeout(speakChunk, 200);
                }
            };

            utterance.onerror = () => {
                setIsPlaying(false);
                isPlayingRef.current = false;
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
        setCurrentWordIndex(0);

        if (currentChunkIndex < textChunks.length) {
            updateHighlightedText(currentChunkIndex, 0);
        }
    };

    const skipBackward = () => {
        const newIndex = Math.max(0, currentChunkIndex - 1);
        setCurrentChunkIndex(newIndex);
        setSavedChunkIndex(newIndex);
        setCurrentWordIndex(0);

        if (isPlaying) {
            speechSynthesis.cancel();
            setTimeout(() => {
                playTextLive(newIndex).then();
            }, 100);
        } else {
            updateHighlightedText(newIndex, 0);
        }
    };

    const skipForward = () => {
        const newIndex = Math.min(textChunks.length - 1, currentChunkIndex + 1);
        setCurrentChunkIndex(newIndex);
        setSavedChunkIndex(newIndex);
        setCurrentWordIndex(0);

        if (isPlaying) {
            speechSynthesis.cancel();
            setTimeout(() => {
                playTextLive(newIndex).then();
            }, 100);
        } else {
            updateHighlightedText(newIndex, 0);
        }
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
                            <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto text-sm">
                                {highlightedText ? (
                                    <div
                                        dangerouslySetInnerHTML={{ __html: highlightedText }}
                                        className="leading-relaxed"
                                    />
                                ) : (
                                    <div className="leading-relaxed">{extractedText}</div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {extractedText.length.toLocaleString()} characters | {textChunks.length} speech segments
                                {textChunks.length > 0 && (
                                    <span className="ml-2">
                                        Current: {currentChunkIndex + 1}/{textChunks.length}
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    {extractedText && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">Audio Controls</h3>

                            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                                <button
                                    onClick={skipBackward}
                                    disabled={isExtracting || currentChunkIndex === 0}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <SkipBack className="w-4 h-4" />
                                    Previous
                                </button>

                                <button
                                    onClick={togglePlayback}
                                    disabled={isExtracting}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    {isPlaying ? 'Stop' : 'Play'}
                                </button>

                                <button
                                    onClick={skipForward}
                                    disabled={isExtracting || currentChunkIndex >= textChunks.length - 1}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <SkipForward className="w-4 h-4" />
                                    Next
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