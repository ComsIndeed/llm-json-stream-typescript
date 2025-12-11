/**
 * Mixin for creating property delegates based on the first character encountered.
 */
import { PropertyDelegate } from "./property_delegates/property_delegate.js";
import { JsonStreamParserController } from "./json_stream_parser.js";
/**
 * Factory function for creating the appropriate delegate based on the first character.
 */
export declare function createDelegate(character: string, propertyPath: string, jsonStreamParserController: JsonStreamParserController, onComplete?: () => void): PropertyDelegate;
//# sourceMappingURL=mixins.d.ts.map