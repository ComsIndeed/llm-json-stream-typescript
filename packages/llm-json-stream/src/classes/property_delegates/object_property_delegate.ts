/**
 * Delegate for parsing JSON object values.
 */

import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
import { StringPropertyDelegate } from "./string_property_delegate.js";
import { NumberPropertyDelegate } from "./number_property_delegate.js";
import { BooleanPropertyDelegate } from "./boolean_property_delegate.js";
import { NullPropertyDelegate } from "./null_property_delegate.js";
import { ArrayPropertyDelegate } from "./array_property_delegate.js";

enum ObjectParserState {
    WaitingForKey,
    ReadingKey,
    WaitingForValue,
    ReadingValue,
    WaitingForCommaOrEnd,
}

export class ObjectPropertyDelegate extends PropertyDelegate {
    private state: ObjectParserState = ObjectParserState.WaitingForKey;
    private firstCharacter = true;
    private keyBuffer = "";
    private activeChildDelegate: PropertyDelegate | null = null;
    private activeChildKey: string | null = null;
    private keys: string[] = [];
    private currentObject: Record<string, any> = {};

    constructor(
        propertyPath: string,
        parserController: JsonStreamParserController,
        onComplete?: () => void,
    ) {
        super(propertyPath, parserController, onComplete);
    }

    override onChunkEnd(): void {
        // Only call onChunkEnd on child if it's not done yet
        if (this.activeChildDelegate && !this.activeChildDelegate.done) {
            this.activeChildDelegate.onChunkEnd();
        }

        // Emit current object state
        const controller = this.parserController.getPropertyStreamController(
            this.propertyPath,
        );
        if (controller) {
            this.parserController.addPropertyChunk({
                chunk: { ...this.currentObject },
                propertyPath: this.propertyPath,
            });
        }
    }

    addCharacter(character: string): void {
        // Reading key state
        if (this.state === ObjectParserState.ReadingKey) {
            if (character === '"') {
                this.state = ObjectParserState.WaitingForValue;
                return;
            } else {
                this.keyBuffer += character;
                return;
            }
        }

        // Reading value state - delegate to child
        if (this.state === ObjectParserState.ReadingValue) {
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
                        this.currentObject[completedKey] =
                            childController.finalValue;
                    }
                }

                this.state = ObjectParserState.WaitingForCommaOrEnd;
                this.activeChildDelegate = null;
                this.activeChildKey = null;

                // Only reprocess if the child is NOT an array or object
                // (arrays and objects consume their own closing brackets)
                if (
                    childDelegate instanceof ArrayPropertyDelegate ||
                    childDelegate instanceof ObjectPropertyDelegate
                ) {
                    return; // Don't reprocess - child consumed the closing bracket
                }
                // For other types (numbers, strings, etc), reprocess the delimiter
            } else {
                return;
            }
        }

        // Waiting for value - determine type and create delegate
        if (this.state === ObjectParserState.WaitingForValue) {
            if (character === " " || character === ":") return;

            // Add this key to our list of keys
            const currentKeyString = this.keyBuffer;
            this.keys.push(currentKeyString);
            this.activeChildKey = currentKeyString;

            // Determine the type and create the PropertyStream
            const childPath = this.newPath(currentKeyString);
            let streamType:
                | "string"
                | "number"
                | "boolean"
                | "null"
                | "object"
                | "array";

            if (character === '"') {
                streamType = "string";
            } else if (character === "{") {
                streamType = "object";
            } else if (character === "[") {
                streamType = "array";
            } else if (character === "t" || character === "f") {
                streamType = "boolean";
            } else if (character === "n") {
                streamType = "null";
            } else {
                streamType = "number";
            }

            // Create the property stream
            const childStream = this.parserController.getPropertyStream(
                childPath,
                streamType,
            );
            this.currentObject[currentKeyString] = null;

            // Notify callbacks about the new property
            const objectController = this.parserController
                .getPropertyStreamController(this.propertyPath);
            if (objectController && "notifyProperty" in objectController) {
                (objectController as any).notifyProperty(
                    childStream,
                    currentKeyString,
                );
            }

            // Create child delegate
            const childDelegate = this.createDelegate(character, childPath);
            this.activeChildDelegate = childDelegate;
            this.activeChildDelegate.addCharacter(character);
            this.state = ObjectParserState.ReadingValue;
            return;
        }

        // Handle opening brace
        if (this.firstCharacter && character === "{") {
            this.firstCharacter = false;
            return;
        }

        // Waiting for comma or end
        if (this.state === ObjectParserState.WaitingForCommaOrEnd) {
            // Skip whitespace
            if (/\s/.test(character)) {
                return;
            }
            if (character === ",") {
                this.state = ObjectParserState.WaitingForKey;
                this.keyBuffer = "";
                return;
            } else if (character === "}") {
                this.completeObject();
                return;
            }
        }

        // Waiting for key
        if (this.state === ObjectParserState.WaitingForKey) {
            // Skip whitespace
            if (/\s/.test(character)) {
                return;
            }
            if (character === '"') {
                this.state = ObjectParserState.ReadingKey;
                return;
            }
            if (character === "}") {
                this.completeObject();
                return;
            }
        }
    }

    private createDelegate(
        character: string,
        childPath: string,
    ): PropertyDelegate {
        if (character === '"') {
            return new StringPropertyDelegate(childPath, this.parserController);
        } else if (character === "{") {
            return new ObjectPropertyDelegate(childPath, this.parserController);
        } else if (character === "[") {
            return new ArrayPropertyDelegate(childPath, this.parserController);
        } else if (character === "t" || character === "f") {
            return new BooleanPropertyDelegate(
                childPath,
                this.parserController,
            );
        } else if (character === "n") {
            return new NullPropertyDelegate(childPath, this.parserController);
        } else {
            return new NumberPropertyDelegate(childPath, this.parserController);
        }
    }

    private completeObject(): void {
        this.isDone = true;
        // Complete the object controller with the accumulated values
        this.parserController.completeProperty(this.propertyPath, {
            ...this.currentObject,
        });
        this.onComplete?.();
    }
}
