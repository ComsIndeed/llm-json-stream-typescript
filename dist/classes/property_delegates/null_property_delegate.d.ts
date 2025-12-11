/**
 * Delegate for parsing JSON null values.
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
export declare class NullPropertyDelegate extends PropertyDelegate {
    private buffer;
    constructor(propertyPath: string, parserController: JsonStreamParserController, onComplete?: () => void);
    addCharacter(character: string): void;
}
//# sourceMappingURL=null_property_delegate.d.ts.map