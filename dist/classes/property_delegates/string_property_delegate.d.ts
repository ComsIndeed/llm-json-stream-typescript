/**
 * Delegate for parsing JSON string values.
 * Handles escape sequences and streaming of string content.
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
export declare class StringPropertyDelegate extends PropertyDelegate {
    private buffer;
    private isEscaping;
    private firstCharacter;
    constructor(propertyPath: string, parserController: JsonStreamParserController, onComplete?: () => void);
    addCharacter(character: string): void;
    onChunkEnd(): void;
}
//# sourceMappingURL=string_property_delegate.d.ts.map