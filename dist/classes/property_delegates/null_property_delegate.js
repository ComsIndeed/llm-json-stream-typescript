/**
 * Delegate for parsing JSON null values.
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
export class NullPropertyDelegate extends PropertyDelegate {
    buffer = "";
    constructor(propertyPath, parserController, onComplete) {
        super(propertyPath, parserController, onComplete);
    }
    addCharacter(character) {
        // Check for delimiters that end the null
        if (character === "," || character === "}" || character === "]") {
            if (!this.isDone && this.buffer === "null") {
                this.isDone = true;
                this.parserController.completeProperty(this.propertyPath, null);
                this.onComplete?.();
            }
            return;
        }
        // Build the buffer
        this.buffer += character;
        // Check if we've completed parsing null
        if (this.buffer === "null") {
            this.isDone = true;
            this.parserController.completeProperty(this.propertyPath, null);
            this.onComplete?.();
        }
    }
}
//# sourceMappingURL=null_property_delegate.js.map