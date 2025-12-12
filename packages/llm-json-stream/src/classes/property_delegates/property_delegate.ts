/**
 * Property delegates are workers that navigate different JSON tokens.
 * They are responsible for:
 * - Accumulating characters
 * - Emitting to property streams
 * - Handling chunk ends
 * - Signaling completion
 * - Creating child delegates as needed
 * - Updating the master parser's state via the controller
 */

import { JsonStreamParserController } from "../json_stream_parser.js";

/**
 * Base class for all property delegates.
 * Delegates mutate the master parser's state machine as characters are fed to them.
 */
export abstract class PropertyDelegate {
    protected isDone = false;

    constructor(
        protected propertyPath: string,
        protected parserController: JsonStreamParserController,
        protected onComplete?: () => void,
    ) {}

    /**
     * Returns whether this delegate has finished parsing.
     */
    get done(): boolean {
        return this.isDone;
    }

    /**
     * Creates a new property path by appending to the current path.
     */
    protected newPath(path: string): string {
        return this.propertyPath.length === 0
            ? path
            : `${this.propertyPath}.${path}`;
    }

    /**
     * Adds a chunk of value to the property stream.
     */
    protected addPropertyChunk<T>(value: T, innerPath?: string): void {
        this.parserController.addPropertyChunk({
            chunk: value,
            propertyPath: innerPath ?? this.propertyPath,
        });
    }

    /**
     * Processes a single character from the input stream.
     */
    abstract addCharacter(character: string): void;

    /**
     * Called when a chunk from the input stream ends.
     * Allows delegates to handle incomplete values that span chunks.
     */
    onChunkEnd(): void {
        // Default implementation does nothing
    }
}
