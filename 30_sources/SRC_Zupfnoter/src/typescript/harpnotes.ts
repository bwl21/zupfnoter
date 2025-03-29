interface Point {
    x: number;
    y: number;
}

interface NotePosition {
    row: number;
    column: number;
}

interface HarpString {
    number: number;
    pitch: string;
    octave: number;
}

interface Note {
    pitch: string;
    octave: number;
    duration: number;
    position: NotePosition;
    timestamp: number;
}

export class HarpNotes {
    private strings: HarpString[];
    private notes: Note[];
    private layout: Map<string, Point>;
    private timeSignature: [number, number];
    private tempo: number;

    constructor() {
        this.strings = [];
        this.notes = [];
        this.layout = new Map();
        this.timeSignature = [4, 4];
        this.tempo = 120;
        this.initializeStrings();
    }

    private initializeStrings(): void {
        // Initialize standard harp string configuration
        const standardTuning = [
            { number: 1, pitch: 'C', octave: 4 },
            { number: 2, pitch: 'D', octave: 4 },
            { number: 3, pitch: 'E', octave: 4 },
            { number: 4, pitch: 'F', octave: 4 },
            { number: 5, pitch: 'G', octave: 4 },
            { number: 6, pitch: 'A', octave: 4 },
            { number: 7, pitch: 'B', octave: 4 },
            // Add more strings as needed
        ];

        this.strings = standardTuning;
    }

    public addNote(note: Omit<Note, 'position' | 'timestamp'>): void {
        const position = this.calculateNotePosition(note.pitch, note.octave);
        const timestamp = this.calculateTimestamp();

        this.notes.push({
            ...note,
            position,
            timestamp
        });
    }

    private calculateNotePosition(pitch: string, octave: number): NotePosition {
        // Calculate the position based on pitch and octave
        const string = this.findString(pitch, octave);
        return {
            row: Math.floor(string.number / 7),
            column: string.number % 7
        };
    }

    private findString(pitch: string, octave: number): HarpString {
        const string = this.strings.find(s => s.pitch === pitch && s.octave === octave);
        if (!string) {
            throw new Error(`No string found for note ${pitch}${octave}`);
        }
        return string;
    }

    private calculateTimestamp(): number {
        // Calculate timestamp based on current notes and tempo
        const lastNote = this.notes[this.notes.length - 1];
        if (!lastNote) return 0;

        return lastNote.timestamp + lastNote.duration;
    }

    public setTimeSignature(numerator: number, denominator: number): void {
        this.timeSignature = [numerator, denominator];
    }

    public setTempo(bpm: number): void {
        this.tempo = bpm;
    }

    public getNotes(): Note[] {
        return [...this.notes];
    }

    public getStrings(): HarpString[] {
        return [...this.strings];
    }

    public clear(): void {
        this.notes = [];
    }

    public toJSON(): object {
        return {
            strings: this.strings,
            notes: this.notes,
            timeSignature: this.timeSignature,
            tempo: this.tempo
        };
    }

    public fromJSON(data: any): void {
        this.strings = data.strings || [];
        this.notes = data.notes || [];
        this.timeSignature = data.timeSignature || [4, 4];
        this.tempo = data.tempo || 120;
    }

    // Layout management methods
    public setLayout(layoutName: string, position: Point): void {
        this.layout.set(layoutName, position);
    }

    public getLayout(layoutName: string): Point | undefined {
        return this.layout.get(layoutName);
    }

    // Analysis methods
    public getDuration(): number {
        if (this.notes.length === 0) return 0;
        const lastNote = this.notes[this.notes.length - 1];
        return lastNote.timestamp + lastNote.duration;
    }

    public getRange(): { min: number; max: number } {
        const octaves = this.notes.map(note => note.octave);
        return {
            min: Math.min(...octaves),
            max: Math.max(...octaves)
        };
    }

    // Validation methods
    public validate(): boolean {
        return this.notes.every(note => {
            try {
                this.findString(note.pitch, note.octave);
                return true;
            } catch {
                return false;
            }
        });
    }
}