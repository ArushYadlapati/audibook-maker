declare global {
    interface Window {
        pdfjsLib?: any;
        lamejs?: any;
        JSZip?: any;
    }
}

export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
}

export interface PDFPageProxy {
    getTextContent(): Promise<{ items: Array<{ str: string }> }>;
}

export interface PDFLib {
    getDocument(params: { data: ArrayBuffer }): { promise: Promise<PDFDocumentProxy> };
    GlobalWorkerOptions: {
        workerSrc: string;
    };
}

export interface LameEncoder {
    encodeBuffer(buffer: Int16Array): Uint8Array;
    flush(): Uint8Array;
}

export interface LameJS {
    Mp3Encoder: new (channels: number, sampleRate: number, bitRate: number) => LameEncoder;
}

export {};