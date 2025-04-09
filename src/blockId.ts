
export const validateUuid = (str: string | undefined): string | undefined => {
  if (!str) return undefined;

  // Already has dashes and is UUID-ish
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }

  // Raw 32-character hex? Let's dash it up
  if (/^[0-9a-f]{32}$/i.test(str)) {
    const withDashes = `${str.slice(0,8)}-${str.slice(8,12)}-${str.slice(12,16)}-${str.slice(16,20)}-${str.slice(20)}`;
    return withDashes;
  }

  return undefined;
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
