interface Command {
    execute(...args: any[]): void;
    undo(): void;
    redo(): void;
}

class CommandStack {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    public push(command: Command): void {
        this.undoStack.push(command);
        // Clear redo stack when new command is executed
        this.redoStack = [];
    }

    public undo(): void {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
        }
    }

    public redo(): void {
        const command = this.redoStack.pop();
        if (command) {
            command.redo();
            this.undoStack.push(command);
        }
    }

    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}

export class CommandController {
    private commandStack: CommandStack;
    private commands: Map<string, new (...args: any[]) => Command>;

    constructor() {
        this.commandStack = new CommandStack();
        this.commands = new Map();
    }

    public initialize(): void {
        // Register all available commands
        this.registerCommands();
    }

    private registerCommands(): void {
        // Register all available commands
        // Example: this.commands.set('commandName', CommandClass);
    }

    public execute(commandName: string, ...args: any[]): void {
        const CommandClass = this.commands.get(commandName);
        if (!CommandClass) {
            throw new Error(`Command '${commandName}' not found`);
        }

        const command = new CommandClass(...args);
        command.execute();
        this.commandStack.push(command);
    }

    public undo(): void {
        this.commandStack.undo();
    }

    public redo(): void {
        this.commandStack.redo();
    }

    public registerCommand(name: string, commandClass: new (...args: any[]) => Command): void {
        this.commands.set(name, commandClass);
    }
}