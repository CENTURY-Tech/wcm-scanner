import { load } from "cheerio";
import { existsSync, readFile } from "fs-promise";
import { resolve } from "path";
import { toPairs } from "ramda";

/**
 * An interface representing the inspection options.
 */
export interface IInspectionOptions {
  entryPath: string;
  sourceRoot: string;

  /**
   * A map of path placeholders and replacing values to aid import resolution.
   */
  importResolutions: {
    [pathPlaceholder: string]: string;
  };

  /**
   * A map of tag names and attributes that hold any import paths.
   */
  importTags: {
    [tagName: string]: string;
  };
}

export interface IFileMetadata {
  filePath: string;
  importDeclarations: IImportDeclaration[];
}

export interface IImportDeclaration {
  importPath: string;
  importDetails: {
    tagName: string;
    attributeName: string;
  };
}

export function* inspectSourceFiles(opts: IInspectionOptions): IterableIterator<Promise<IFileMetadata>> {
  yield getMetadataForFile(opts, resolve(opts.sourceRoot, opts.entryPath));
}

async function getMetadataForFile(opts: IInspectionOptions, filePath: string): Promise<IFileMetadata> {
  const fileMetadata: IFileMetadata = {
    filePath,
    importDeclarations: [],
  };

  const $ = load(await readFileAtPath(filePath));

  for (let [tagName, attributeName] of toPairs<string, string>(opts.importTags)) {
    for (let link of $(tagName).toArray()) {
      let attributeValue = link.attribs[attributeName];

      if (attributeValue) {
        for (let [pathPlaceholder, replacingValue] of toPairs<string, string>(opts.importResolutions)) {
          attributeValue = attributeValue.replace(pathPlaceholder, replacingValue);
        }

        fileMetadata.importDeclarations.push({
          importDetails: {
            tagName,
            attributeName,
          },
          importPath: resolve(opts.sourceRoot, attributeValue),
        });
      }
    }
  }

  return fileMetadata;
}

function readFileAtPath(filePath: string): Promise<string> {
  if (!existsSync(filePath)) {
    throw Error(`File not found at path "${filePath}"`);
  }

  return readFile(filePath, "utf8");
}
