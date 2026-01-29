# Example Haishin Source Repository

This is an example repository structure that demonstrates how to host multiple sources for the Haishin app.

## Directory Structure

```
example-repository/
├── manifest.json          ← Repository manifest (users add this URL)
├── README.md              ← This file
└── sources/
    ├── archiveorg-cartoons.js
    └── example-source.js
```

## How to Host

### Option 1: GitHub Pages (Recommended)

1. Create a new GitHub repository (e.g., `my-haishin-sources`)
2. Copy this `example-repository` folder contents to your repo
3. Enable GitHub Pages in Settings → Pages → Source: "Deploy from a branch" → Branch: `main`
4. Your repository URL will be: `https://yourusername.github.io/my-haishin-sources/manifest.json`

### Option 2: Any Static File Host

Upload the files to any web server that serves static files (Netlify, Vercel, your own server, etc.)

## Adding to Haishin

1. Open Haishin app
2. Go to Sources tab
3. Tap the menu (···) button
4. Select "Add Repository"
5. Enter your manifest URL: `https://yourusername.github.io/my-haishin-sources/manifest.json`
6. Browse available sources and install the ones you want

## Creating Your Own Source

Use `sources/example-source.js` as a template. Each source must implement:

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (must match filename) |
| `name` | string | Display name |
| `version` | string | Semver version (e.g., "1.0.0") |
| `baseUrl` | string | Website base URL |
| `language` | string | Language code (e.g., "en") |
| `nsfw` | boolean | Whether source has adult content |

### Required Methods

| Method | Description |
|--------|-------------|
| `search(query, page)` | Search for videos |
| `getVideoDetails(url)` | Get video info and episodes |
| `getVideoSources(episodeId, url)` | Get streaming URLs |

### Optional Methods

| Method | Description |
|--------|-------------|
| `getPopular(page)` | Get popular/trending videos |
| `getLatest(page)` | Get recently updated videos |

## Updating the Manifest

When you add or update a source:

1. Update the source's `version` in the JS file
2. Update the corresponding entry in `manifest.json`
3. Commit and push

Users will see the updated sources next time they refresh the repository.

## manifest.json Format

```json
{
  "name": "Repository Display Name",
  "sources": [
    {
      "id": "source-id",
      "name": "Source Name",
      "version": "1.0.0",
      "language": "en",
      "baseURL": "https://example.com",
      "iconURL": "https://example.com/icon.png",
      "isNSFW": false,
      "description": "Description of the source"
    }
  ]
}
```

**Important:** The `id` in manifest.json must match:
1. The `id` property inside the JS file
2. The filename (without `.js` extension)

For example, if `id` is `"my-source"`, the file must be `sources/my-source.js`
