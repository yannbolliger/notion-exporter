import sade from "sade"

import { NotionExporter } from "./NotionExporter"
import action, { FileType } from "./action"

export default NotionExporter

export const cli = (args: string[]) => {
  const pkg = require("../package.json")

  sade("notion-exporter <blockId>", true)
    .version(pkg.version)
    .describe(
      `Export a block from Notion.so as Markdown or CSV file.
    The block is given by its 'blockId' which is the last part of the URL.
    https://www.notion.so/Notion-Official-83715d7703ee4b8699b5e659a4712dd8
                                          ^^^^^^^      blockId     ^^^^^^^

    To download any page, one has to provide the value of the Cookie 'token_v2'
    of a logged-in user on the official Notion.so API as 'NOTION_TOKEN'
    environment variable or via the prompt of the command.
    The user needs to have at least read access to the block/page to download.

    © ${pkg.author}, 2021.`
    )
    .option("-t, --type", `File type to be exported: ${FileType}`, "md")
    //  .option("-o, --output", "Output path of the exported file, stdin if empty")
    .example("83715d7703ee4b8699b5e659a4712dd8")
    .example("3af0a1e347dd40c5ba0a2c91e234b2a5 -t csv > list.csv")
    //    .example("83715d7703ee4b8699b5e659a4712dd8 -t md -o blog.md")
    .action((blockId, opts) => action(blockId, opts.type))
    .parse(args)
}
