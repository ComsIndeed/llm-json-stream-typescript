/**
 * A streaming JSON parser optimized for LLM responses.
 *
 * This parser processes JSON data character-by-character as it streams in,
 * allowing you to react to properties before the entire JSON is received.
 * It's specifically designed for handling Large Language Model (LLM) streaming
 * responses that output structured JSON data.
 */
import { BooleanPropertyStreamController, ListPropertyStreamController, MapPropertyStreamController, NullPropertyStreamController, NumberPropertyStreamController, PropertyStreamController, StringPropertyStreamController, } from "./property_stream_controller.js";
import { BooleanPropertyStream, ListPropertyStream, MapPropertyStream, NullPropertyStream, NumberPropertyStream, PropertyStream, StringPropertyStream, } from "./property_stream.js";
import { PropertyDelegate } from "./property_delegates/property_delegate.js";
import { MapPropertyDelegate } from "./property_delegates/map_property_delegate.js";
import { ListPropertyDelegate } from "./property_delegates/list_property_delegate.js";
/**
 * Controller interface for coordinating parsing operations.
 * Internal use only - not exposed in public API.
 */
export class JsonStreamParserController {
    addPropertyChunkFn;
    getPropertyStreamControllerFn;
    getPropertyStreamFn;
    completePropertyFn;
    constructor(addPropertyChunkFn, getPropertyStreamControllerFn, getPropertyStreamFn, completePropertyFn) {
        this.addPropertyChunkFn = addPropertyChunkFn;
        this.getPropertyStreamControllerFn = getPropertyStreamControllerFn;
        this.getPropertyStreamFn = getPropertyStreamFn;
        this.completePropertyFn = completePropertyFn;
    }
    addPropertyChunk(params) {
        this.addPropertyChunkFn(params);
    }
    getPropertyStreamController(propertyPath) {
        return this.getPropertyStreamControllerFn(propertyPath);
    }
    getPropertyStream(propertyPath, streamType) {
        return this.getPropertyStreamFn(propertyPath, streamType);
    }
    completeProperty(propertyPath, value) {
        this.completePropertyFn(propertyPath, value);
    }
}
/**
 * Main streaming JSON parser class.
 */
