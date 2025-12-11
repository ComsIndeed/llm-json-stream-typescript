/**
 * Property stream controllers manage the internal state and emission logic
 * for property streams. These are internal classes not exposed in the public API.
 *
 * Uses async iterators as the primary streaming mechanism.
 */

import { JsonStreamParserController } from "./json_stream_parser.js";
import {
    BooleanPropertyStream,
    ListPropertyStream,
    MapPropertyStream,
    NullPropertyStream,
    NumberPropertyStream,
    PropertyStream,
    StringPropertyStream,
} from "./property_stream.js";

/**
 * Base class for all property stream controllers.
 */
export abstract class PropertyStreamController<T> {
    abstract readonly propertyStream: PropertyStream<T>;
    protected _isClosed = false;
    protected _finalValue: T | undefined = undefined;
    protected _hasFinalValue = false;
    protected completer: {
        promise: Promise<T>;
        resolve: (value: T) => void;
        reject: (error: Error) => void;
    };

    constructor(
        protected parserController: JsonStreamParserController,
        protected propertyPath: string,
    ) {
        // Create a deferred promise
        let resolve!: (value: T) => void;
        let reject!: (error: Error) => void;
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        this.completer = { promise, resolve, reject };
    }

    get isClosed(): boolean {
        return this._isClosed;
    }

    /**
     * Returns true if this controller has completed with a value.
     */
    get hasFinalValue(): boolean {
        return this._hasFinalValue;
    }

    /**
     * Gets the final value if available.
     * Only valid when hasFinalValue is true.
     */
    get finalValue(): T | undefined {
        return this._finalValue;
    }

    onClose(): void {
        this._isClosed = true;
    }

    complete(value: T): void {
        if (!this._isClosed) {
            this._finalValue = value;
            this._hasFinalValue = true;
            this.propertyStream._complete();
            this.completer.resolve(value);
            this._isClosed = true;
        }
    }

    completeError(error: Error): void {
        if (!this._isClosed) {
            this.propertyStream._error(error);
            this.completer.reject(error);
            this._isClosed = true;
        }
    }
}

/**
 * Controller for string property streams.
 * Manages buffering and streaming of string chunks.
 */
export class StringPropertyStreamController
    extends PropertyStreamController<string> {
    readonly propertyStream: StringPropertyStream;
    private buffer = "";

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new StringPropertyStream(
            this.completer.promise,
            parserController,
        );
    }

    /**
     * Adds a string chunk to the stream.
     * The chunk is emitted through the async iterator and accumulated in the buffer.
     */
    addChunk(chunk: string): void {
        if (this._isClosed) return;
        this.buffer += chunk;
        this.propertyStream._pushValue(chunk);
    }

    override complete(value?: string): void {
        if (!this._isClosed) {
            // Always use buffer for strings - the delegate sends chunks to the buffer
            // and completes with empty string when done
            this._finalValue = this.buffer;
            this._hasFinalValue = true;
            this.propertyStream._complete();
            this.completer.resolve(this.buffer);
            this._isClosed = true;
        }
    }
}

/**
 * Controller for number property streams.
 * Numbers emit once when the complete value is parsed.
 */
export class NumberPropertyStreamController
    extends PropertyStreamController<number> {
    readonly propertyStream: NumberPropertyStream;

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new NumberPropertyStream(
            this.completer.promise,
            parserController,
        );
    }

    override complete(value: number): void {
        if (!this._isClosed) {
            // Emit the value once through the async iterator
            this._finalValue = value;
            this._hasFinalValue = true;
            this.propertyStream._pushValue(value);
            this.propertyStream._complete();
            this.completer.resolve(value);
            this._isClosed = true;
        }
    }
}

/**
 * Controller for boolean property streams.
 * Booleans emit once when the complete value is parsed.
 */
export class BooleanPropertyStreamController
    extends PropertyStreamController<boolean> {
    readonly propertyStream: BooleanPropertyStream;

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new BooleanPropertyStream(
            this.completer.promise,
            parserController,
        );
    }

    override complete(value: boolean): void {
        if (!this._isClosed) {
            // Emit the value once through the async iterator
            this._finalValue = value;
            this._hasFinalValue = true;
            this.propertyStream._pushValue(value);
            this.propertyStream._complete();
            this.completer.resolve(value);
            this._isClosed = true;
        }
    }
}

/**
 * Controller for null property streams.
 * Null emits once when parsed.
 */
export class NullPropertyStreamController
    extends PropertyStreamController<null> {
    readonly propertyStream: NullPropertyStream;

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new NullPropertyStream(
            this.completer.promise,
            parserController,
        );
    }

    override complete(value: null): void {
        if (!this._isClosed) {
            // Emit the value once through the async iterator
            this._finalValue = value;
            this._hasFinalValue = true;
            this.propertyStream._pushValue(value);
            this.propertyStream._complete();
            this.completer.resolve(value);
            this._isClosed = true;
        }
    }
}

/**
 * Controller for map/object property streams.
 * Maps emit snapshots as properties complete.
 */
export class MapPropertyStreamController
    extends PropertyStreamController<Record<string, any>> {
    readonly propertyStream: MapPropertyStream;
    private currentValue: Record<string, any> = {};

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new MapPropertyStream(
            this.completer.promise,
            parserController,
            propertyPath,
        );
    }

    /**
     * Notifies that a new property has started parsing.
     */
    notifyProperty(property: PropertyStream<any>, key: string): void {
        this.propertyStream._notifyProperty(property, key);
    }

    /**
     * Adds a property value to the map and emits a snapshot.
     */
    addProperty(key: string, value: any): void {
        if (this._isClosed) return;
        this.currentValue[key] = value;
        // Emit snapshot through async iterator
        this.propertyStream._pushValue({ ...this.currentValue });
    }

    override complete(value?: Record<string, any>): void {
        if (!this._isClosed) {
            const finalValue = value !== undefined ? value : this.currentValue;
            this._finalValue = finalValue;
            this._hasFinalValue = true;
            // Emit the final value through the async iterator before completing
            this.propertyStream._pushValue({ ...finalValue });
            this.propertyStream._complete();
            this.completer.resolve(finalValue);
            this._isClosed = true;
        }
    }
}

/**
 * Controller for list/array property streams.
 * Lists emit snapshots as elements complete.
 */
export class ListPropertyStreamController<T = any>
    extends PropertyStreamController<T[]> {
    readonly propertyStream: ListPropertyStream<T>;
    private currentValue: T[] = [];

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new ListPropertyStream<T>(
            this.completer.promise,
            parserController,
            propertyPath,
        );
    }

    /**
     * Notifies that a new element has started parsing.
     */
    notifyElement(propertyStream: PropertyStream<any>, index: number): void {
        this.propertyStream._notifyElement(propertyStream, index);
    }

    /**
     * Adds an element to the list and emits a snapshot.
     */
    addElement(value: T): void {
        if (this._isClosed) return;
        this.currentValue.push(value);
        // Emit snapshot through async iterator
        this.propertyStream._pushValue([...this.currentValue]);
    }

    override complete(value?: T[]): void {
        if (!this._isClosed) {
            const finalValue = value !== undefined ? value : this.currentValue;
            this._finalValue = finalValue;
            this._hasFinalValue = true;
            // Emit the final value through the async iterator before completing
            this.propertyStream._pushValue([...finalValue]);
            this.propertyStream._complete();
            this.completer.resolve(finalValue);
            this._isClosed = true;
        }
    }
}
