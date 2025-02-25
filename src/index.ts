import sade from "sade"

import { NotionExporter } from "./NotionExporter"
import action, { FileType } from "./action"

export default NotionExporter
export { Config, defaultConfig } from "./config"

export const cli = (args: string[]) => {
  const pkg = require("../package.json")

  sade("notion-exporter <blockId/URL>", true)
    .version(pkg.version)
    .describe(
      `Export a block, page or DB from Notion.so as Markdown or CSV. 
    The block/page is specified by its UUID or its URL, see examples below.

    To download any page, one has to provide the value of the Cookie 'token_v2'
    of a logged-in user on the official Notion.so website as 'NOTION_TOKEN'
    environment variable or via the prompt of the command.
    The user needs to have at least read access to the block/page to download.

    © ${pkg.author}, 2025.`
    )

    .option("-t, --type", `File type to be exported: ${FileType}`, "md")
    .option("-r, --recursive", "Export children subpages", false)
    .example(
      "https://www.notion.so/Notion-Official-83715d7703ee4b8699b5e659a4712dd8"
    )
    .example("83715d7703ee4b8699b5e659a4712dd8 -t md")
    .example("3af0a1e347dd40c5ba0a2c91e234b2a5 -t csv > list.csv")
    .action((blockId, opts) =>
      action(blockId, opts.type, {
        recursive: opts.recursive,
      })
    )
    .parse(args)
}
