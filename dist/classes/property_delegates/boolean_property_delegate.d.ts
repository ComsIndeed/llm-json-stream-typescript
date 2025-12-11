/**
 * Delegate for parsing JSON boolean values (true/false).
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
export declare class BooleanPropertyDelegate extends PropertyDelegate {
    private buffer;
    private expectedValue;
    constructor(propertyPath: string, parserController: JsonStreamParserController, onComplete?: () => void);
    addCharacter(character: string): void;
}
//# sourceMappingURL=boolean_property_delegate.d.ts.map