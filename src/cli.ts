import sade from "sade"
import rl from "readline"

import { fileTokenName, NotionExporter, tokenV2Name } from "./NotionExporter"
import { Config } from "./config"

import pkg from "../package.json"

export const FileType = ["md", "csv"] as const
type FileType = (typeof FileType)[number]

const isFileType = (s: string): s is FileType =>
  (FileType as readonly string[]).includes(s)

const askToken = (tokenName: string): Promise<string> => {
  const prompt = rl.createInterface({
    input: process.stdin,
    output: process.stderr,
  })
  const promise = new Promise<string>((resolve) =>
    prompt.question(`Paste your ${tokenName}:\n`, (token) => {
      resolve(token)
      prompt.close()
    }),
  )
  return promise
}

const envOrAskToken = async (tokenName: string) =>
  process.env[tokenName] || (await askToken(tokenName))

const action = async (blockId: string, fileType: string, config?: Config) => {
  if (!isFileType(fileType)) {
    console.log(`File type (-t, --type) has to be one of: ${FileType}`)
    process.exit(1)
  }

  const tokenV2 = await envOrAskToken(tokenV2Name)
  const fileToken = await envOrAskToken(fileTokenName)
  const exporter = new NotionExporter(tokenV2, fileToken, config)

  const outputStr =
    fileType === "csv"
      ? exporter.getCsvString(blockId)
      : exporter.getMdString(blockId)

  outputStr.then(console.log).catch((e) => {
    console.log(e)
    process.exit(1)
  })
}

export const cli = (args: string[]) => {
  sade("notion-exporter <blockId/URL>", true)
    .version(pkg.version)
    .describe(
      `Export a block, page or DB from Notion as Markdown or CSV. 
    The block/page is specified by its UUID or its URL.

    To download any page, the values of the cookies 'token_v2' and 'file_token'
    of a logged-in user in Notion need to be provided as '${tokenV2Name}' and 
    '${fileTokenName}' environment variable or via prompt. The user needs to 
    have at least read access to the block/page to download.

    © ${pkg.author}, 2026.`,
    )

    .option("-t, --type", `File type to be exported: ${FileType}`, "md")
    .option("-r, --recursive", "Export children subpages", false)
    .example(
      "https://www.notion.so/Notion-Official-83715d7703ee4b8699b5e659a4712dd8",
    )
    .example("83715d7703ee4b8699b5e659a4712dd8 -t md")
    .example("3af0a1e347dd40c5ba0a2c91e234b2a5 -t csv > list.csv")
    .action((blockId, opts) =>
      action(blockId, opts.type, {
        recursive: opts.recursive,
      }),
    )
    .parse(args)
}
