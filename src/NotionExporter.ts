import axios, { AxiosInstance } from "axios"
import AdmZip from "adm-zip"
import { validate } from "uuid"

interface Task {
  id: string
  state: string
  status: { exportURL?: string }
}

export const validateUuid = (str: string): string | undefined => {
  if (validate(str)) return str
  const withDashes = str.replace(
    /(.{8})(.{4})(.{4})(.{4})(.+)/,
    "$1-$2-$3-$4-$5"
  )
  return validate(withDashes) ? withDashes : undefined
}

/** Lightweight client to export ZIP, Markdown or CSV files from a Notion block/page. */
export class NotionExporter {
  protected readonly client: AxiosInstance

  /**
   * Create a new NotionExporter client. To export any blocks/pages from
   * Notion.so one needs to provide the token of a user who has read access to
   * the corresponding pages.
   *
   * @param token – the Notion 'token_v2' Cookie value
   */
  constructor(token: string) {
    this.client = axios.create({
      baseURL: "https://www.notion.so/api/v3/",
      headers: {
        Cookie: `token_v2=${token}; `,
      },
    })
  }

  /**
   * Adds a an 'exportBlock' task to the Notion API's queue of tasks.
   *
   * @returns The task's id
   */
  async getTaskId(blockId: string): Promise<string> {
    const id = validateUuid(blockId)
    if (!id) return Promise.reject("Invalid blockId.")

    const res = await this.client.post("enqueueTask", {
      task: {
        eventName: "exportBlock",
        request: {
          block: { id },
          recursive: false,
          exportOptions: {
            exportType: "markdown",
            timeZone: "Europe/Zurich",
            locale: "en",
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
    taskId: string,
    pollInterval: number = 50
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const poll = async () => {
        const task = await this.getTask(taskId)
        if (task.state === "success" && task.status.exportURL)
          resolve(task.status.exportURL)
        else if (task.state === "in_progress") setTimeout(poll, pollInterval)
        else reject("Export task failed.")
      }
      setTimeout(poll, pollInterval)
    })

  /**
   * Starts an export of the given block and
   *
   * @returns The URL of the exported ZIP archive
   */
  getZipUrl = (blockId: string): Promise<string> =>
    this.getTaskId(blockId).then(this.pollTask)

  /**
   * Downloads the ZIP at the given URL.
   *
   * @returns The ZIP as an 'AdmZip' object
   */
  getZip = async (url: string): Promise<AdmZip> => {
    const res = await this.client.get(url, { responseType: "arraybuffer" })
    return new AdmZip(res.data)
  }

  /**
   * Exports the given block as ZIP and downloads it. Returns the matched file
   * in the ZIP as a string.
   *
   * @param blockId
   * @param predicate - Returns true for the zip entry to be extracted
   * @returns The matched file as string
   */
  async getFileString(
    blockId: string,
    predicate: (entry: AdmZip.IZipEntry) => boolean
  ): Promise<string> {
    const zip = await this.getZipUrl(blockId).then(this.getZip)
    const entry = zip.getEntries().find(predicate)
    return (
      entry?.getData().toString().trim() ||
      Promise.reject("Could not find file in ZIP.")
    )
  }

  /**
   * Downloads and extracts the first CSV file of the exported block as string.
   *
   * @returns The extracted CSV string
   */
  getCsvString = (blockId: string): Promise<string> =>
    this.getFileString(blockId, (e) => e.name.endsWith(".csv"))

  /**
   * Downloads and extracts the first Markdown file of the exported block as string.
   *
   * @returns The extracted Markdown string
   */
  getMdString = (blockId: string): Promise<string> =>
    this.getFileString(blockId, (e) => e.name.endsWith(".md"))
}
