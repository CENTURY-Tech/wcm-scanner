import { readdir, readJson, statSync } from "fs-promise";
import * as bowerJSON from "gist-bower-json";
import * as packageJSON from "gist-package-json";
import { resolve, sep } from "path";
import { curry, curryN, filter, last, map, pipe, split, test } from "ramda";

/**
 * An interface representing the Bower JSON files.
 */
export type BowerJson = bowerJSON.IBowerModuleJSON;

/**
 * An interface representing the Node Package JSON files.
 */
export type PackageJson = packageJSON.IPackageJSON;

/**
 * An enum of the supported package managers.
 */
export type PackageManager = "bower" | "npm";

/**
 * An interface representing the dependency reading methods.
 */
export type DependencyReader<T> = (dependencyName: string) => Promise<T>;

/**
 * An interface representing the dependency readers.
 */
export interface IDependencyOptions {
  projectPath: string;
  packageManager: PackageManager;
}

/**
 * An enum of the possible dependency JSON objects.
 */
export type DependencyJson = BowerJson | PackageJson;

/**
 * Read and parse the JSON file for the dependency located at the path provided.
 *
 * @param {Object} opts                - The project and package manager configuration object
 * @param {String} opts.projectPath    - The full path to the project
 * @param {String} opts.packageManager - The package manger used in the project
 *
 * @returns {Promise<DependencyJson>} The dependency JSON
 */
export function readDependenciesJson(opts: IDependencyOptions): DependencyReader<DependencyJson> | never {
  switch (opts.packageManager) {
    case "bower":
      return readDependencyBowerJson(opts.projectPath);
    case "npm":
      return readDependencyPackageJson(opts.projectPath);
    default:
      throw Error("A 'packageManager' must be supplied");
  }
}

export function readDependencyBowerJson(projectPath: string): DependencyReader<BowerJson> {
  return (dependencyName: string) => {
    return readBowerJson(resolve(projectPath, "bower_components", dependencyName));
  };
}

export function readDependencyPackageJson(projectPath: string): DependencyReader<PackageJson> {
  return (dependencyName: string) => {
    return readPackageJson(resolve(projectPath, "node_modules", dependencyName));
  };
}

export async function readBowerJson(projectPath: string): Promise<BowerJson> {
  return readJson(resolve(projectPath, ".bower.json"));
}

export async function readPackageJson(projectPath: string): Promise<PackageJson> {
  return readJson(resolve(projectPath, "package.json"));
}

/**
 * Scan the relevant dependencies directory, depending on which package manager has been declared, and return a list of
 * the installed dependencies.
 *
 * @param {Object} opts                - The project and package manager configuration object
 * @param {String} opts.projectPath    - The full path to the project
 * @param {String} opts.packageManager - The package manger used in the project
 *
 * @returns {Promise<String[]>} A list of installed dependencies
 */
export async function listInstalledDependencies(opts: IDependencyOptions): Promise<string[]> | never {
  switch (opts.packageManager) {
    case "bower":
      return listDirectoryChildren(resolve(opts.projectPath, "bower_components")).then(extractFolderNamesSync);
    case "npm":
      return listDirectoryChildren(resolve(opts.projectPath, "node_modules")).then(extractFolderNamesSync);
    default:
      throw Error("A 'packageManager' must be supplied");
  }
}

/**
 * Scan and retrieve a list of fully qualified paths for the children of the directory at the path provided.
 *
 * @param {String} directoryPath - The full path to the directory to scan
 *
 * @returns {String[]} A list of fully qualified paths for the children of the directory at the path provided
 */
export async function listDirectoryChildren(directoryPath: string): Promise<string[]> {
  return readdir(directoryPath).then(map<string, string>(curryN(2, resolve)(directoryPath)));
}

/**
 * Synchronously retrieve the names of the folders from the list of fully qualified paths provided.
 *
 * @private
 *
 * @param {String[]} paths - The list of full paths
 *
 * @returns {String[]} A list of directory names retrieved from the list of fully qualified paths provided
 */
function extractFolderNamesSync(paths: string[]): string[] {
  return pipe(extractFoldersSync, extractPathEndingsSync, filterDotFiles)(paths);
}

/**
 * Synchronously filter out any files from the list of fully qualified paths provided.
 *
 * @private
 *
 * @param {String[]} paths - The list of full paths
 *
 * @returns {String[]} A list of full directory paths extracted from the list of fully qualified paths provided
 */
function extractFoldersSync(paths: string[]): string[] {
  return paths.filter((item) => statSync(item).isDirectory());
}

/**
 * Synchronously extract the path endings from the list of fully qualified paths provided.
 *
 * @private
 *
 * @param {String[]} paths - The list of full paths
 *
 * @returns {String[]} A list of path endings extracted from the list of fully qualified paths provided
 */
function extractPathEndingsSync(paths: string[]): string[] {
  return paths.map(pipe(split(sep), last as (x: string[]) => string));
}

/**
 * Synchronously remove filesname that are hidden.
 *
 * @private
 *
 * @param {String[]} filenames - The list of filenames
 *
 * @returns {String[]} A list of filenames that are not hidden
 */
function filterDotFiles(filesname: string[]): string[] {
  return filter(test(/^\w/), filesname);
}
