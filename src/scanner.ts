import { compose, contains, map, prop, toPairs, unnest } from "ramda";
import { DependencyJson, IProjectOptions, listInstalledDependencies, readDependenciesJson } from "./filesystem/filesystem"; // tslint:disable-line
import { IInspectionOptions, inspectSourceFiles } from "./inspection/inspection"; // tslint:disable-line
import { DependencyGraph, IDependencyMetadata, ImportGraph } from "@ctek/wcm-graph";
import { firstDefinedProperty } from "./utilities/utilities";

/**
 * An asynchronous function that will prepare and return a dependency graph representing the inter-dependencies within
 * the project at the path provided.
 *
 * @param {IProjectOptions} opts                - The project and package manager configuration object
 * @param {string}          opts.projectPath    - The full path to the project
 * @param {string}          opts.packageManager - The package manger used in the project
 *
 * @returns {Promise<DependencyGraph>} A dependency graph describing the inter-dependencies within the project
 */
export async function generateDependencyGraph(opts: IProjectOptions): Promise<DependencyGraph> {
  const dependencyGraph = new DependencyGraph();

  await registerDeclaredDependencies(dependencyGraph, opts);
  await registerImpliedDependencies(dependencyGraph);

  for (let dependencyName of dependencyGraph.listDependencies()) {
    const dependencyData = dependencyGraph.getDependencyData(dependencyName);

    for (let [name, version] of toPairs<string, string>(dependencyData.dependencies)) {
      dependencyGraph.createInterDependency(dependencyName, { name, version });
    }
  }

  return dependencyGraph;
}

/**
 * @returns {Promise<ImportGraph>}
 */
export async function generateImportGraph(opts: IInspectionOptions): Promise<ImportGraph> { // tslint:disable-line
  const importGraph = new ImportGraph();

  await registerSourceFiles(importGraph, opts);

  return importGraph;
}

/**
 * Register each of the declared dependencies from the project at the path provided.
 *
 * @private
 *
 * @param {DependencyGraph} dependencyGraph     - The dependency graph to register against
 * @param {IProjectOptions} opts                - The project and package manager configuration object
 * @param {string}          opts.projectPath    - The full path to the project
 * @param {string}          opts.packageManager - The package manger used in the project
 *
 * @returns {Promise<void>}
 */
async function registerDeclaredDependencies(dependencyGraph: DependencyGraph, opts: IProjectOptions): Promise<void> {
  for (let dependencyJson of await readInstalledDependenciesJson(opts)) {
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
 * @returns {void}
 */
function registerImpliedDependencies(dependencyGraph: DependencyGraph): void {
  for (let [name, version] of getAllDependencyPairs(dependencyGraph)) {
    if (!contains(version, dependencyGraph.getDependencyAliases(name))) {
      dependencyGraph.addImpliedDependency({ name, version });
    }
  }
}

/**
 * @private
 *
 * @param {ImportGraph}        importGraph     - The import graph to register against
 * @param {IInspectionOptions} opts            - The project and package manager configuration object
 * @param {string}             opts.entryPath  - The full path to the project
 * @param {string}             opts.sourceRoot - The package manger used in the project
 *
 * @returns {Promise<void>}
 */
async function registerSourceFiles(importGraph: ImportGraph, opts: IInspectionOptions): Promise<void> {
  for (let inspection of inspectSourceFiles(opts)) {
    const fileMetadata = await inspection;

    console.log(JSON.stringify(fileMetadata, null, 4)) // tslint:disable-line
  }
}

/**
 * Retrieve an array of the installed dependencies JSON.
 *
 * @private
 *
 * @param {IProjectOptions} opts                - The project and package manager configuration object
 * @param {string}          opts.projectPath    - The full path to the project
 * @param {string}          opts.packageManager - The package manger used in the project
 *
 * @returns {Promise<DependencyJson[]>} A list of the installed dependencies JSON files
 */
async function readInstalledDependenciesJson(opts: IProjectOptions): Promise<DependencyJson[]> {
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
function getDependencyMetadata(dependencyJson: DependencyJson): IDependencyMetadata {
  return { name: dependencyJson.name, version: firstDefinedProperty(["version", "_release"])(dependencyJson) };
}

/**
 * Retrieve the child dependencies of the dependencies currently registered against the provided dependency graph.
 *
 * @private
 *
 * @param {DependencyGraph} dependencyGraph - The dependency graph to register against
 *
 * @returns {string[][]} The child dependencies as an array of arrays of strings
 */
function getAllDependencyPairs(dependencyGraph: DependencyGraph): string[][] {
  return compose(unnest, map(compose(getDependencyPairs, (dependencyName: string) => {
    return dependencyGraph.getDependencyData(dependencyName);
  })))(dependencyGraph.listDependencies());
}

function getDependencyPairs(dependencyJson: DependencyJson): string[][] {
  return toPairs<string, string>(prop("dependencies", dependencyJson));
}

generateImportGraph({
  entryPath: "index.html",
  importResolutions: {
    "/bower_components": "../../bower_components",
    "/views": "views",
  },
  importTags: {
    "app-route": "import",
    "link": "href",
    "script": "src",
  },
  sourceRoot: "/Users/iain.reid/git_repositories/webapp-learn/.build/public/",
})
  .then((graph) => console.log(JSON.stringify(graph.listFiles(), null, 4))) // tslint:disable-line
  .catch((err) => console.log(err)); // tslint:disable-line
