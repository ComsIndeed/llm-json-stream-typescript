/**
 * A streaming JSON parser optimized for LLM responses.
 *
 * This parser processes JSON data character-by-character as it streams in,
 * allowing you to react to properties before the entire JSON is received.
 * It's specifically designed for handling Large Language Model (LLM) streaming
 * responses that output structured JSON data.
 */
import { PropertyStreamController } from "./property_stream_controller.js";
import { BooleanPropertyStream, ArrayPropertyStream, ObjectPropertyStream, NullPropertyStream, NumberPropertyStream, PropertyStream, StringPropertyStream } from "./property_stream.js";
/**
 * Controller interface for coordinating parsing operations.
 * Internal use only - not exposed in pub   lic API.
 */
export declare class JsonStreamParserController {
    private addPropertyChunkFn;
    private getPropertyStreamControllerFn;
    private getPropertyStreamFn;
    private completePropertyFn;
    constructor(addPropertyChunkFn: <T>(params: {
        chunk: T;
        propertyPath: string;
    }) => void, getPropertyStreamControllerFn: (propertyPath: string) => PropertyStreamController<any> | undefined, getPropertyStreamFn: (propertyPath: string, streamType: "string" | "number" | "boolean" | "null" | "object" | "array") => PropertyStream<any>, completePropertyFn: <T>(propertyPath: string, value: T) => void);
    addPropertyChunk<T>(params: {
        chunk: T;
        propertyPath: string;
    }): void;
    getPropertyStreamController(propertyPath: string): PropertyStreamController<any> | undefined;
    getPropertyStream(propertyPath: string, streamType: "string" | "number" | "boolean" | "null" | "object" | "array"): PropertyStream<any>;
    completeProperty<T>(propertyPath: string, value: T): void;
}
/**
 * Main streaming JSON parser class.
 */
export declare class JsonStreamParser {
    private controller;
    private streamAbortController;
    private propertyControllers;
    private disposed;
    private rootDelegate;
    private closeOnRootComplete;
    private consumeStreamPromise;
    constructor(stream: AsyncIterable<string>, options?: {
        closeOnRootComplete?: boolean;
    });
    private consumeStream;
    /**
     * Gets a stream for a string property at the specified propertyPath.
     */
    getStringProperty(propertyPath: string): StringPropertyStream;
    /**
     * Gets a stream for a number property at the specified propertyPath.
     */
    getNumberProperty(propertyPath: string): NumberPropertyStream;
    /**
     * Gets a stream for a boolean property at the specified propertyPath.
     */
    getBooleanProperty(propertyPath: string): BooleanPropertyStream;
    /**
     * Gets a stream for a null property at the specified propertyPath.
     */
    getNullProperty(propertyPath: string): NullPropertyStream;
    /**
     * Gets a stream for an object property at the specified propertyPath.
     */
    getObjectProperty(propertyPath: string): ObjectPropertyStream;
    /**
     * Gets a stream for an array property at the specified propertyPath.
     */
    getArrayProperty<T = any>(propertyPath: string): ArrayPropertyStream<T>;
    /**
     * @deprecated Use getObjectProperty instead
     */
    getMapProperty(propertyPath: string): ObjectPropertyStream;
    /**
     * @deprecated Use getArrayProperty instead
     */
    getListProperty<T = any>(propertyPath: string): ArrayPropertyStream<T>;
    /**
     * Disposes the parser and cleans up resources.
     */
    dispose(): Promise<void>;
    private checkDisposed;
    private parseChunk;
    private handleStreamEnd;
    private addPropertyChunk;
    private getControllerForPath;
    private getPropertyStreamForPath;
    private completePropertyAtPath;
}
//# sourceMappingURL=json_stream_parser.d.ts.map