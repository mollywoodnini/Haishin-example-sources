const { loadSource } = require('./test-utils');

describe('NASA+ Source E2E Tests', () => {
    let source;

    beforeAll(() => {
        source = loadSource('sources/nasa-plus.js');
    });

    test('Metadata should be correct', () => {
        expect(source.id).toBe('nasa-plus');
        expect(source.name).toBe('NASA+');
        expect(source.version).toBeDefined();
        expect(source.nsfw).toBe(false);
    });

    test('getEntryVideos should return video results', async () => {
        // Increase timeout for network request
        const result = await source.getEntryVideos();
        
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);

        // Check first item structure
        const firstItem = result[0];
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
        // First get a video ID from entry videos to ensure it's valid
        const latest = await source.getEntryVideos();
        const video = latest[0];
        
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
        const latest = await source.getEntryVideos();
        const video = latest[0];
        
        // 2. Get details (which fetches the HLS url)
        const details = await source.getVideoDetails(video.id, video.url);
        const episode = details.episodes['nasa-main'][0];
        
        // 3. Get stream sources
        const sources = await source.getEpisodeStreams(episode.id, episode.url);
        
        expect(sources).toBeDefined();
        expect(sources.streams).toBeInstanceOf(Array);
        expect(sources.streams.length).toBeGreaterThan(0);
        
        const stream = sources.streams[0];
        expect(stream.type).toBe('m3u8');
        expect(stream.url).toBe(episode.url); // For NASA+, they should match
    }, 15000);
});
