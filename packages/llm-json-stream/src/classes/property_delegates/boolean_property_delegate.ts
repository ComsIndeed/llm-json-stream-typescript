/**
 * Delegate for parsing JSON boolean values (true/false).
 */

import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";

export class BooleanPropertyDelegate extends PropertyDelegate {
    private buffer = "";
    private expectedValue: boolean | null = null;

    constructor(
        propertyPath: string,
        parserController: JsonStreamParserController,
        onComplete?: () => void,
    ) {
        super(propertyPath, parserController, onComplete);
    }

    addCharacter(character: string): void {
        // Check for delimiters that end the boolean
        if (character === "," || character === "}" || character === "]") {
            if (!this.isDone && this.expectedValue !== null) {
                this.isDone = true;
                this.parserController.completeProperty(
                    this.propertyPath,
                    this.expectedValue,
                );
                this.onComplete?.();
            }
            return;
        }

        // First character determines which boolean we're parsing
        if (this.buffer.length === 0) {
            if (character === "t") {
                this.expectedValue = true;
                this.buffer = "t";
            } else if (character === "f") {
                this.expectedValue = false;
                this.buffer = "f";
            }
            return;
        }

        // Continue building the buffer
        this.buffer += character;

        // Check if we've completed parsing the boolean
        if (this.expectedValue === true && this.buffer === "true") {
            this.isDone = true;
            this.parserController.completeProperty(this.propertyPath, true);
            this.onComplete?.();
        } else if (this.expectedValue === false && this.buffer === "false") {
            this.isDone = true;
            this.parserController.completeProperty(this.propertyPath, false);
            this.onComplete?.();
        }
    }
}
