import { HarpNotes } from './harpnotes';

interface ABCNote {
    pitch: string;
    octave: number;
    duration: number;
    accidental?: string;
    tied?: boolean;
}

interface ABCHeader {
    key?: string;
    meter?: string;
    tempo?: number;
    title?: string;
    composer?: string;
}

interface ABCTune {
    header: ABCHeader;
    notes: ABCNote[];
}

export class ABCToHarpNotesFactory {
    private static instance: ABCToHarpNotesFactory;
    private parser: any; // Reference to ABC parser implementation

    private constructor() {
        // Initialize ABC parser
        this.initializeParser();
    }

    public static getInstance(): ABCToHarpNotesFactory {
        if (!ABCToHarpNotesFactory.instance) {
            ABCToHarpNotesFactory.instance = new ABCToHarpNotesFactory();
        }
        return ABCToHarpNotesFactory.instance;
    }

    private initializeParser(): void {
        // Initialize ABC parser implementation
        // This would typically integrate with abc2svg or a similar library
    }

    public createFromABC(abcString: string): HarpNotes {
        const parsedTune = this.parseABC(abcString);
        return this.convertToHarpNotes(parsedTune);
    }

    private parseABC(abcString: string): ABCTune {
        // Parse ABC notation string into structured data
        // This would use the ABC parser implementation
        try {
            // Placeholder for actual parsing logic
            const header = this.parseHeader(abcString);
            const notes = this.parseNotes(abcString);

            return {
                header,
                notes
            };
        } catch (error) {
            throw new Error(`Failed to parse ABC notation: ${error}`);
        }
    }

    private parseHeader(abcString: string): ABCHeader {
        const header: ABCHeader = {};
        
        // Extract header information using regex
        const keyMatch = abcString.match(/K:\s*([A-G][#b]?\s*(?:maj|min|m)?)/i);
        if (keyMatch) header.key = keyMatch[1];

        const meterMatch = abcString.match(/M:\s*(\d+\/\d+)/i);
        if (meterMatch) header.meter = meterMatch[1];

        const tempoMatch = abcString.match(/Q:\s*(\d+)/i);
        if (tempoMatch) header.tempo = parseInt(tempoMatch[1], 10);

        const titleMatch = abcString.match(/T:\s*(.+)$/m);
        if (titleMatch) header.title = titleMatch[1].trim();

        const composerMatch = abcString.match(/C:\s*(.+)$/m);
        if (composerMatch) header.composer = composerMatch[1].trim();

        return header;
    }

    private parseNotes(abcString: string): ABCNote[] {
        // Extract and parse the notes from the ABC notation
        // This is a simplified implementation
        const notes: ABCNote[] = [];
        
        // Remove header lines and extract music lines
        const musicLines = abcString
            .split('\n')
            .filter(line => !line.match(/^[A-Z]:/))
            .join(' ');

        // Basic note pattern: [accidental][pitch][octave][duration]
        const notePattern = /([_^])?([A-Ga-g])(,+|'+)?(\d+)?/g;
        let match;

        while ((match = notePattern.exec(musicLines)) !== null) {
            const [_, accidental, pitch, octaveMarks, duration] = match;
            
            // Calculate octave based on marks (, for lower, ' for higher)
            let octave = 4; // Default octave
            if (octaveMarks) {
                octave += (octaveMarks.includes("'") ? 1 : -1) * octaveMarks.length;
            }

            notes.push({
                pitch: pitch.toUpperCase(),
                octave,
                duration: duration ? parseInt(duration, 10) : 1,
                accidental: accidental || undefined
            });
        }

        return notes;
    }

    private convertToHarpNotes(tune: ABCTune): HarpNotes {
        const harpNotes = new HarpNotes();

        // Set basic properties from header
        if (tune.header.tempo) {
            harpNotes.setTempo(tune.header.tempo);
        }

        if (tune.header.meter) {
            const [numerator, denominator] = tune.header.meter.split('/').map(Number);
            harpNotes.setTimeSignature(numerator, denominator);
        }

        // Convert notes
        tune.notes.forEach(note => {
            try {
                harpNotes.addNote({
                    pitch: note.pitch,
                    octave: note.octave,
                    duration: this.convertDuration(note.duration)
                });
            } catch (error) {
                console.warn(`Skipping note ${note.pitch}${note.octave}: ${error}`);
            }
        });

        return harpNotes;
    }

    private convertDuration(abcDuration: number): number {
        // Convert ABC duration to internal duration representation
        // This is a simplified conversion - actual implementation would be more complex
        return 1 / abcDuration;
    }
}