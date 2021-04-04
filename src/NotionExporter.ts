import axios, { AxiosInstance } from "axios"
import AdmZip from "adm-zip"

interface Task {
  id: string
  state: string
  status: { exportURL?: string }
}

export default class NotionExporter {
  protected readonly client: AxiosInstance

  constructor(token?: string) {
    const cookies = token
      ? {
          Cookie: `token_v2=${token}; `,
        }
      : {}

    this.client = axios.create({
      baseURL: "https://www.notion.so/api/v3/",
      headers: { ...cookies },
    })
  }

  async getTaskId(blockId: string): Promise<string> {
    const res = await this.client.post("enqueueTask", {
      task: {
        eventName: "exportBlock",
        request: {
          blockId,
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
        else reject()
      }
      setTimeout(poll, pollInterval)
    })

  getZipUrl = (blockId: string): Promise<string> =>
    this.getTaskId(blockId).then(this.pollTask)

  getZip = async (url: string): Promise<AdmZip> => {
    const res = await this.client.get(url, { responseType: "arraybuffer" })
    return new AdmZip(res.data)
  }

  async getFileString(
    blockId: string,
    predicate: (entry: AdmZip.IZipEntry) => boolean
  ): Promise<string> {
    const zip = await this.getZipUrl(blockId).then(this.getZip)
    const entry = zip.getEntries().find(predicate)
    return entry?.getData().toString().trim() || Promise.reject()
  }

  getCsvString = (blockId: string): Promise<string> =>
    this.getFileString(blockId, (e) => e.name.endsWith(".csv"))

  getMdString = (blockId: string): Promise<string> =>
    this.getFileString(blockId, (e) => e.name.endsWith(".md"))
}
