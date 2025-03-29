// Interface for abc2svg library
declare const abc2svg: any;

interface SVGOptions {
    scale?: number;
    responsive?: boolean;
    pageWidth?: number;
    pageHeight?: number;
    staffWidth?: number;
    staffSeparation?: number;
}

interface RenderResult {
    svg: string;
    errors: string[];
    warnings: string[];
}

export class ABC2SVGToHarpNotes {
    private abc2svg: any;
    private options: SVGOptions;
    private errors: string[];
    private warnings: string[];

    constructor(options: SVGOptions = {}) {
        this.options = {
            scale: 1,
            responsive: true,
            pageWidth: 800,
            pageHeight: 1200,
            staffWidth: 700,
            staffSeparation: 60,
            ...options
        };
        this.errors = [];
        this.warnings = [];
        this.initializeABC2SVG();
    }

    private initializeABC2SVG(): void {
        try {
            // Initialize abc2svg with custom configuration
            this.abc2svg = new abc2svg.Abc({
                width: this.options.pageWidth,
                scale: this.options.scale,
                staffsep: this.options.staffSeparation,
                stretchlast: true,
                responsive: this.options.responsive
            });

            // Set up error and warning handlers
            this.abc2svg.onerror = (message: string, line: number, column: number) => {
                this.errors.push(`Error at line ${line}, column ${column}: ${message}`);
            };

            this.abc2svg.onwarn = (message: string, line: number, column: number) => {
                this.warnings.push(`Warning at line ${line}, column ${column}: ${message}`);
            };
        } catch (error) {
            throw new Error(`Failed to initialize abc2svg: ${error}`);
        }
    }

    public convertToSVG(abcNotation: string): RenderResult {
        this.errors = [];
        this.warnings = [];

        try {
            // Create SVG container
            const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgContainer.setAttribute('width', this.options.pageWidth?.toString() || '800');
            svgContainer.setAttribute('height', this.options.pageHeight?.toString() || '1200');

            // Render ABC notation to SVG
            this.abc2svg.tosvg(abcNotation, {
                target: svgContainer,
                scale: this.options.scale,
                width: this.options.staffWidth
            });

            return {
                svg: svgContainer.outerHTML,
                errors: [...this.errors],
                warnings: [...this.warnings]
            };
        } catch (error) {
            this.errors.push(`Conversion error: ${error}`);
            return {
                svg: '',
                errors: [...this.errors],
                warnings: [...this.warnings]
            };
        }
    }

    public validateABC(abcNotation: string): boolean {
        this.errors = [];
        this.warnings = [];

        try {
            // Attempt to parse the ABC notation without rendering
            this.abc2svg.tosvg(abcNotation, { parse_only: true });
            return this.errors.length === 0;
        } catch (error) {
            this.errors.push(`Validation error: ${error}`);
            return false;
        }
    }

    public getErrors(): string[] {
        return [...this.errors];
    }

    public getWarnings(): string[] {
        return [...this.warnings];
    }

    public setOption<K extends keyof SVGOptions>(key: K, value: SVGOptions[K]): void {
        this.options[key] = value;
        // Reinitialize if necessary
        if (['scale', 'pageWidth', 'staffSeparation'].includes(key.toString())) {
            this.initializeABC2SVG();
        }
    }

    public getOptions(): SVGOptions {
        return { ...this.options };
    }

    // Helper method to extract musical information from ABC notation
    public extractMusicalInfo(abcNotation: string): {
        timeSignature?: string;
        key?: string;
        tempo?: number;
        title?: string;
    } {
        const info: {
            timeSignature?: string;
            key?: string;
            tempo?: number;
            title?: string;
        } = {};

        // Extract header information
        const lines = abcNotation.split('\n');
        for (const line of lines) {
            const match = line.match(/^([A-Z]):\s*(.+)$/);
            if (match) {
                const [_, field, value] = match;
                switch (field) {
                    case 'M':
                        info.timeSignature = value.trim();
                        break;
                    case 'K':
                        info.key = value.trim();
                        break;
                    case 'Q':
                        const tempoMatch = value.match(/(\d+)/);
                        if (tempoMatch) {
                            info.tempo = parseInt(tempoMatch[1], 10);
                        }
                        break;
                    case 'T':
                        info.title = value.trim();
                        break;
                }
            }
        }

        return info;
    }
}