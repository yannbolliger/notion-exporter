import sade from "sade"

import NotionExporter from "./NotionExporter"
import action, { FileType } from "./action"

export default NotionExporter

export const cli = (args: string[]) => {
  const pkg = require("../package.json")

  sade("notion-exporter <blockId>", true)
    .version(pkg.version)
    .describe(
      `Export a block from Notion.so as Markdown or CSV file.
    The block is given by its 'blockId' which is the last part of the URL.
    Example: https://www.notion.so/Notion-Official-83715d7703ee4b8699b5e659a4712dd8
    Block Id: 83715d7703ee4b8699b5e659a4712dd8

    For access right's reasons, the 'NOTION_TOKEN' has to be either set on the
    environment or given to the prompt of the command. The 'NOTION_TOKEN' is the
    value of the 'token_v2' Cookie used by the official Notion.so API.

    © @yannbolliger, 2021.`
    )
    .option("-t, --type", `File type to be exported: ${FileType}`, "md")
    //  .option("-o, --output", "Output path of the exported file, stdin if empty")
    .example("83715d7703ee4b8699b5e659a4712dd8")
    .example("3af0a1e347dd40c5ba0a2c91e234b2a5 -t csv")
    //    .example("83715d7703ee4b8699b5e659a4712dd8 -t md -o blog.md")
    .action((blockId, opts) => action(blockId, opts.type))
    .parse(args)
}
