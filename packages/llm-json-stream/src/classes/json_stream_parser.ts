/**
 * A streaming JSON parser optimized for LLM responses.
 *
 * This parser processes JSON data character-by-character as it streams in,
 * allowing you to react to properties before the entire JSON is received.
 * It's specifically designed for handling Large Language Model (LLM) streaming
 * responses that output structured JSON data.
 */

import {
    ArrayPropertyStreamController,
    BooleanPropertyStreamController,
    NullPropertyStreamController,
    NumberPropertyStreamController,
    ObjectPropertyStreamController,
    PropertyStreamController,
    StringPropertyStreamController,
} from "./property_stream_controller.js";
import {
    ArrayPropertyStream,
    BooleanPropertyStream,
    NullPropertyStream,
    NumberPropertyStream,
    ObjectPropertyStream,
    PropertyStream,
    StringPropertyStream,
} from "./property_stream.js";
import { PropertyDelegate } from "./property_delegates/property_delegate.js";
import { ObjectPropertyDelegate } from "./property_delegates/object_property_delegate.js";
import { ArrayPropertyDelegate } from "./property_delegates/array_property_delegate.js";

/**
 * Parsing event definition for observability.
 */
export interface ParseEvent {
    type:
        | "rootStart"
        | "mapKeyDiscovered"
        | "listElementStart"
        | "propertyStart"
        | "propertyComplete"
        | "stringChunk"
        | "yapFiltered"
        | "thinkingTagStart"
        | "thinkingTagEnd"
        | "error";
    propertyPath: string;
    message: string;
    data?: any;
}

/**
 * Controller interface for coordinating parsing operations.
 * Internal use only - not exposed in public API.
 */
export class JsonStreamParserController {
    constructor(
        private addPropertyChunkFn: <T>(params: {
            chunk: T;
            propertyPath: string;
        }) => void,
        private getPropertyStreamControllerFn: (
            propertyPath: string,
        ) => PropertyStreamController<any> | undefined,
        private getPropertyStreamFn: (
            propertyPath: string,
            streamType:
                | "string"
                | "number"
                | "boolean"
                | "null"
                | "object"
                | "array",
        ) => PropertyStream<any>,
        private completePropertyFn: <T>(propertyPath: string, value: T) => void,
    ) {}

    addPropertyChunk<T>(params: { chunk: T; propertyPath: string }): void {
        this.addPropertyChunkFn(params);
    }

    getPropertyStreamController(
        propertyPath: string,
    ): PropertyStreamController<any> | undefined {
        return this.getPropertyStreamControllerFn(propertyPath);
    }

    getPropertyStream(
        propertyPath: string,
        streamType:
            | "string"
            | "number"
            | "boolean"
            | "null"
            | "object"
            | "array",
    ): PropertyStream<any> {
        return this.getPropertyStreamFn(propertyPath, streamType);
    }

    completeProperty<T>(propertyPath: string, value: T): void {
        this.completePropertyFn(propertyPath, value);
    }
}

/**
 * Main streaming JSON parser class.
 */
export class JsonStreamParser {
    private controller!: JsonStreamParserController;
    private streamAbortController: AbortController | null = null;
    private propertyControllers: Map<string, PropertyStreamController<any>> =
        new Map();
    private disposed = false;
    private rootDelegate: PropertyDelegate | null = null;
    private closeOnRootComplete: boolean;
    private consumeStreamPromise: Promise<void> | null = null;

    // Thinking tag skipper configuration
    private skipThoughts: boolean;
    private thinkingTags: [string, string];
    private onLog?: (event: ParseEvent) => void;

    // Thinking tag skipper state
    private insideThinkingTags = false;
    private tagBuffer = "";
    private sawPotentialThinkingTags = false;
    private potentialTagBuffer = "";

    /** Callback called when root delegate is created, with the type ('object' or 'array') */
    onRootDelegateCreated?: (type: "object" | "array") => void;

    constructor(
        stream: AsyncIterable<string>,
        options?: {
            closeOnRootComplete?: boolean;
            skipThoughts?: boolean;
            thinkingTags?: [string, string];
            onLog?: (event: ParseEvent) => void;
        },
    ) {
        this.closeOnRootComplete = options?.closeOnRootComplete ?? true;
        this.skipThoughts = options?.skipThoughts ?? false;
        this.thinkingTags = options?.thinkingTags ?? ["<think>", "</think>"];
        this.onLog = options?.onLog;

        this.controller = new JsonStreamParserController(
            this.addPropertyChunk.bind(this),
            this.getControllerForPath.bind(this),
            this.getPropertyStreamForPath.bind(this),
            this.completePropertyAtPath.bind(this),
        );

        // Create an abort controller to stop the stream consumption
        this.streamAbortController = new AbortController();

        // Start consuming the stream
        this.consumeStreamPromise = this.consumeStream(stream);
    }

