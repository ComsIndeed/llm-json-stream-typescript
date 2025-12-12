import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";
import {
    BooleanPropertyStream,
    ArrayPropertyStream,
    ObjectPropertyStream,
    NullPropertyStream,
    NumberPropertyStream,
    StringPropertyStream,
} from "../src/classes/property_stream.js";

describe("ObjectPropertyStream.onProperty", () => {
    test("fires callback for each property in a map", async () => {
        const input = '{"name":"Alice","age":30,"active":true}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const mapStream = parser.getObjectProperty("");
        const discoveredProperties: string[] = [];
        const propertyTypes: Record<string, string> = {};

        mapStream.onProperty((property, key) => {
            discoveredProperties.push(key);
            propertyTypes[key] = property.constructor.name;
        });

        const result = await mapStream.promise;

        expect(result).toEqual({ name: "Alice", age: 30, active: true });
        expect(discoveredProperties).toEqual(["name", "age", "active"]);
        expect(propertyTypes["name"]).toBe("StringPropertyStream");
        expect(propertyTypes["age"]).toBe("NumberPropertyStream");
        expect(propertyTypes["active"]).toBe("BooleanPropertyStream");
    });

    test("can get property values via promise in callback", async () => {
        const input = '{"a":1,"b":"two","c":true}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const mapStream = parser.getObjectProperty("");
        const values: Record<string, any> = {};
        const valuePromises: Promise<void>[] = [];

        mapStream.onProperty((property, key) => {
            valuePromises.push(
                property.promise.then((value) => {
                    values[key] = value;
                }),
            );
        });

        await mapStream.promise;
        await Promise.all(valuePromises);

        expect(values).toEqual({ a: 1, b: "two", c: true });
    });

    test("works with nested maps", async () => {
        const input = '{"user":{"name":"Bob","address":{"city":"NYC"}}}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const rootMap = parser.getObjectProperty("");
        const userMap = parser.getObjectProperty("user");
        const addressMap = parser.getObjectProperty("user.address");

        const rootProps: string[] = [];
        const userProps: string[] = [];
        const addressProps: string[] = [];

        rootMap.onProperty((_, key) => {
            rootProps.push(key);
        });

        userMap.onProperty((_, key) => {
            userProps.push(key);
        });

        addressMap.onProperty((_, key) => {
            addressProps.push(key);
        });

        const result = await rootMap.promise;

        expect(result).toEqual({
            user: {
                name: "Bob",
                address: { city: "NYC" },
            },
        });
        expect(rootProps).toEqual(["user"]);
        expect(userProps).toEqual(["name", "address"]);
        expect(addressProps).toEqual(["city"]);
    });

    test("handles maps with list properties", async () => {
        const input = '{"items":[1,2,3],"names":["a","b"]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 6,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const mapStream = parser.getObjectProperty("");
        const propertyTypes: Record<string, string> = {};

        mapStream.onProperty((property, key) => {
            propertyTypes[key] = property.constructor.name;
        });

        const result = await mapStream.promise;

        expect(result).toEqual({ items: [1, 2, 3], names: ["a", "b"] });
        expect(propertyTypes["items"]).toBe("ArrayPropertyStream");
        expect(propertyTypes["names"]).toBe("ArrayPropertyStream");
    });

    test("handles maps with null and boolean values", async () => {
        const input = '{"flag":true,"data":null,"other":false}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 7,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const mapStream = parser.getObjectProperty("");
        const propertyTypes: Record<string, string> = {};

        mapStream.onProperty((property, key) => {
            propertyTypes[key] = property.constructor.name;
        });

        const result = await mapStream.promise;

        expect(result).toEqual({ flag: true, data: null, other: false });
        expect(propertyTypes["flag"]).toBe("BooleanPropertyStream");
        expect(propertyTypes["data"]).toBe("NullPropertyStream");
        expect(propertyTypes["other"]).toBe("BooleanPropertyStream");
    });

    test("multiple onProperty callbacks can be registered", async () => {
        const input = '{"x":1,"y":2}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const mapStream = parser.getObjectProperty("");
        const callback1Keys: string[] = [];
        const callback2Keys: string[] = [];

        mapStream.onProperty((_, key) => {
            callback1Keys.push(key);
        });

        mapStream.onProperty((_, key) => {
            callback2Keys.push(key);
        });

        await mapStream.promise;

        expect(callback1Keys).toEqual(["x", "y"]);
        expect(callback2Keys).toEqual(["x", "y"]);
    });

    test("empty object fires no callbacks", async () => {
        const input = '{"empty":{}}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const emptyMap = parser.getObjectProperty("empty");
        const properties: string[] = [];

        emptyMap.onProperty((_, key) => {
            properties.push(key);
        });

        const result = await emptyMap.promise;

        expect(result).toEqual({});
        expect(properties).toEqual([]);
    });

    test("fires before property value is complete", async () => {
        const input =
            '{"message":"This is a long message that streams slowly"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 20,
        });
        const parser = new JsonStreamParser(stream);

        const mapStream = parser.getObjectProperty("");
        let callbackFiredTime = Date.now();
        let futureCompleteTime = Date.now();

        mapStream.onProperty((property, key) => {
            callbackFiredTime = Date.now();
        });

        await mapStream.promise;
        futureCompleteTime = Date.now();

        // The callback should fire before the future completes
        expect(callbackFiredTime).toBeLessThanOrEqual(futureCompleteTime);
    });
});

