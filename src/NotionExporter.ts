import AdmZip from "adm-zip"

import { blockIdFromUrl, validateUuid } from "./blockId"
import { Config, defaultConfig } from "./config"

interface Task {
  outputKey: string
  spaceId: string
}

interface TaskOutput {
  lifecycle: string
  value?: { exportURL?: string }
}

export const tokenV2Name = "NOTION_TOKEN"
export const fileTokenName = "NOTION_FILE_TOKEN"

const argOrEnv = (envName: string, arg?: string): string => {
  const token = arg?.trim() || process.env[envName]?.trim()
  if (!token) {
    throw new Error(`Missing ${envName}`)
  }
  return token
}

/** Lightweight client to export ZIP, Markdown or CSV files from a Notion block/page. */
export class NotionExporter {
  private readonly token: string
  private readonly fileToken: string
  private readonly config: Config

  /**
   * Create a new NotionExporter client. To export any blocks/pages from
   * Notion one needs to provide the tokens of a user who has read access to
   * the corresponding pages.
   *
   * @note alternatively the tokens can be read from the `env`
   *
   * @param tokenV2 – the Notion `token_v2` Cookie value
   *                  (or from env as `NOTION_TOKEN`)
   * @param fileToken – the Notion `file_token` Cookie value
   *                  (or from env as `NOTION_FILE_TOKEN`)
   * @param config - additional configuration options
   */
  constructor(tokenV2?: string, fileToken?: string, config?: Config) {
    this.token = argOrEnv(tokenV2Name, tokenV2)
    this.fileToken = argOrEnv(fileTokenName, fileToken)
    this.config = Object.assign(defaultConfig, config)
  }

  private fetch = async (
    url: string,
    init?: RequestInit,
  ): Promise<Response> => {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Cookie: `token_v2=${this.token};file_token=${this.fileToken}`,
      },
    })
    if (!res.ok) {
      throw new Error(
        `${res.status} ${res.statusText} for ${url}: ${await res.text()}`,
      )
    }
    return res
  }

  private post = (endpoint: string, body: object) =>
    this.fetch(`https://app.notion.com/api/v3/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((res) => res.json())

  private getSpaceId = async (blockId: string): Promise<string> => {
    const data = await this.post("syncRecordValuesMain", {
      requests: [{ pointer: { table: "block", id: blockId }, version: -1 }],
    })
    const spaceId = data.recordMap.block?.[blockId]?.spaceId
    return (
      spaceId || Promise.reject(`Could not find space of block: ${blockId}`)
    )
  }

  /**
   * Enqueues an export of the given block in the Notion API.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The task's output key and space id, needed to poll its result
   */
  enqueueTask = async (idOrUrl: string): Promise<Task> => {
    const id = validateUuid(blockIdFromUrl(idOrUrl))
    if (!id) return Promise.reject(`Invalid URL or blockId: ${idOrUrl}`)

    const spaceId = await this.getSpaceId(id)

    // extract pollInterval to not put it in request
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { recursive, pollInterval, ...config } = this.config
    return this.post("enqueueExportBlock", {
      block: { id, spaceId },
      // Recursive needs to be set
      recursive: !!recursive,
      shouldExportComments: false,
      exportOptions: {
        exportType: "markdown",
        ...config,
      },
    })
  }

  private getTaskOutput = async ({
    outputKey,
    spaceId,
  }: Task): Promise<TaskOutput | undefined> => {
    const data = await this.post("syncRecordValuesMain", {
      requests: [
        {
          pointer: { table: "task_output", id: outputKey, spaceId },
          version: -1,
        },
      ],
      spacePointer: { table: "space", id: spaceId },
    })
    const output = data.recordMap.task_output?.[outputKey]?.value?.value
    if (!output) {
      console.warn(`No task output was returned from API: ${outputKey}`)
    }
    return output
  }

  private pollTask = (task: Task): Promise<string> =>
    new Promise((resolve, reject) => {
      const interval = this.config.pollInterval || defaultConfig.pollInterval
      const poll = async () => {
        const output = await this.getTaskOutput(task)
        if (output?.lifecycle === "success" && output.value?.exportURL)
          resolve(output.value.exportURL)
        else if (output?.lifecycle === "in_progress") {
          setTimeout(poll, interval)
        } else {
          console.error(task.outputKey, output)
          reject(`Export task failed: ${task.outputKey}.`)
        }
      }
      setTimeout(poll, interval)
    })

  /**
   * Starts an export of the given block and
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The URL of the exported ZIP archive
   */
  getZipUrl = (idOrUrl: string): Promise<string> =>
    this.enqueueTask(idOrUrl).then(this.pollTask)

  /**
   * Downloads the ZIP at the given URL.
   *
   * @returns The ZIP as an 'AdmZip' object
   */
  private downloadZip = async (url: string): Promise<AdmZip> => {
    const res = await this.fetch(url)
    return new AdmZip(Buffer.from(await res.arrayBuffer()))
  }

  getZip = (idOrUrl: string): Promise<AdmZip> =>
    this.getZipUrl(idOrUrl).then(this.downloadZip)

  /**
   * Downloads and extracts all files in the exported zip to the given folder.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @param path Folder path where the files are unzipped
   */
  getMdFiles = async (idOrUrl: string, path: string): Promise<void> => {
    const zip = await this.getZip(idOrUrl)
    zip.extractAllTo(path)
  }

  /**
   * Exports the given block as ZIP and downloads it. Returns the matched file
   * in the ZIP as a string.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @param predicate - Returns true for the zip entry to be extracted
   * @returns The matched file as string
   */
  getFileString = async (
    idOrUrl: string,
    predicate: (entry: AdmZip.IZipEntry) => boolean,
  ): Promise<string> => {
    const zip = await this.getZip(idOrUrl)
    const entry = zip.getEntries().find(predicate)
    return (
      entry?.getData().toString().trim() ||
      Promise.reject("Could not find file in ZIP.")
    )
  }

  /**
   * Downloads and extracts the first CSV file of the exported block as string.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The extracted CSV string
   */
  getCsvString = (
    idOrUrl: string,
    onlyCurrentView?: boolean,
  ): Promise<string> =>
    this.getFileString(idOrUrl, (e) =>
      e.name.endsWith(onlyCurrentView ? ".csv" : "_all.csv"),
    )

  /**
   * Downloads and extracts the first Markdown file of the exported block as string.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The extracted Markdown string
   */
  getMdString = (idOrUrl: string): Promise<string> =>
    this.getFileString(idOrUrl, (e) => e.name.endsWith(".md"))
}
