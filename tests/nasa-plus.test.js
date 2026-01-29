const fs = require('fs');
const path = require('path');

// Helper to load a source file by evaluating it in a sandbox
function loadSource(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    // Minimal mock environment for the source
    const sandbox = {
        source: null,
        console: console,
        fetch: global.fetch,
        // Mock specific browser/Haishin globals if needed
    };
    
    // We append "; source;" to ensure the evaluated code returns the source object
    // Most sources end with "source;" but this is safer
    try {
        // Use a function constructor to create a scope, but we need to assign to the sandbox
        // Since `eval` is tricky with scope, we'll just use a simple Function wrap
        // However, the source files define `var source = ...` which is function-scoped.
        // So we can return it.
        const factory = new Function('console', 'fetch', code + '\nreturn source;');
        return factory(console, global.fetch);
    } catch (e) {
        throw new Error(`Failed to load source ${filePath}: ${e.message}`);
    }
}

describe('NASA+ Source E2E Tests', () => {
    let source;

    beforeAll(() => {
        const sourcePath = path.join(__dirname, '../sources/nasa-plus.js');
        source = loadSource(sourcePath);
    });

    test('Metadata should be correct', () => {
        expect(source.id).toBe('nasa-plus');
        expect(source.name).toBe('NASA+');
        expect(source.version).toBeDefined();
        expect(source.nsfw).toBe(false);
    });

    test('getLatest should return video results', async () => {
        // Increase timeout for network request
        const result = await source.getLatest(1);
        
        expect(result).toBeDefined();
        expect(result.results).toBeInstanceOf(Array);
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.hasNextPage).toBeDefined();

        // Check first item structure
        const firstItem = result.results[0];
        expect(firstItem.id).toBeDefined();
        expect(firstItem.title).toBeDefined();
        expect(firstItem.url).toBeDefined();
        // coverUrl might be null, so we just check it exists as a property
        expect(firstItem).toHaveProperty('coverUrl');
    }, 10000);

    test('search should return relevant results', async () => {
        const query = 'Mars';
        const result = await source.search(query, 1);
        
        expect(result).toBeDefined();
        expect(result.results).toBeInstanceOf(Array);
        expect(result.results.length).toBeGreaterThan(0);

        // Verify that at least one result contains the query (case-insensitive)
        // Note: Search engines can be fuzzy, so this isn't strict, but NASA's search is decent.
        const hasMatch = result.results.some(item => 
            item.title.toLowerCase().includes(query.toLowerCase())
        );
        expect(hasMatch).toBe(true);
    }, 10000);

    test('getVideoDetails should return full details and stream info', async () => {
        // First get a video ID from latest to ensure it's valid
        const latest = await source.getLatest(1);
        const video = latest.results[0];
        
        const details = await source.getVideoDetails(video.id, video.url);
        
        expect(details).toBeDefined();
        expect(details.id).toBe(video.id);
        expect(details.title).toBeDefined();
        expect(details.synopsis).toBeDefined();
        
        expect(details.episodes).toBeDefined();
        // Check "nasa-main" server exists
        expect(details.episodes['nasa-main']).toBeDefined();
        expect(details.episodes['nasa-main'].length).toBeGreaterThan(0);
        
        const episode = details.episodes['nasa-main'][0];
        expect(episode.url).toBeDefined();
        expect(episode.url).toMatch(/^https?:\/\/.+/); // Valid URL
    }, 15000);

    test('getVideoSources should return playable stream', async () => {
        // 1. Get a video
        const latest = await source.getLatest(1);
        const video = latest.results[0];
        
        // 2. Get details (which fetches the HLS url)
        const details = await source.getVideoDetails(video.id, video.url);
        const episode = details.episodes['nasa-main'][0];
        
        // 3. Get stream sources
        const sources = await source.getVideoSources(episode.id, episode.url);
        
        expect(sources).toBeDefined();
        expect(sources.streams).toBeInstanceOf(Array);
        expect(sources.streams.length).toBeGreaterThan(0);
        
        const stream = sources.streams[0];
        expect(stream.type).toBe('m3u8');
        expect(stream.url).toBe(episode.url); // For NASA+, they should match
    }, 15000);
});