export class JsonStreamParser {
    controller;
    streamAbortController = null;
    propertyControllers = new Map();
    disposed = false;
    rootDelegate = null;
    closeOnRootComplete;
    consumeStreamPromise = null;
    constructor(stream, options) {
        this.closeOnRootComplete = options?.closeOnRootComplete ?? true;
        this.controller = new JsonStreamParserController(this.addPropertyChunk.bind(this), this.getControllerForPath.bind(this), this.getPropertyStreamForPath.bind(this), this.completePropertyAtPath.bind(this));
        // Create an abort controller to stop the stream consumption
        this.streamAbortController = new AbortController();
        // Start consuming the stream
        this.consumeStreamPromise = this.consumeStream(stream);
    }
    async consumeStream(stream) {
        try {
            for await (const chunk of stream) {
                if (this.disposed || this.streamAbortController?.signal.aborted) {
                    break;
                }
                this.parseChunk(chunk);
                // Check if we should stop consuming after parsing
                if (this.closeOnRootComplete &&
                    this.rootDelegate &&
                    this.rootDelegate.done) {
                    this.streamAbortController?.abort();
                    break;
                }
            }
            // Stream ended normally
            this.handleStreamEnd();
        }
        catch (error) {
            // Stream error - reject all pending controllers
            for (const controller of this.propertyControllers.values()) {
                controller.completeError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }
    /**
     * Gets a stream for a string property at the specified propertyPath.
     */
    getStringProperty(propertyPath) {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof StringPropertyStreamController)) {
                throw new Error(`Property at path ${propertyPath} is not a StringPropertyStream`);
            }
            return existing.propertyStream;
        }
        const controller = new StringPropertyStreamController(this.controller, propertyPath);
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }
    /**
     * Gets a stream for a number property at the specified propertyPath.
     */
    getNumberProperty(propertyPath) {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof NumberPropertyStreamController)) {
                throw new Error(`Property at path ${propertyPath} is not a NumberPropertyStream`);
            }
            return existing.propertyStream;
        }
        const controller = new NumberPropertyStreamController(this.controller, propertyPath);
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }
    /**
     * Gets a stream for a boolean property at the specified propertyPath.
     */
    getBooleanProperty(propertyPath) {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof BooleanPropertyStreamController)) {
                throw new Error(`Property at path ${propertyPath} is not a BooleanPropertyStream`);
            }
            return existing.propertyStream;
        }
        const controller = new BooleanPropertyStreamController(this.controller, propertyPath);
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }
    /**
     * Gets a stream for a null property at the specified propertyPath.
     */
    getNullProperty(propertyPath) {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof NullPropertyStreamController)) {
                throw new Error(`Property at path ${propertyPath} is not a NullPropertyStream`);
            }
            return existing.propertyStream;
        }
        const controller = new NullPropertyStreamController(this.controller, propertyPath);
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }
    /**
     * Gets a stream for a map/object property at the specified propertyPath.
     */
    getMapProperty(propertyPath) {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof MapPropertyStreamController)) {
                throw new Error(`Property at path ${propertyPath} is not a MapPropertyStream`);
            }
            return existing.propertyStream;
        }
        const controller = new MapPropertyStreamController(this.controller, propertyPath);
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }
    /**
     * Gets a stream for a list/array property at the specified propertyPath.
     */
    getListProperty(propertyPath) {
        this.checkDisposed();
        const existing = this.propertyControllers.get(propertyPath);
        if (existing) {
            if (!(existing instanceof ListPropertyStreamController)) {
                throw new Error(`Property at path ${propertyPath} is not a ListPropertyStream`);
            }
            return existing.propertyStream;
        }
        const controller = new ListPropertyStreamController(this.controller, propertyPath);
        this.propertyControllers.set(propertyPath, controller);
        return controller.propertyStream;
    }
    /**
     * Disposes the parser and cleans up resources.
     */
    async dispose() {
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
            }
            catch {
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
    checkDisposed() {
        if (this.disposed) {
            throw new Error("Parser has been disposed");
        }
    }
    parseChunk(chunk) {
        if (this.disposed)
            return;
        // Check yap filter
        if (this.closeOnRootComplete &&
            this.rootDelegate &&
            this.rootDelegate.done) {
            this.streamAbortController?.abort();
            return;
        }
        try {
            for (const character of chunk) {
                // Check yap filter inside loop
                if (this.closeOnRootComplete &&
                    this.rootDelegate &&
                    this.rootDelegate.done) {
                    this.streamAbortController?.abort();
                    return;
                }
                if (this.rootDelegate !== null) {
                    this.rootDelegate.addCharacter(character);
                    continue;
                }
                // Skip leading whitespace before root element
                if (/\s/.test(character)) {
                    continue;
                }
                if (character === "{") {
                    this.rootDelegate = new MapPropertyDelegate("", this.controller);
                    this.rootDelegate.addCharacter(character);
                }
                else if (character === "[") {
                    this.rootDelegate = new ListPropertyDelegate("", this.controller);
                    this.rootDelegate.addCharacter(character);
                }
            }
            // Notify delegates about chunk end
            this.rootDelegate?.onChunkEnd();
            // Final check after chunk
            if (this.closeOnRootComplete &&
                this.rootDelegate &&
                this.rootDelegate.done) {
                this.streamAbortController?.abort();
            }
        }
        catch (e) {
            // Parsing error - already handled by completing specific controller with error
        }
    }
    handleStreamEnd() {
        // Complete any incomplete property controllers with errors
        for (const controller of this.propertyControllers.values()) {
            if (!controller.isClosed) {
                controller.completeError(new Error("Stream ended before property completed"));
            }
        }
    }
    addPropertyChunk(params) {
        const controller = this.propertyControllers.get(params.propertyPath);
        if (!controller)
            return;
        if (controller instanceof StringPropertyStreamController) {
            controller.addChunk(params.chunk);
        }
        else if (controller instanceof MapPropertyStreamController) {
            // Maps emit snapshots - push to async iterator without completing
            controller.propertyStream._pushValue(params.chunk);
        }
        else if (controller instanceof ListPropertyStreamController) {
            // Lists emit snapshots - push to async iterator without completing
            controller.propertyStream._pushValue(params.chunk);
        }
        // Numbers, booleans, and nulls don't receive chunks - they complete directly
    }
    getControllerForPath(propertyPath) {
        return this.propertyControllers.get(propertyPath);
    }
    getPropertyStreamForPath(propertyPath, streamType) {
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
                (streamType === "map" &&
                    existing instanceof MapPropertyStreamController) ||
                (streamType === "list" &&
                    existing instanceof ListPropertyStreamController);
            if (isCompatible) {
                return existing.propertyStream;
            }
            else {
                // Type mismatch - complete existing controller with error
                const error = new Error(`Type mismatch at path "${propertyPath}": requested ${streamType} but found different type`);
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
            case "map":
                return this.getMapProperty(propertyPath);
            case "list":
                return this.getListProperty(propertyPath);
            default:
                throw new Error(`Unknown stream type: ${streamType}`);
        }
    }
    completePropertyAtPath(propertyPath, value) {
        const controller = this.propertyControllers.get(propertyPath);
        if (!controller || controller.isClosed)
            return;
        if (controller instanceof StringPropertyStreamController) {
            controller.complete(value);
        }
        else if (controller instanceof NumberPropertyStreamController) {
            controller.complete(value);
        }
        else if (controller instanceof BooleanPropertyStreamController) {
            controller.complete(value);
        }
        else if (controller instanceof NullPropertyStreamController) {
            controller.complete(value);
        }
        else if (controller instanceof MapPropertyStreamController) {
            controller.complete(value);
        }
        else if (controller instanceof ListPropertyStreamController) {
            controller.complete(value);
        }
    }
}
//# sourceMappingURL=json_stream_parser.js.map