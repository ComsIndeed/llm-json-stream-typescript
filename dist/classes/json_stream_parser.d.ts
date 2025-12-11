/**
 * A streaming JSON parser optimized for LLM responses.
 *
 * This parser processes JSON data character-by-character as it streams in,
 * allowing you to react to properties before the entire JSON is received.
 * It's specifically designed for handling Large Language Model (LLM) streaming
 * responses that output structured JSON data.
 */
import { PropertyStreamController } from "./property_stream_controller.js";
import { BooleanPropertyStream, ListPropertyStream, MapPropertyStream, NullPropertyStream, NumberPropertyStream, PropertyStream, StringPropertyStream } from "./property_stream.js";
/**
 * Controller interface for coordinating parsing operations.
 * Internal use only - not exposed in public API.
 */
export declare class JsonStreamParserController {
    private addPropertyChunkFn;
    private getPropertyStreamControllerFn;
    private getPropertyStreamFn;
    private completePropertyFn;
    constructor(addPropertyChunkFn: <T>(params: {
        chunk: T;
        propertyPath: string;
    }) => void, getPropertyStreamControllerFn: (propertyPath: string) => PropertyStreamController<any> | undefined, getPropertyStreamFn: (propertyPath: string, streamType: "string" | "number" | "boolean" | "null" | "map" | "list") => PropertyStream<any>, completePropertyFn: <T>(propertyPath: string, value: T) => void);
    addPropertyChunk<T>(params: {
        chunk: T;
        propertyPath: string;
    }): void;
    getPropertyStreamController(propertyPath: string): PropertyStreamController<any> | undefined;
    getPropertyStream(propertyPath: string, streamType: "string" | "number" | "boolean" | "null" | "map" | "list"): PropertyStream<any>;
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
     * Gets a stream for a map/object property at the specified propertyPath.
     */
    getMapProperty(propertyPath: string): MapPropertyStream;
    /**
     * Gets a stream for a list/array property at the specified propertyPath.
     */
    getListProperty<T = any>(propertyPath: string): ListPropertyStream<T>;
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