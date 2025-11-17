/**
 * Property stream controllers manage the internal state and emission logic
 * for property streams. These are internal classes not exposed in the public API.
 */

import { EventEmitter } from "events";
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

    onClose(): void {
        this._isClosed = true;
    }

    complete(value: T): void {
        if (!this._isClosed) {
            this.completer.resolve(value);
            this._isClosed = true;
        }
    }

    completeError(error: Error): void {
        if (!this._isClosed) {
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
    private streamEmitter = new EventEmitter();

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new StringPropertyStream(
            this.completer.promise,
            this.streamEmitter,
            parserController,
        );
    }

    addChunk(chunk: string): void {
        // TODO: Implementation
    }

    override complete(value: string): void {
        // TODO: Implementation
    }
}

/**
 * Controller for number property streams.
 */
export class NumberPropertyStreamController
    extends PropertyStreamController<number> {
    readonly propertyStream: NumberPropertyStream;
    private streamEmitter = new EventEmitter();

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new NumberPropertyStream(
            this.completer.promise,
            this.streamEmitter,
            parserController,
        );
    }
}

/**
 * Controller for boolean property streams.
 */
export class BooleanPropertyStreamController
    extends PropertyStreamController<boolean> {
    readonly propertyStream: BooleanPropertyStream;
    private streamEmitter = new EventEmitter();

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new BooleanPropertyStream(
            this.completer.promise,
            this.streamEmitter,
            parserController,
        );
    }
}

/**
 * Controller for null property streams.
 */
export class NullPropertyStreamController
    extends PropertyStreamController<null> {
    readonly propertyStream: NullPropertyStream;
    private streamEmitter = new EventEmitter();

    constructor(
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(parserController, propertyPath);
        this.propertyStream = new NullPropertyStream(
            this.completer.promise,
            this.streamEmitter,
            parserController,
        );
    }
}

/**
 * Controller for map/object property streams.
 */
export class MapPropertyStreamController
    extends PropertyStreamController<Record<string, any>> {
    readonly propertyStream: MapPropertyStream;

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
}

/**
 * Controller for list/array property streams.
 */
export class ListPropertyStreamController<T extends object>
    extends PropertyStreamController<T[]> {
    readonly propertyStream: ListPropertyStream<T>;
    private onElementCallbacks: Array<
        (propertyStream: PropertyStream<any>, index: number) => void
    > = [];

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

    addOnElementCallback(
        callback: (propertyStream: PropertyStream<any>, index: number) => void,
    ): void {
        // TODO: Implementation
    }
}
