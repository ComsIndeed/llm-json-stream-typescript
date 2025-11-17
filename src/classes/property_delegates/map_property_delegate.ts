/**
 * Delegate for parsing JSON object/map values.
 */

import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";

export class MapPropertyDelegate extends PropertyDelegate {
    constructor(
        propertyPath: string,
        parserController: JsonStreamParserController,
        onComplete?: () => void,
    ) {
        super(propertyPath, parserController, onComplete);
    }

    addCharacter(character: string): void {
        // TODO: Implementation
    }

    override onChunkEnd(): void {
        // TODO: Implementation
    }
}