    private emitLog(
        type: ParseEvent["type"],
        propertyPath: string,
        message: string,
        data?: any,
    ): void {
        this.onLog?.({ type, propertyPath, message, data });
    }

    private async consumeStream(stream: AsyncIterable<string>): Promise<void> {
        try {
            for await (const chunk of stream) {
                if (
                    this.disposed || this.streamAbortController?.signal.aborted
                ) {
                    break;
                }

                this.parseChunk(chunk);

                // Check if we should stop consuming after parsing
                if (
                    this.closeOnRootComplete &&
                    this.rootDelegate &&
                    this.rootDelegate.done
                ) {
                    this.emitLog(
                        "yapFiltered",
                        "",
                        "Yap filter triggered - ignoring text after root JSON",
                    );
                    this.streamAbortController?.abort();
                    break;
                }
            }

            // Stream ended normally
            this.handleStreamEnd();
        } catch (error) {
            // Stream error - reject all pending controllers
            const err = error instanceof Error ? error : new Error(String(error));
            this.emitLog("error", "", `Stream error: ${err.message}`, err);
            for (const controller of this.propertyControllers.values()) {
                controller.completeError(err);
            }
        }
    }

    /**
     * Gets a stream for a string property at the specified propertyPath.
     */
    getStringProperty(propertyPath: string): StringPropertyStream {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof StringPropertyStreamController)) {
                throw new Error(
                    `Property at path ${propertyPath} is not a StringPropertyStream`,
                );
            }
            return existing.propertyStream;
        }

        const controller = new StringPropertyStreamController(
            this.controller,
            propertyPath,
        );
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }

    /**
     * Gets a stream for a number property at the specified propertyPath.
     */
    getNumberProperty(propertyPath: string): NumberPropertyStream {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof NumberPropertyStreamController)) {
                throw new Error(
                    `Property at path ${propertyPath} is not a NumberPropertyStream`,
                );
            }
            return existing.propertyStream;
        }

        const controller = new NumberPropertyStreamController(
            this.controller,
            propertyPath,
        );
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }

    /**
     * Gets a stream for a boolean property at the specified propertyPath.
     */
    getBooleanProperty(propertyPath: string): BooleanPropertyStream {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof BooleanPropertyStreamController)) {
                throw new Error(
                    `Property at path ${propertyPath} is not a BooleanPropertyStream`,
                );
            }
            return existing.propertyStream;
        }

        const controller = new BooleanPropertyStreamController(
            this.controller,
            propertyPath,
        );
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }

    /**
     * Gets a stream for a null property at the specified propertyPath.
     */
    getNullProperty(propertyPath: string): NullPropertyStream {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof NullPropertyStreamController)) {
                throw new Error(
                    `Property at path ${propertyPath} is not a NullPropertyStream`,
                );
            }
            return existing.propertyStream;
        }

        const controller = new NullPropertyStreamController(
            this.controller,
            propertyPath,
        );
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }

    /**
     * Gets a stream for an object property at the specified propertyPath.
     */
    getObjectProperty(propertyPath: string): ObjectPropertyStream {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof ObjectPropertyStreamController)) {
                throw new Error(
                    `Property at path ${propertyPath} is not a ObjectPropertyStream`,
                );
            }
            return existing.propertyStream;
        }

        const controller = new ObjectPropertyStreamController(
            this.controller,
            propertyPath,
        );
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }

    /**
     * Gets a stream for an array property at the specified propertyPath.
     */
    getArrayProperty<T = any>(propertyPath: string): ArrayPropertyStream<T> {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof ArrayPropertyStreamController)) {
                throw new Error(
                    `Property at path ${propertyPath} is not a ArrayPropertyStream`,
                );
            }
            return existing.propertyStream as ArrayPropertyStream<T>;
        }

        const controller = new ArrayPropertyStreamController<T>(
            this.controller,
            propertyPath,
        );
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }

    /**
     * Disposes the parser and cleans up resources.
     */
    async dispose(): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        // Abort the stream consumption
        if (this.streamAbortController) {
            this.streamAbortController.abort();
        }

        // Wait for stream consumption to complete
        if (this.consumeStreamPromise) {
            try {
                await this.consumeStreamPromise;
            } catch {
                // Ignore errors during cleanup
            }
        }

        // Close all property controllers
        for (const controller of this.propertyControllers.values()) {
            if (!controller.isClosed) {
                controller.completeError(new Error("Parser disposed"));
            }
        }

        this.propertyControllers.clear();
    }

    private checkDisposed(): void {
        if (this.disposed) {
            throw new Error("Parser has been disposed");
        }
    }

    private parseChunk(chunk: string): void {
        if (this.disposed) return;

        // Check yap filter
        if (
            this.closeOnRootComplete &&
            this.rootDelegate &&
            this.rootDelegate.done
        ) {
            this.streamAbortController?.abort();
            return;
        }

        try {
            for (const character of chunk) {
                // Check yap filter inside loop
                if (
                    this.closeOnRootComplete &&
                    this.rootDelegate &&
                    this.rootDelegate.done
                ) {
                    this.streamAbortController?.abort();
                    return;
                }

                // Handle thinking tag skipping if enabled
                if (this.skipThoughts) {
                    const processed = this.processCharacterForThinkingTags(character);
                    if (processed.length === 0) {
                        continue;
                    }
                    // Process all characters returned by the sliding window skipper
                    for (const char of processed) {
                        this.processSingleCharacter(char);
                    }
                } else {
                    // Even when skipThoughts is disabled, detect potential tags for hints
                    this.detectPotentialThinkingTags(character);
                    this.processSingleCharacter(character);
                }
            }

            // Notify delegates about chunk end
            this.rootDelegate?.onChunkEnd();

            // Final check after chunk
            if (
                this.closeOnRootComplete &&
                this.rootDelegate &&
                this.rootDelegate.done
            ) {
                this.streamAbortController?.abort();
            }
        } catch (e) {
            this.emitLog("error", "", `Parsing error: ${e}`, e);
        }
    }

    private processSingleCharacter(character: string): void {
        if (this.rootDelegate !== null) {
            this.rootDelegate.addCharacter(character);
            return;
        }

        // Skip leading whitespace before root element
        if (/\s/.test(character)) {
            return;
        }

        if (character === "{") {
            this.emitLog("rootStart", "", "Started parsing root object");
            this.rootDelegate = new ObjectPropertyDelegate(
                "",
                this.controller,
            );
            this.onRootDelegateCreated?.("object");
            this.rootDelegate.addCharacter(character);
        } else if (character === "[") {
            this.emitLog("rootStart", "", "Started parsing root array");
            this.rootDelegate = new ArrayPropertyDelegate(
                "",
                this.controller,
            );
            this.onRootDelegateCreated?.("array");
            this.rootDelegate.addCharacter(character);
        }
    }

    /**
     * Sliding-window thinking tag skipper.
     * Guarantees zero character loss on partial match deviations.
     */
    private processCharacterForThinkingTags(character: string): string[] {
        const [startTag, endTag] = this.thinkingTags;

        if (this.insideThinkingTags) {
            this.tagBuffer += character;

            if (this.tagBuffer.endsWith(endTag)) {
                this.insideThinkingTags = false;
                this.tagBuffer = "";
                this.emitLog("thinkingTagEnd", "", "Exited thinking tags");
            } else if (this.tagBuffer.length > endTag.length) {
                this.tagBuffer = this.tagBuffer.slice(-endTag.length);
            }

            return [];
        } else {
            const currentAttempt = this.tagBuffer + character;

            if (currentAttempt === startTag) {
                this.insideThinkingTags = true;
                this.tagBuffer = "";
                this.emitLog("thinkingTagStart", "", "Entered thinking tags");
                return [];
            }

            if (startTag.startsWith(currentAttempt)) {
                this.tagBuffer = currentAttempt;
                return [];
            }

            if (this.tagBuffer.length === 0) {
                return [character];
            }

            // Sliding window flush
            const charsToFlush = this.tagBuffer + character;
            const firstChar = charsToFlush.charAt(0);
            const remaining = charsToFlush.slice(1);

            this.tagBuffer = ""; // Reset buffer before re-feeding

            const flushed = [firstChar];
            for (const char of remaining) {
                flushed.push(...this.processCharacterForThinkingTags(char));
            }
            return flushed;
        }
    }

    /**
     * Detects potential thinking tags to output warnings on type mismatches.
     */
    private detectPotentialThinkingTags(character: string): void {
        if (this.rootDelegate !== null) return;

        const [startTag] = this.thinkingTags;
        this.potentialTagBuffer += character;

        if (this.potentialTagBuffer.endsWith(startTag)) {
            this.sawPotentialThinkingTags = true;
            this.potentialTagBuffer = "";
            return;
        }

        if (this.potentialTagBuffer.length > startTag.length) {
            this.potentialTagBuffer = this.potentialTagBuffer.slice(-startTag.length);
        }
    }

    private handleStreamEnd(): void {
        // Complete any incomplete property controllers with errors
        for (const controller of this.propertyControllers.values()) {
            if (!controller.isClosed) {
                controller.completeError(
                    new Error("Stream ended before property completed"),
                );
            }
        }
    }

    private addPropertyChunk<T>(params: {
        chunk: T;
        propertyPath: string;
    }): void {
        const controller = this.propertyControllers.get(params.propertyPath);
        if (!controller) return;

        if (controller instanceof StringPropertyStreamController) {
            controller.addChunk(params.chunk as string);
        } else if (controller instanceof ObjectPropertyStreamController) {
            // Objects emit snapshots - push to async iterator without completing
            controller.propertyStream._pushValue(
                params.chunk as Record<string, any>,
            );
        } else if (controller instanceof ArrayPropertyStreamController) {
            // Arrays emit snapshots - push to async iterator without completing
            controller.propertyStream._pushValue(params.chunk as any[]);
        }
    }

    private getControllerForPath(
        propertyPath: string,
    ): PropertyStreamController<any> | undefined {
        return this.propertyControllers.get(propertyPath);
    }

    private getPropertyStreamForPath(
        propertyPath: string,
        streamType:
            | "string"
            | "number"
            | "boolean"
            | "null"
            | "object"
            | "array",
    ): PropertyStream<any> {
        // Check for existing controller with incompatible type
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            // Verify type compatibility
            const isCompatible = (streamType === "string" &&
                existing instanceof StringPropertyStreamController) ||
                (streamType === "number" &&
                    existing instanceof NumberPropertyStreamController) ||
                (streamType === "boolean" &&
                    existing instanceof BooleanPropertyStreamController) ||
                (streamType === "null" &&
                    existing instanceof NullPropertyStreamController) ||
                (streamType === "object" &&
                    existing instanceof ObjectPropertyStreamController) ||
                (streamType === "array" &&
                    existing instanceof ArrayPropertyStreamController);

            if (isCompatible) {
                return existing.propertyStream;
            } else {
                // Type mismatch - complete existing controller with error
                let errorMessage = `Type mismatch at path "${propertyPath}": requested ${streamType} but found different type`;
                if (this.sawPotentialThinkingTags && !this.skipThoughts) {
                    errorMessage += `\n\nHint: The input may contain thinking/reasoning tags before the JSON. Try setting skipThoughts: true in the JsonStream options.`;
                }
                const error = new Error(errorMessage);
                existing.completeError(error);
                throw error;
            }
        }

        // Create appropriate stream based on type
        switch (streamType) {
            case "string":
                return this.getStringProperty(propertyPath);
            case "number":
                return this.getNumberProperty(propertyPath);
            case "boolean":
                return this.getBooleanProperty(propertyPath);
            case "null":
                return this.getNullProperty(propertyPath);
            case "object":
                return this.getObjectProperty(propertyPath);
            case "array":
                return this.getArrayProperty(propertyPath);
            default:
                throw new Error(`Unknown stream type: ${streamType}`);
        }
    }

    private completePropertyAtPath<T>(propertyPath: string, value: T): void {
        const controller = this.propertyControllers.get(propertyPath);
        if (!controller || controller.isClosed) return;

        if (controller instanceof StringPropertyStreamController) {
            controller.complete(value as unknown as string);
        } else if (controller instanceof NumberPropertyStreamController) {
            controller.complete(value as unknown as number);
        } else if (controller instanceof BooleanPropertyStreamController) {
            controller.complete(value as unknown as boolean);
        } else if (controller instanceof NullPropertyStreamController) {
            controller.complete(value as unknown as null);
        } else if (controller instanceof ObjectPropertyStreamController) {
            controller.complete(value as unknown as Record<string, any>);
        } else if (controller instanceof ArrayPropertyStreamController) {
            controller.complete(value as unknown as any[]);
        }
    }
}
