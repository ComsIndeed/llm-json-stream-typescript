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
export class PropertyDelegate {
    propertyPath;
    parserController;
    onComplete;
    isDone = false;
    constructor(propertyPath, parserController, onComplete) {
        this.propertyPath = propertyPath;
        this.parserController = parserController;
        this.onComplete = onComplete;
    }
    /**
     * Returns whether this delegate has finished parsing.
     */
    get done() {
        return this.isDone;
    }
    /**
     * Creates a new property path by appending to the current path.
     */
    newPath(path) {
        return this.propertyPath.length === 0
            ? path
            : `${this.propertyPath}.${path}`;
    }
    /**
     * Adds a chunk of value to the property stream.
     */
    addPropertyChunk(value, innerPath) {
        this.parserController.addPropertyChunk({
            chunk: value,
            propertyPath: innerPath ?? this.propertyPath,
        });
    }
    /**
     * Called when a chunk from the input stream ends.
     * Allows delegates to handle incomplete values that span chunks.
     */
    onChunkEnd() {
        // Default implementation does nothing
    }
}
//# sourceMappingURL=property_delegate.js.map