import { validate } from "uuid"

export const validateUuid = (str: string | undefined): string | undefined => {
  if (!str) return undefined
  if (validate(str)) return str
  const withDashes = str.replace(
    /(.{8})(.{4})(.{4})(.{4})(.+)/,
    "$1-$2-$3-$4-$5"
  )
  return validate(withDashes) ? withDashes : undefined
}

export const blockIdFromUrl = (url: string): string | undefined => {
  // We tolerate already valid blockIds and just return them
  if (validateUuid(url)) return url

  const parsedUrl = new URL(url)
  if (
    !parsedUrl.hostname.endsWith("notion.site") &&
    !parsedUrl.hostname.endsWith("notion.so")
  ) {
    return undefined
  }
  const parts = parsedUrl.pathname.slice(1).split("-")
  return parts[parts.length - 1]
}
