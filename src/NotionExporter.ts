import axios, { AxiosInstance } from "axios"
import AdmZip from "adm-zip"

import { blockIdFromUrl, validateUuid } from "./blockId"
import { Config, defaultConfig } from "./config"

interface Task {
  id: string
  state: string
  status: { exportURL?: string }
}

/** Lightweight client to export ZIP, Markdown or CSV files from a Notion block/page. */
export class NotionExporter {
  protected readonly client: AxiosInstance
  private readonly config: Config

  /**
   * Create a new NotionExporter client. To export any blocks/pages from
   * Notion.so one needs to provide the token of a user who has read access to
   * the corresponding pages.
   *
   * @param tokenV2 – the Notion `token_v2` Cookie value
   * @param fileToken – the Notion `file_token` Cookie value
   */
  constructor(tokenV2: string, fileToken: string, config?: Config) {
    this.client = axios.create({
      baseURL: "https://www.notion.so/api/v3/",
      headers: {
        Cookie: `token_v2=${tokenV2};file_token=${fileToken}`,
      },
    })
    this.config = Object.assign(defaultConfig, config)
  }

  /**
   * Adds a an 'exportBlock' task to the Notion API's queue of tasks.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The task's id
   */
  async getTaskId(idOrUrl: string): Promise<string> {
    const id = validateUuid(blockIdFromUrl(idOrUrl))
    if (!id) return Promise.reject(`Invalid URL or blockId: ${idOrUrl}`)

    const { recursive, includeContents, ...config } = this.config
    const res = await this.client.post("enqueueTask", {
      task: {
        eventName: "exportBlock",
        request: {
          block: { id },
          // Recursive needs to be set
          recursive: !!recursive,
          exportOptions: {
            exportType: "markdown",
            includeContents: !includeContents ? "no_files" : undefined,
            ...config,
          },
        },
      },
    })
    return res.data.taskId
  }

  private getTask = async (taskId: string): Promise<Task> => {
    const res = await this.client.post("getTasks", { taskIds: [taskId] })
    return res.data.results.find((t: Task) => t.id === taskId)
  }

  private pollTask = (
    taskId: string
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const poll = async () => {
        const task = await this.getTask(taskId)
        if (task.state === "success" && task.status.exportURL)
          resolve(task.status.exportURL)
        else if (task.state === "in_progress" || task.state === "not_started") {
          setTimeout(poll, this.config.pollInterval)
        } else {
          console.error(taskId, task)
          reject(`Export task failed: ${taskId}.`)
        }
      }
      setTimeout(poll, pollInterval)
    })

  /**
   * Starts an export of the given block and
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The URL of the exported ZIP archive
   */
  getZipUrl = (idOrUrl: string): Promise<string> =>
    this.getTaskId(idOrUrl).then(this.pollTask)

  /**
   * Downloads the ZIP at the given URL.
   *
   * @returns The ZIP as an 'AdmZip' object
   */
  private downloadZip = async (url: string): Promise<AdmZip> => {
    const res = await this.client.get(url, { responseType: "arraybuffer" })
    return new AdmZip(res.data)
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
  async getFileString(
    idOrUrl: string,
    predicate: (entry: AdmZip.IZipEntry) => boolean
  ): Promise<string> {
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
    onlyCurrentView?: boolean
  ): Promise<string> =>
    this.getFileString(idOrUrl, (e) =>
      e.name.endsWith(onlyCurrentView ? ".csv" : "_all.csv")
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
