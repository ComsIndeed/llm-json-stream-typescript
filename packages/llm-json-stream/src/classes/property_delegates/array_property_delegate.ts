/**
 * Delegate for parsing JSON array values.
 */

import { PropertyDelegate } from "./property_delegate.js";
import { JsonStreamParserController } from "../json_stream_parser.js";
import { StringPropertyDelegate } from "./string_property_delegate.js";
import { NumberPropertyDelegate } from "./number_property_delegate.js";
import { BooleanPropertyDelegate } from "./boolean_property_delegate.js";
import { NullPropertyDelegate } from "./null_property_delegate.js";
import { ObjectPropertyDelegate } from "./object_property_delegate.js";
import { ArrayPropertyStreamController } from "../property_stream_controller.js";

enum ArrayParserState {
    WaitingForValue,
    ReadingValue,
    WaitingForCommaOrEnd,
}

export class ArrayPropertyDelegate extends PropertyDelegate {
    private static readonly VALUE_FIRST_CHARACTERS = new Set([
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

    private state: ArrayParserState = ArrayParserState.WaitingForValue;
    private index = 0;
    private isFirstCharacter = true;
    private activeChildDelegate: PropertyDelegate | null = null;
    private currentArray: any[] = [];
    /** Tracks which elements have been filled with their final values */
    private elementPaths: string[] = [];

    constructor(
        propertyPath: string,
        parserController: JsonStreamParserController,
        onComplete?: () => void,
    ) {
        super(propertyPath, parserController, onComplete);
    }

    private get currentElementPath(): string {
        return `${this.propertyPath}[${this.index}]`;
    }

    override onChunkEnd(): void {
        // Only call onChunkEnd on child if it's not done yet
        if (this.activeChildDelegate && !this.activeChildDelegate.done) {
            this.activeChildDelegate.onChunkEnd();
        }

        // Emit updates if someone is listening
        const controller = this.parserController.getPropertyStreamController(
            this.propertyPath,
        );
        if (controller) {
            this.parserController.addPropertyChunk({
                chunk: [...this.currentArray],
                propertyPath: this.propertyPath,
            });
        }
    }

    addCharacter(character: string): void {
        // Handle opening bracket
        if (this.isFirstCharacter && character === "[") {
            this.isFirstCharacter = false;
            this.state = ArrayParserState.WaitingForValue;
            return;
        }

        // Skip whitespace when not reading a value
        if (
            this.state !== ArrayParserState.ReadingValue && /\s/.test(character)
        ) {
            return;
        }

        if (this.state === ArrayParserState.ReadingValue) {
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
                        this.currentArray[this.index] =
                            childController.finalValue;
                    }
                }

                this.activeChildDelegate = null;
                this.index++;
                this.state = ArrayParserState.WaitingForCommaOrEnd;
                // Only reprocess if the child is NOT an array or object
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

        // Handle waiting for value state
        if (this.state === ArrayParserState.WaitingForValue) {
            if (ArrayPropertyDelegate.VALUE_FIRST_CHARACTERS.has(character)) {
                // Determine the type
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

                const elementPath = this.currentElementPath;
                this.elementPaths.push(elementPath);

                // Get/create the PropertyStream for this element
                const elementStream = this.parserController.getPropertyStream(
                    elementPath,
                    streamType,
                );

                // Add placeholder to current array at this index position
                this.currentArray.push(null);

                // Notify onElement callbacks
                const arrayController = this.parserController
                    .getPropertyStreamController(
                        this.propertyPath,
                    ) as ArrayPropertyStreamController | undefined;
                if (arrayController && elementStream) {
                    arrayController.notifyElement(elementStream, this.index);
                }

                // Create delegate
                const delegate = this.createDelegate(
                    character,
                    elementPath,
                );

                this.activeChildDelegate = delegate;
                this.activeChildDelegate.addCharacter(character);

                this.state = ArrayParserState.ReadingValue;
                return;
            }

            if (character === "]") {
                this.completeArray();
                return;
            }
        }

        if (this.state === ArrayParserState.WaitingForCommaOrEnd) {
            if (character === ",") {
                this.state = ArrayParserState.WaitingForValue;
                return;
            } else if (character === "]") {
                this.completeArray();
                return;
            }
        }
    }

    private createDelegate(
        character: string,
        childPath: string,
    ): PropertyDelegate {
        if (character === '"') {
            return new StringPropertyDelegate(
                childPath,
                this.parserController,
            );
        } else if (character === "{") {
            return new ObjectPropertyDelegate(
                childPath,
                this.parserController,
            );
        } else if (character === "[") {
            return new ArrayPropertyDelegate(
                childPath,
                this.parserController,
            );
        } else if (character === "t" || character === "f") {
            return new BooleanPropertyDelegate(
                childPath,
                this.parserController,
            );
        } else if (character === "n") {
            return new NullPropertyDelegate(
                childPath,
                this.parserController,
            );
        } else {
            return new NumberPropertyDelegate(
                childPath,
                this.parserController,
            );
        }
    }

    private completeArray(): void {
        this.isDone = true;

        // All values should already be in currentArray from synchronous updates
        // Complete the array controller with the accumulated elements
        this.parserController.completeProperty(this.propertyPath, [
            ...this.currentArray,
        ]);
        this.onComplete?.();
    }
}
