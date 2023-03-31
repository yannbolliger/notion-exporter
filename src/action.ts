import rl from "readline"
import { AxiosError } from "axios"

import { NotionExporter } from "./NotionExporter"

export const FileType = ["md", "csv"] as const
type FileType = typeof FileType[number]

const isFileType = (s: string): s is FileType => FileType.includes(s as any)

const askToken = (tokenName: string): Promise<string> => {
  const prompt = rl.createInterface({
    input: process.stdin,
    output: process.stderr,
  })
  const promise = new Promise<string>((resolve) =>
    prompt.question(`Paste your ${tokenName}:\n`, (token) => {
      resolve(token)
      prompt.close()
    })
  )
  return promise
}

const envOrAskToken = async (tokenName: string) =>
  process.env[tokenName] || (await askToken(tokenName))

const action = async (blockId: string, fileType: string) => {
  if (!isFileType(fileType)) {
    console.log(`File type (-t, --type) has to be one of: ${FileType}`)
    process.exit(1)
  }

  const tokenV2 = await envOrAskToken("NOTION_TOKEN")
  const fileToken = await envOrAskToken("NOTION_FILE_TOKEN")
  const exporter = new NotionExporter(tokenV2, fileToken)

  const outputStr =
    fileType === "csv"
      ? exporter.getCsvString(blockId)
      : exporter.getMdString(blockId)

  outputStr.then(console.log).catch((e) => {
    if (e?.isAxiosError) {
      const axiosError = e as AxiosError
      console.log(axiosError.message)
      console.log(axiosError.response?.data)
    } else {
      console.log(e)
    }
    process.exit(1)
  })
}

export default action
