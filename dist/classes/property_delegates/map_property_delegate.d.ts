/**
 * Delegate for parsing JSON object/map values.
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
export declare class MapPropertyDelegate extends PropertyDelegate {
    private state;
    private firstCharacter;
    private keyBuffer;
    private activeChildDelegate;
    private activeChildKey;
    private keys;
    private currentMap;
    constructor(propertyPath: string, parserController: JsonStreamParserController, onComplete?: () => void);
    onChunkEnd(): void;
    addCharacter(character: string): void;
    private createDelegate;
    private completeMap;
}
//# sourceMappingURL=map_property_delegate.d.ts.map