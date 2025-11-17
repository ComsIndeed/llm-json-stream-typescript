/**
 * Mixin for creating property delegates based on the first character encountered.
 */

import { PropertyDelegate } from "./property_delegates/property_delegate.js";
import { StringPropertyDelegate } from "./property_delegates/string_property_delegate.js";
import { NumberPropertyDelegate } from "./property_delegates/number_property_delegate.js";
import { BooleanPropertyDelegate } from "./property_delegates/boolean_property_delegate.js";
import { NullPropertyDelegate } from "./property_delegates/null_property_delegate.js";
import { MapPropertyDelegate } from "./property_delegates/map_property_delegate.js";
import { ListPropertyDelegate } from "./property_delegates/list_property_delegate.js";
import { JsonStreamParserController } from "./json_stream_parser.js";

/**
 * Factory function for creating the appropriate delegate based on the first character.
 */
export function createDelegate(
    character: string,
    propertyPath: string,
    jsonStreamParserController: JsonStreamParserController,
    onComplete?: () => void,
): PropertyDelegate {
    switch (character) {
        case " ":
        case "\n":
        case "\r":
        case "\t":
            throw new Error("Handle whitespace characters in your code.");

        case "{":
            return new MapPropertyDelegate(
                propertyPath,
                jsonStreamParserController,
                onComplete,
            );

        case "[":
            return new ListPropertyDelegate(
                propertyPath,
                jsonStreamParserController,
                onComplete,
            );

        case '"':
            return new StringPropertyDelegate(
                propertyPath,
                jsonStreamParserController,
                onComplete,
            );

        case "-":
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
            return new NumberPropertyDelegate(
                propertyPath,
                jsonStreamParserController,
                onComplete,
            );

        case "t":
        case "f":
            return new BooleanPropertyDelegate(
                propertyPath,
                jsonStreamParserController,
                onComplete,
            );

        case "n":
            return new NullPropertyDelegate(
                propertyPath,
                jsonStreamParserController,
                onComplete,
            );

        default:
            throw new Error(
                `No delegate available for character: |${character}|`,
            );
    }
}
