/**
 * Delegate for parsing JSON number values.
 * Handles integers, floating point, and scientific notation.
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
export declare class NumberPropertyDelegate extends PropertyDelegate {
    private buffer;
    constructor(propertyPath: string, parserController: JsonStreamParserController, onComplete?: () => void);
    addCharacter(character: string): void;
    private isValidNumberCharacter;
    private completeNumber;
    onChunkEnd(): void;
}
//# sourceMappingURL=number_property_delegate.d.ts.map