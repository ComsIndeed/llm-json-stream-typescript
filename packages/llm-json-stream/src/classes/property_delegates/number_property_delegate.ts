/**
 * Delegate for parsing JSON number values.
 * Handles integers, floating point, and scientific notation.
 */

import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";

export class NumberPropertyDelegate extends PropertyDelegate {
    private buffer = "";

    constructor(
        propertyPath: string,
        parserController: JsonStreamParserController,
        onComplete?: () => void,
    ) {
        super(propertyPath, parserController, onComplete);
    }

    addCharacter(character: string): void {
        // Check if this is a delimiter that ends the number
        if (
            character === "," ||
            character === "}" ||
            character === "]" ||
            character === " " ||
            character === "\n" ||
            character === "\r" ||
            character === "\t"
        ) {
            if (this.buffer.length > 0 && !this.isDone) {
                this.isDone = true; // Mark done BEFORE completing to prevent re-entry
                this.completeNumber();
                this.onComplete?.();
            }
            // Don't consume the character - let the parent handle delimiters
            // The parent will reprocess this character after seeing isDone=true
            return;
        }

        // Valid number characters: digits, minus sign, decimal point, exponent
        if (this.isValidNumberCharacter(character)) {
            this.buffer += character;
        }
    }

    private isValidNumberCharacter(character: string): boolean {
        return (
            character === "-" ||
            character === "+" ||
            character === "." ||
            character === "e" ||
            character === "E" ||
            (character >= "0" && character <= "9")
        );
    }

    private completeNumber(): void {
        if (this.buffer.length === 0) return; // Defensive check

        const number = parseFloat(this.buffer);

        // Complete the controller directly (number emits once)
        this.parserController.completeProperty(this.propertyPath, number);

        this.buffer = ""; // Clear buffer to prevent re-use
    }

    override onChunkEnd(): void {
        // Numbers don't emit partial chunks like strings do
    }
}
