/**
 * Property stream controllers manage the internal state and emission logic
 * for property streams. These are internal classes not exposed in the public API.
 *
 * Uses async iterators as the primary streaming mechanism.
 */
import { JsonStreamParserController } from "./json_stream_parser.js";
import { BooleanPropertyStream, ListPropertyStream, MapPropertyStream, NullPropertyStream, NumberPropertyStream, PropertyStream, StringPropertyStream } from "./property_stream.js";
/**
 * Base class for all property stream controllers.
 */
export declare abstract class PropertyStreamController<T> {
    protected parserController: JsonStreamParserController;
    protected propertyPath: string;
    abstract readonly propertyStream: PropertyStream<T>;
    protected _isClosed: boolean;
    protected _finalValue: T | undefined;
    protected _hasFinalValue: boolean;
    protected completer: {
        promise: Promise<T>;
        resolve: (value: T) => void;
        reject: (error: Error) => void;
    };
    constructor(parserController: JsonStreamParserController, propertyPath: string);
    get isClosed(): boolean;
    /**
     * Returns true if this controller has completed with a value.
     */
    get hasFinalValue(): boolean;
    /**
     * Gets the final value if available.
     * Only valid when hasFinalValue is true.
     */
    get finalValue(): T | undefined;
    onClose(): void;
    complete(value: T): void;
    completeError(error: Error): void;
}
/**
 * Controller for string property streams.
 * Manages buffering and streaming of string chunks.
 */
export declare class StringPropertyStreamController extends PropertyStreamController<string> {
    readonly propertyStream: StringPropertyStream;
    private buffer;
    constructor(parserController: JsonStreamParserController, propertyPath: string);
    /**
     * Adds a string chunk to the stream.
     * The chunk is emitted through the async iterator and accumulated in the buffer.
     */
    addChunk(chunk: string): void;
    complete(value?: string): void;
}
/**
 * Controller for number property streams.
 * Numbers emit once when the complete value is parsed.
 */
export declare class NumberPropertyStreamController extends PropertyStreamController<number> {
    readonly propertyStream: NumberPropertyStream;
    constructor(parserController: JsonStreamParserController, propertyPath: string);
    complete(value: number): void;
}
/**
 * Controller for boolean property streams.
 * Booleans emit once when the complete value is parsed.
 */
export declare class BooleanPropertyStreamController extends PropertyStreamController<boolean> {
    readonly propertyStream: BooleanPropertyStream;
    constructor(parserController: JsonStreamParserController, propertyPath: string);
    complete(value: boolean): void;
}
/**
 * Controller for null property streams.
 * Null emits once when parsed.
 */
export declare class NullPropertyStreamController extends PropertyStreamController<null> {
    readonly propertyStream: NullPropertyStream;
    constructor(parserController: JsonStreamParserController, propertyPath: string);
    complete(value: null): void;
}
/**
 * Controller for map/object property streams.
 * Maps emit snapshots as properties complete.
 */
export declare class MapPropertyStreamController extends PropertyStreamController<Record<string, any>> {
    readonly propertyStream: MapPropertyStream;
    private currentValue;
    constructor(parserController: JsonStreamParserController, propertyPath: string);
    /**
     * Notifies that a new property has started parsing.
     */
    notifyProperty(property: PropertyStream<any>, key: string): void;
    /**
     * Adds a property value to the map and emits a snapshot.
     */
    addProperty(key: string, value: any): void;
    complete(value?: Record<string, any>): void;
}
/**
 * Controller for list/array property streams.
 * Lists emit snapshots as elements complete.
 */
export declare class ListPropertyStreamController<T = any> extends PropertyStreamController<T[]> {
    readonly propertyStream: ListPropertyStream<T>;
    private currentValue;
    constructor(parserController: JsonStreamParserController, propertyPath: string);
    /**
     * Notifies that a new element has started parsing.
     */
    notifyElement(propertyStream: PropertyStream<any>, index: number): void;
    /**
     * Adds an element to the list and emits a snapshot.
     */
    addElement(value: T): void;
    complete(value?: T[]): void;
}
//# sourceMappingURL=property_stream_controller.d.ts.map