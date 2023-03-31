# Notion Exporter 🛫

A simple CLI tool and TypeScript library for exporting Markdown and CSV files
from any [Notion.so](https://notion.so) page. The tool relies on the export
feature of Notion's web-app, hence you get exactly the Markdown and CSV you'd
get from clicking through: _••• > Export > Markdown & CSV, no subpages, OK._

## CLI

The CLI let's you download pages as part of any script, build step or content
pipeline. For example, you can use Notion as a CMS to write your blog, export
the Markdown in a Github action and build a static Hugo page. 🎉

```bash
npm install -g notion-exporter
notion-exporter 3af0a1e347dd40c5ba0a2c91e234b2a5 -t csv > list.csv
```

For more options, try `notion-exporter --help` and read about the
[needed Cookies](#needed-cookies).

## Library

With the library you can do more elaborate things like directly parse and use
your CSV, inject the Markdown in any React/Next.js/Vue page or interact with the
underlying [`AdmZip`](https://github.com/cthackers/adm-zip) object.

```ts
import NotionExporter from "notion-exporter"

const tokenV2 = ...
const fileToken = ...
const blockId = "3af0a1e347dd40c5ba0a2c91e234b2a5"

await new NotionExporter(tokenV2, fileToken).getMdString(blockId)
```

### API

Check the doc comments in [`NotionExporter.ts`](./src/NotionExporter.ts) for the
most accurate information.

#### Constructor

Provide the [required Cookies](#needed-cookies) as authentification to create a
new exporter client.

```ts
const exporter = new NotionExporter(tokenV2: string, fileToken: string)
```

#### Methods

Download and extract the first file of the requested type and return it as
string.

```ts
exporter.getCsvString(blockId: string): Promise<string>
exporter.getMdString(blockId: string): Promise<string>
```

Start an export of the given block and get the exported archive's URL. The
second method also downloads the ZIP and gives full access to the
[`AdmZip`](https://github.com/cthackers/adm-zip) object.

```ts
exporter.getZipUrl(blockId: string): Promise<string>
exporter.getZip(url: string): Promise<AdmZip>
```

## Needed Cookies

To export anything from Notion, one needs to authenticate oneself with some
Cookies (like a browser would). These cookies are called `token_v2` and
`file_token`. They are set on all requests of a logged in user when using the
Notion web-app.

### How to retrieve the Cookies?

- Go to [notion.so](https://notion.so).
- Log in with your account.
- Open the developer tools of your browser, open Application > Storage > Cookies
  (Chrome); Storage tab (Firefox).
- Copy the value of the Cookies called `token_v2` and `file_token` and paste
  them somewhere safe.

### How to get the block ID of a page?

To download a page or table you need its block ID. The block ID is usually the
last part of its URL. For example on
[this page](https://www.notion.so/Notion-Official-83715d7703ee4b8699b5e659a4712dd8)
with URL:

```
https://www.notion.so/Notion-Official-83715d7703ee4b8699b5e659a4712dd8
```

the ID is `83715d7703ee4b8699b5e659a4712dd8`. So you can get the page as
Markdown by doing `notion-exporter 83715d7703ee4b8699b5e659a4712dd8`.

For tables, the ID is the first of the two long hexadecimal strings. Take
[this gallery](https://www.notion.so/228eea9d563a47f09fc594d0a89a2e18?v=d5bcf2644d2940b1b18a9ba9cc11c9b6)
for example with URL:

```
https://www.notion.so/228eea9d563a47f09fc594d0a89a2e18?v=d5bcf2644d2940b1b18a9ba9cc11c9b6
```

the ID is `228eea9d563a47f09fc594d0a89a2e18`. So, you can get the table as CSV
by doing `notion-exporter 228eea9d563a47f09fc594d0a89a2e18 -t csv`.

## Note on Stability

This tool completely relies on the export/download feature of the official _but
internal_ Notion.so API. The advantage is, that we do not generate any markup
ourselves, just download and extract some ZIPs. While the download feature seems
to be pretty stable, keep in mind that it still is an internal API, so it **may
break anytime**.

## Contributing

Want to help improve this tool, spotted a type or you need to add a new
use-case? Please submit issues and PRs on Github.

### Contributors

- Yann Bolliger, [@yannbolliger](https://github.com/yannbolliger).
