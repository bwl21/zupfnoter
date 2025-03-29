import { jsPDF } from 'jspdf';

interface PDFOptions {
    orientation: 'portrait' | 'landscape';
    unit: 'mm' | 'pt' | 'px' | 'in' | 'cm';
    format: string | [number, number];
}

interface PDFElement {
    render(doc: jsPDF): void;
}

export class PDFEngine {
    private doc: jsPDF;
    private elements: PDFElement[];
    private options: PDFOptions;

    constructor(options: Partial<PDFOptions> = {}) {
        this.options = {
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            ...options
        };

        this.doc = new jsPDF(
            this.options.orientation,
            this.options.unit,
            this.options.format
        );

        this.elements = [];
    }

    public addElement(element: PDFElement): void {
        this.elements.push(element);
    }

    public clear(): void {
        this.elements = [];
        this.doc = new jsPDF(
            this.options.orientation,
            this.options.unit,
            this.options.format
        );
    }

    public render(): void {
        this.elements.forEach(element => {
            element.render(this.doc);
        });
    }

    public addPage(): void {
        this.doc.addPage();
    }

    public save(filename: string = 'document.pdf'): void {
        this.render();
        this.doc.save(filename);
    }

    public getBlob(): Promise<Blob> {
        this.render();
        return this.doc.output('blob');
    }

    public getBase64(): string {
        this.render();
        return this.doc.output('datauristring');
    }

    public setProperties(properties: {
        title?: string;
        subject?: string;
        author?: string;
        keywords?: string;
        creator?: string;
    }): void {
        this.doc.setProperties(properties);
    }

    public getPageCount(): number {
        return this.doc.getNumberOfPages();
    }

    public setPage(pageNumber: number): void {
        this.doc.setPage(pageNumber);
    }

    public getCurrentPage(): number {
        return this.doc.getCurrentPageInfo().pageNumber;
    }
}