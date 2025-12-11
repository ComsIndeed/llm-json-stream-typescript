/**
 * Delegate for parsing JSON array/list values.
 */
import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
import { StringPropertyDelegate } from "./string_property_delegate.js";
import { NumberPropertyDelegate } from "./number_property_delegate.js";
import { BooleanPropertyDelegate } from "./boolean_property_delegate.js";
import { NullPropertyDelegate } from "./null_property_delegate.js";
import { MapPropertyDelegate } from "./map_property_delegate.js";
import { ListPropertyStreamController } from "../property_stream_controller.js";
var ListParserState;
(function (ListParserState) {
    ListParserState[ListParserState["WaitingForValue"] = 0] = "WaitingForValue";
    ListParserState[ListParserState["ReadingValue"] = 1] = "ReadingValue";
    ListParserState[ListParserState["WaitingForCommaOrEnd"] = 2] = "WaitingForCommaOrEnd";
})(ListParserState || (ListParserState = {}));
export class ListPropertyDelegate extends PropertyDelegate {
    static VALUE_FIRST_CHARACTERS = new Set([
        '"',
        "{",
        "[",
        "t",
        "f",
        "n",
        "-",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
    ]);
    state = ListParserState.WaitingForValue;
    index = 0;
    isFirstCharacter = true;
    activeChildDelegate = null;
    currentList = [];
    /** Tracks which elements have been filled with their final values */
    elementPaths = [];
    constructor(propertyPath, parserController, onComplete) {
        super(propertyPath, parserController, onComplete);
    }
    get currentElementPath() {
        return `${this.propertyPath}[${this.index}]`;
    }
    onChunkEnd() {
        // Only call onChunkEnd on child if it's not done yet
        if (this.activeChildDelegate && !this.activeChildDelegate.done) {
            this.activeChildDelegate.onChunkEnd();
        }
        // Emit updates if someone is listening
        const controller = this.parserController.getPropertyStreamController(this.propertyPath);
        if (controller) {
            this.parserController.addPropertyChunk({
                chunk: [...this.currentList],
                propertyPath: this.propertyPath,
            });
        }
    }
    addCharacter(character) {
        // Handle opening bracket
        if (this.isFirstCharacter && character === "[") {
            this.isFirstCharacter = false;
            this.state = ListParserState.WaitingForValue;
            return;
        }
        // Skip whitespace when not reading a value
        if (this.state !== ListParserState.ReadingValue && /\s/.test(character)) {
            return;
        }
        if (this.state === ListParserState.ReadingValue) {
            // Store the delegate reference before calling addCharacter
            const childDelegate = this.activeChildDelegate;
            childDelegate?.addCharacter(character);
            // If child completed, we need to reprocess this character
            if (childDelegate?.done === true) {
                // Child completed! Get its value synchronously from the controller
                const completedElementPath = this.elementPaths[this.index];
                if (completedElementPath) {
                    const childController = this.parserController
                        .getPropertyStreamController(completedElementPath);
                    if (childController && childController.hasFinalValue) {
                        this.currentList[this.index] =
                            childController.finalValue;
                    }
                }
                this.activeChildDelegate = null;
                this.index++;
                this.state = ListParserState.WaitingForCommaOrEnd;
                // Only reprocess if the child is NOT a list or map
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
        // Handle waiting for value state
        if (this.state === ListParserState.WaitingForValue) {
            if (ListPropertyDelegate.VALUE_FIRST_CHARACTERS.has(character)) {
                // Determine the type
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
                const elementPath = this.currentElementPath;
                this.elementPaths.push(elementPath);
                // Get/create the PropertyStream for this element
                const elementStream = this.parserController.getPropertyStream(elementPath, streamType);
                // Add placeholder to current list at this index position
                this.currentList.push(null);
                // Notify onElement callbacks
                const listController = this.parserController
                    .getPropertyStreamController(this.propertyPath);
                if (listController && elementStream) {
                    listController.notifyElement(elementStream, this.index);
                }
                // Create delegate
                const delegate = this.createDelegate(character, elementPath);
                this.activeChildDelegate = delegate;
                this.activeChildDelegate.addCharacter(character);
                this.state = ListParserState.ReadingValue;
                return;
            }
            if (character === "]") {
                this.completeList();
                return;
            }
        }
        if (this.state === ListParserState.WaitingForCommaOrEnd) {
            if (character === ",") {
                this.state = ListParserState.WaitingForValue;
                return;
            }
            else if (character === "]") {
                this.completeList();
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
    completeList() {
        this.isDone = true;
        // All values should already be in currentList from synchronous updates
        // Complete the list controller with the accumulated elements
        this.parserController.completeProperty(this.propertyPath, [
            ...this.currentList,
        ]);
        this.onComplete?.();
    }
}
//# sourceMappingURL=list_property_delegate.js.map