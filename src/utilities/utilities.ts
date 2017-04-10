import { compose, converge, curry, head, identity, intersection, keys, map, prop, zipObj } from "ramda";

/**
 * An interface representing a generic key value store
 */
export interface IKeyValue<T> {
  [x: string]: T;
};

/**
 * Find and return the first defined property from within the list of provided properties from the object later
 * provided.
 *
 * @param {String[]} props - The properties to check if they are defined
 *
 * @return {Function} A method that will return the first defined property from the object provided
 */
export function firstDefinedProperty(props: string[]): (obj: Object) => any {
  return (obj: Object): any => {
    return prop(compose(head, curry(intersection)(props), keys)(obj), obj);
  };
}

/**
 * A curried method to generate an indexed object from an array of strings. This method will execute the function passed
 * with the string found at each position in the array provided upon final execution, and map the returned value to the
 * key in the final object with the relevant string.
 *
 * @param {Function} method - The function with which to create the objects values
 *
 * @returns {Function} A method that will return a new object whos values are equated from the method provided
 */
export function toObjectBy<U>(method: (x: string) => U): (arr: string[]) => IKeyValue<U> {
  return converge(zipObj, [map(identity), map(method)]) as (arr: string[]) => IKeyValue<U>;
}

/**
 * Prune any preceeding text from a version identifier, commonly found in Bower declaration files, and return the true
 * version.
 *
 * @param {String} version - The version string to parse
 *
 * @returns {String} The true version from the string provided
 */
export function pruneVersionString(version: string): string {
  return /(\*)|(\^|~|<|>|(<|>)=)?((\d.)?(\d.)?)?\d$/.exec(version)[0];
}
