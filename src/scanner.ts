import { compose, contains, map, prop, toPairs, unnest } from "ramda";
import { DependencyJson, IDependencyOptions, listInstalledDependencies, readDependenciesJson } from "./filesystem/filesystem"; // tslint:disable-line
import { DependencyGraph, IBaseDependencyMetadata } from "@ctek/wcm-graph";
import { firstDefinedProperty } from "./utilities/utilities";

const nodeNameFrom = DependencyGraph.stringifyDependencyMetadata;

/**
 * An asynchronous function that will prepare and return a dependency graph representing the inter-dependencies within
 * the project at the path provided.
 *
 * @param {Object} opts                - The project and package manager configuration object
 * @param {String} opts.projectPath    - The full path to the project
 * @param {String} opts.packageManager - The package manger used in the project
 *
 * @returns {Promise<DependencyGraph>} A dependency graph describing the inter-dependencies within the project
 */
export async function generateDeclaredDependenciesGraph(opts: IDependencyOptions): Promise<DependencyGraph> {
  "use strict";

  const dependencyGraph = new DependencyGraph();

  await registerDeclaredDependencies(dependencyGraph, opts);
  await registerImpliedDependencies(dependencyGraph);

  for (const dependencyName of dependencyGraph.listDependencies()) {
    const dependencyData = dependencyGraph.getDependencyData(dependencyName);

    for (const [name, version] of toPairs<string, string>(dependencyData.dependencies)) {
      dependencyGraph.createInterDependency(dependencyName, { name, version });
    }
  }

  return Promise.resolve(dependencyGraph);
}

/**
 * An asynchronous function that will prepare and return a dependency graph representing the runtime dependencies within
 * the project at the path provided.
 *
 * @param {Object} opts             - The project configuration object
 * @param {String} opts.projectPath - The full path to the project
 * @param {String} entryPath        - The path to the application root relative from the project root
 *
 * @returns {Promise<DependencyGraph>} A dependency graph listing the runtime dependencies within the project
 */
export async function generateImportedDependenciesGraph(opts: IDependencyOptions, entryPath: string): Promise<DependencyGraph> { // tslint:disable-line
  "use strict";

  return Promise.resolve(new DependencyGraph());
}

/**
 * Register each of the declared dependencies from the project at the path provided.
 *
 * @private
 *
 * @param {DependencyGraph} dependencyGraph     - The dependency graph to register against
 * @param {Object}          opts                - The project and package manager configuration object
 * @param {String}          opts.projectPath    - The full path to the project
 * @param {String}          opts.packageManager - The package manger used in the project
 *
 * @returns {Promise<Void>}
 */
async function registerDeclaredDependencies(dependencyGraph: DependencyGraph, opts: IDependencyOptions): Promise<void> {
  for (const dependencyJson of await readInstalledDependenciesJson(opts)) {
    dependencyGraph.addRealDependency(getDependencyMetadata(dependencyJson), dependencyJson);
  }
}

/**
 * Register each of the implied dependencies specified by the declared dependencies already registered.
 *
 * @private
 *
 * @param {DependencyGraph} dependencyGraph - The dependency graph to register against
 *
 * @returns {Promise<Void>}
 */
async function registerImpliedDependencies(dependencyGraph: DependencyGraph): Promise<void> {
  for (const [name, version] of getAllDependencyPairs(dependencyGraph)) {
    if (!contains(version, dependencyGraph.getDependencyAliases(name))) {
      dependencyGraph.addImpliedDependency({ name, version });
    }
  }
}

/**
 * Retrieve an array of the installed dependencies JSON.
 *
 * @private
 *
 * @param {Object} opts                - The project and package manager configuration object
 * @param {String} opts.projectPath    - The full path to the project
 * @param {String} opts.packageManager - The package manger used in the project
 *
 * @returns {Promise<DependencyJson[]>} A list of the installed dependencies JSON files
 */
async function readInstalledDependenciesJson(opts: IDependencyOptions): Promise<DependencyJson[]> {
  return Promise.all((await listInstalledDependencies(opts)).map(readDependenciesJson(opts)));
}

/**
 * Retrieve the dependency metadata from the dependency JSON.
 *
 * @private
 *
 * @param {DependencyJson} dependencyJson - The dependency JSON
 *
 * @return {DependencyMetadata} A object containing the dependencys name and version
 */
function getDependencyMetadata(dependencyJson: DependencyJson): IBaseDependencyMetadata {
  return { name: dependencyJson.name, version: firstDefinedProperty(["version", "_release"])(dependencyJson) };
}

/**
 * Retrieve the child dependencies of the dependencies currently registered against the provided dependency graph.
 *
 * @private
 *
 * @param {DependencyGraph} dependencyGraph - The dependency graph to register against
 *
 * @returns {String[][]} The child dependencies as an array of arrays of strings
 */
function getAllDependencyPairs(dependencyGraph: DependencyGraph): string[][] {
  return compose(unnest, map(compose(getDependencyPairs, (dependencyName: string) => {
    return dependencyGraph.getDependencyData(dependencyName);
  })))(dependencyGraph.listDependencies());
}

function getDependencyPairs(dependencyJson: DependencyJson): string[][] {
  return toPairs<string, string>(prop("dependencies", dependencyJson));
}

generateDeclaredDependenciesGraph({
  packageManager: "bower",
  projectPath: "/Users/iain.reid/git_repositories/webapp-learn",
})
  .then((graph) => console.log(JSON.stringify(graph.listDependantsOfDependency("polymer"), null, 4))) // tslint:disable-line
  .catch((err) => console.log(err)); // tslint:disable-line
