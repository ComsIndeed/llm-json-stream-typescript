/**
 * Property stream classes providing reactive access to JSON values.
 * These are the public API classes that users interact with.
 */

import { EventEmitter } from "events";
import { JsonStreamParserController } from "./json_stream_parser.js";

/**
 * Base class for all property streams.
 * Property streams provide access to JSON values as they are parsed from the input stream.
 */
export abstract class PropertyStream<T> {
    protected _future: Promise<T>;
    protected parserController: JsonStreamParserController;

    constructor(
        future: Promise<T>,
        parserController: JsonStreamParserController,
    ) {
        this._future = future;
        this.parserController = parserController;
    }

    /**
     * A promise that resolves with the final parsed value of this property.
     * Use this when you need the complete value and don't need to react to partial chunks.
     */
    get future(): Promise<T> {
        return this._future;
    }
}

/**
 * A property stream for JSON string values.
 * Provides both a stream that emits string chunks and a promise for the complete value.
 */
export class StringPropertyStream extends PropertyStream<string> {
    private _stream: EventEmitter;

    constructor(
        future: Promise<string>,
        stream: EventEmitter,
        parserController: JsonStreamParserController,
    ) {
        super(future, parserController);
        this._stream = stream;
    }

    /**
     * An event emitter that emits 'data' events with string chunks as they are parsed.
     * Each chunk represents a portion of the string value as it arrives from the input stream.
     */
    get stream(): EventEmitter {
        return this._stream;
    }
}

/**
 * A property stream for JSON number values.
 */
export class NumberPropertyStream extends PropertyStream<number> {
    private _stream: EventEmitter;

    constructor(
        future: Promise<number>,
        stream: EventEmitter,
        parserController: JsonStreamParserController,
    ) {
        super(future, parserController);
        this._stream = stream;
    }

    /**
     * An event emitter that emits the number value when parsing is complete.
     */
    get stream(): EventEmitter {
        return this._stream;
    }
}

/**
 * A property stream for JSON null values.
 */
export class NullPropertyStream extends PropertyStream<null> {
    private _stream: EventEmitter;

    constructor(
        future: Promise<null>,
        stream: EventEmitter,
        parserController: JsonStreamParserController,
    ) {
        super(future, parserController);
        this._stream = stream;
    }

    /**
     * An event emitter that emits null when parsing is complete.
     */
    get stream(): EventEmitter {
        return this._stream;
    }
}

/**
 * A property stream for JSON boolean values.
 */
export class BooleanPropertyStream extends PropertyStream<boolean> {
    private _stream: EventEmitter;

    constructor(
        future: Promise<boolean>,
        stream: EventEmitter,
        parserController: JsonStreamParserController,
    ) {
        super(future, parserController);
        this._stream = stream;
    }

    /**
     * An event emitter that emits the boolean value when parsing is complete.
     */
    get stream(): EventEmitter {
        return this._stream;
    }
}

/**
 * A property stream for JSON object/map values.
 */
export class MapPropertyStream extends PropertyStream<Record<string, any>> {
    private propertyPath: string;

    constructor(
        future: Promise<Record<string, any>>,
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(future, parserController);
        this.propertyPath = propertyPath;
    }

    // TODO: Add chainable property getters
}

/**
 * A property stream for JSON array values.
 * Provides onElement callback for reacting to elements as they start parsing.
 */
export class ListPropertyStream<T extends object> extends PropertyStream<T[]> {
    private propertyPath: string;

    constructor(
        future: Promise<T[]>,
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(future, parserController);
        this.propertyPath = propertyPath;
    }

    /**
     * Registers a callback that fires when each array element starts parsing.
     * The callback receives the property stream for the new element and its index.
     */
    onElement(
        callback: (propertyStream: PropertyStream<any>, index: number) => void,
    ): void {
        // TODO: Implementation
    }
}
