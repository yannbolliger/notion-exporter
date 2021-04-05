import rl from "readline"
import { AxiosError } from "axios"

import { NotionExporter } from "./NotionExporter"

export const FileType = ["md", "csv"] as const
type FileType = typeof FileType[number]

const isFileType = (s: string): s is FileType => FileType.includes(s as any)

const askToken = (): Promise<string> => {
  const prompt = rl.createInterface({
    input: process.stdin,
    output: process.stderr,
  })
  const promise = new Promise<string>((resolve) =>
    prompt.question("Paste your NOTION_TOKEN:\n", (token) => {
      resolve(token)
      prompt.close()
    })
  )
  return promise
}

const action = async (blockId: string, fileType: string) => {
  if (!isFileType(fileType)) {
    console.log(`File type (-t, --type) has to be one of: ${FileType}`)
    process.exit(1)
  }

  const token = process.env["NOTION_TOKEN"] || (await askToken())
  const exporter = new NotionExporter(token)

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
