/**
 * Delegate for parsing JSON array/list values.
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
export declare class ListPropertyDelegate extends PropertyDelegate {
    private static readonly VALUE_FIRST_CHARACTERS;
    private state;
    private index;
    private isFirstCharacter;
    private activeChildDelegate;
    private currentList;
    /** Tracks which elements have been filled with their final values */
    private elementPaths;
    constructor(propertyPath: string, parserController: JsonStreamParserController, onComplete?: () => void);
    private get currentElementPath();
    onChunkEnd(): void;
    addCharacter(character: string): void;
    private createDelegate;
    private completeList;
}
//# sourceMappingURL=list_property_delegate.d.ts.map