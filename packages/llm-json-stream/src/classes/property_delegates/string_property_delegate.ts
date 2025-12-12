/**
 * Delegate for parsing JSON string values.
 * Handles escape sequences and streaming of string content.
 */

import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";

export class StringPropertyDelegate extends PropertyDelegate {
    private buffer = "";
    private isEscaping = false;
    private firstCharacter = true;

    constructor(
        propertyPath: string,
        parserController: JsonStreamParserController,
        onComplete?: () => void,
    ) {
        super(propertyPath, parserController, onComplete);
    }

    addCharacter(character: string): void {
        // Handle opening quote
        if (this.firstCharacter && character === '"') {
            this.firstCharacter = false;
            return;
        }
        if (this.firstCharacter) {
            throw new Error(
                `StringPropertyDelegate expected starting quote but got: ${character}`,
            );
        }

        // Handle escape sequences
        if (this.isEscaping) {
            switch (character) {
                case '"':
                    this.buffer += '"';
                    break;
                case "\\":
                    this.buffer += "\\";
                    break;
                case "/":
                    this.buffer += "/";
                    break;
                case "b":
                    this.buffer += "\b";
                    break;
                case "f":
                    this.buffer += "\f";
                    break;
                case "n":
                    this.buffer += "\n";
                    break;
                case "r":
                    this.buffer += "\r";
                    break;
                case "t":
                    this.buffer += "\t";
                    break;
                default:
                    // For unknown escape sequences, include both backslash and character
                    this.buffer += "\\";
                    this.buffer += character;
                    break;
            }
            this.isEscaping = false;
            return;
        }

        // Start escape sequence
        if (character === "\\") {
            this.isEscaping = true;
            return;
        }

        // End of string - closing quote
        if (character === '"') {
            this.isDone = true;
            // Emit final chunk if there's any remaining buffer
            if (this.buffer.length > 0) {
                this.addPropertyChunk(this.buffer);
                this.buffer = "";
            }
            // Complete the string controller
            this.parserController.completeProperty(this.propertyPath, "");
            this.onComplete?.();
            return;
        }

        // Regular character - add to buffer
        this.buffer += character;
    }

    override onChunkEnd(): void {
        if (this.buffer.length === 0 || this.isDone) return;

        // Emit accumulated buffer content
        this.addPropertyChunk(this.buffer);
        this.buffer = "";
    }
}
