interface SVGOptions {
    width: number;
    height: number;
    viewBox: string;
    xmlns: string;
}

interface RenderableElement {
    toSVG(): SVGElement;
}

export class SVGEngine {
    private svgElement: SVGSVGElement;
    private container: HTMLElement | null;
    private elements: RenderableElement[];

    constructor() {
        this.elements = [];
        this.container = document.getElementById('svg-container');
        this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.initialize();
    }

    private initialize(): void {
        if (!this.container) {
            throw new Error('SVG container element not found');
        }

        const options: SVGOptions = {
            width: this.container.clientWidth,
            height: this.container.clientHeight,
            viewBox: `0 0 ${this.container.clientWidth} ${this.container.clientHeight}`,
            xmlns: 'http://www.w3.org/2000/svg'
        };

        Object.entries(options).forEach(([key, value]) => {
            this.svgElement.setAttribute(key, value.toString());
        });

        this.container.appendChild(this.svgElement);
    }

    public addElement(element: RenderableElement): void {
        this.elements.push(element);
    }

    public clear(): void {
        while (this.svgElement.firstChild) {
            this.svgElement.removeChild(this.svgElement.firstChild);
        }
        this.elements = [];
    }

    public render(): void {
        this.clear();
        this.elements.forEach(element => {
            const svgElement = element.toSVG();
            this.svgElement.appendChild(svgElement);
        });
    }

    public resize(): void {
        if (!this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.svgElement.setAttribute('width', width.toString());
        this.svgElement.setAttribute('height', height.toString());
        this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);

        this.render();
    }

    public exportSVG(): string {
        const serializer = new XMLSerializer();
        return serializer.serializeToString(this.svgElement);
    }

    public setViewBox(x: number, y: number, width: number, height: number): void {
        this.svgElement.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    }

    public getElement(): SVGSVGElement {
        return this.svgElement;
    }
}