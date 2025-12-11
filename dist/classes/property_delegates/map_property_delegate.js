/**
 * Delegate for parsing JSON object/map values.
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
import { StringPropertyDelegate } from "./string_property_delegate.js";
import { NumberPropertyDelegate } from "./number_property_delegate.js";
import { BooleanPropertyDelegate } from "./boolean_property_delegate.js";
import { NullPropertyDelegate } from "./null_property_delegate.js";
import { ListPropertyDelegate } from "./list_property_delegate.js";
var MapParserState;
(function (MapParserState) {
    MapParserState[MapParserState["WaitingForKey"] = 0] = "WaitingForKey";
    MapParserState[MapParserState["ReadingKey"] = 1] = "ReadingKey";
    MapParserState[MapParserState["WaitingForValue"] = 2] = "WaitingForValue";
    MapParserState[MapParserState["ReadingValue"] = 3] = "ReadingValue";
    MapParserState[MapParserState["WaitingForCommaOrEnd"] = 4] = "WaitingForCommaOrEnd";
})(MapParserState || (MapParserState = {}));
export class MapPropertyDelegate extends PropertyDelegate {
    state = MapParserState.WaitingForKey;
    firstCharacter = true;
    keyBuffer = "";
    activeChildDelegate = null;
    activeChildKey = null;
    keys = [];
    currentMap = {};
    constructor(propertyPath, parserController, onComplete) {
        super(propertyPath, parserController, onComplete);
    }
    onChunkEnd() {
        // Only call onChunkEnd on child if it's not done yet
        if (this.activeChildDelegate && !this.activeChildDelegate.done) {
            this.activeChildDelegate.onChunkEnd();
        }
        // Emit current map state
        const controller = this.parserController.getPropertyStreamController(this.propertyPath);
        if (controller) {
            this.parserController.addPropertyChunk({
                chunk: { ...this.currentMap },
                propertyPath: this.propertyPath,
            });
        }
    }
    addCharacter(character) {
        // Reading key state
        if (this.state === MapParserState.ReadingKey) {
            if (character === '"') {
                this.state = MapParserState.WaitingForValue;
                return;
            }
            else {
                this.keyBuffer += character;
                return;
            }
        }
        // Reading value state - delegate to child
        if (this.state === MapParserState.ReadingValue) {
            const childDelegate = this.activeChildDelegate;
            childDelegate?.addCharacter(character);
            // If child completed, capture value synchronously
            if (childDelegate?.done === true) {
                // Get the child's value synchronously
                const completedKey = this.activeChildKey;
                if (completedKey) {
                    const childPath = this.newPath(completedKey);
                    const childController = this.parserController
                        .getPropertyStreamController(childPath);
                    if (childController && childController.hasFinalValue) {
                        this.currentMap[completedKey] =
                            childController.finalValue;
                    }
                }
                this.state = MapParserState.WaitingForCommaOrEnd;
                this.activeChildDelegate = null;
                this.activeChildKey = null;
                // Only reprocess if the child is NOT a list or map
                // (lists and maps consume their own closing brackets)
                if (childDelegate instanceof ListPropertyDelegate ||
                    childDelegate instanceof MapPropertyDelegate) {
                    return; // Don't reprocess - child consumed the closing bracket
                }
                // For other types (numbers, strings, etc), reprocess the delimiter
            }
            else {
                return;
            }
        }
        // Waiting for value - determine type and create delegate
        if (this.state === MapParserState.WaitingForValue) {
            if (character === " " || character === ":")
                return;
            // Add this key to our list of keys
            const currentKeyString = this.keyBuffer;
            this.keys.push(currentKeyString);
            this.activeChildKey = currentKeyString;
            // Determine the type and create the PropertyStream
            const childPath = this.newPath(currentKeyString);
            let streamType;
            if (character === '"') {
                streamType = "string";
            }
            else if (character === "{") {
                streamType = "map";
            }
            else if (character === "[") {
                streamType = "list";
            }
            else if (character === "t" || character === "f") {
                streamType = "boolean";
            }
            else if (character === "n") {
                streamType = "null";
            }
            else {
                streamType = "number";
            }
            // Create the property stream
            const childStream = this.parserController.getPropertyStream(childPath, streamType);
            this.currentMap[currentKeyString] = null;
            // Notify callbacks about the new property
            const mapController = this.parserController
                .getPropertyStreamController(this.propertyPath);
            if (mapController && "notifyProperty" in mapController) {
                mapController.notifyProperty(childStream, currentKeyString);
            }
            // Create child delegate
            const childDelegate = this.createDelegate(character, childPath);
            this.activeChildDelegate = childDelegate;
            this.activeChildDelegate.addCharacter(character);
            this.state = MapParserState.ReadingValue;
            return;
        }
        // Handle opening brace
        if (this.firstCharacter && character === "{") {
            this.firstCharacter = false;
            return;
        }
        // Waiting for comma or end
        if (this.state === MapParserState.WaitingForCommaOrEnd) {
            // Skip whitespace
            if (/\s/.test(character)) {
                return;
            }
            if (character === ",") {
                this.state = MapParserState.WaitingForKey;
                this.keyBuffer = "";
                return;
            }
            else if (character === "}") {
                this.completeMap();
                return;
            }
        }
        // Waiting for key
        if (this.state === MapParserState.WaitingForKey) {
            // Skip whitespace
            if (/\s/.test(character)) {
                return;
            }
            if (character === '"') {
                this.state = MapParserState.ReadingKey;
                return;
            }
            if (character === "}") {
                this.completeMap();
                return;
            }
        }
    }
    createDelegate(character, childPath) {
        if (character === '"') {
            return new StringPropertyDelegate(childPath, this.parserController);
        }
        else if (character === "{") {
            return new MapPropertyDelegate(childPath, this.parserController);
        }
        else if (character === "[") {
            return new ListPropertyDelegate(childPath, this.parserController);
        }
        else if (character === "t" || character === "f") {
            return new BooleanPropertyDelegate(childPath, this.parserController);
        }
        else if (character === "n") {
            return new NullPropertyDelegate(childPath, this.parserController);
        }
        else {
            return new NumberPropertyDelegate(childPath, this.parserController);
        }
    }
    completeMap() {
        this.isDone = true;
        // Complete the map controller with the accumulated values
        this.parserController.completeProperty(this.propertyPath, {
            ...this.currentMap,
        });
        this.onComplete?.();
    }
}
//# sourceMappingURL=map_property_delegate.js.map