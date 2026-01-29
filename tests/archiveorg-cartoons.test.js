const { loadSource } = require('./test-utils');

describe('Archive.org Cartoons Source E2E Tests', () => {
    let source;

    beforeAll(() => {
        source = loadSource('sources/archiveorg-cartoons.js');
    });

    test('Metadata should be correct', () => {
        expect(source.id).toBe('archiveorg-cartoons');
        expect(source.name).toBe('Classic Cartoons');
        expect(source.version).toBeDefined();
        expect(source.nsfw).toBe(false);
        expect(source.collection).toBe('classic_cartoons');
    });

    test('getFeatured should return popular series', async () => {
        const result = await source.getFeatured();
        
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
        
        // Verify structure of first item
        const firstItem = result[0];
        expect(firstItem.id).toBeDefined();
        expect(firstItem.title).toBeDefined();
        // Check for common cartoon properties
        expect(firstItem.url).toMatch(/^series:/);
        expect(firstItem.coverUrl).toBeDefined();
    }, 15000);

    test('search should return relevant results', async () => {
        const query = 'Popeye';
        const result = await source.search(query, 1);
        
        expect(result).toBeDefined();
        expect(result.results).toBeInstanceOf(Array);
        expect(result.results.length).toBeGreaterThan(0);

        // Verify that we found something Popeye related
        // The source groups by series, so we look for a series title
        const hasMatch = result.results.some(item => 
            item.title.toLowerCase().includes(query.toLowerCase())
        );
        expect(hasMatch).toBe(true);
    }, 15000);

    test('getVideoDetails should return series episodes', async () => {
        // Search for a reliable series first
        const searchResult = await source.search('Popeye', 1);
        const series = searchResult.results[0];
        
        expect(series).toBeDefined();
        
        const details = await source.getVideoDetails(series.id, series.url);
        
        expect(details).toBeDefined();
        expect(details.title).toBe(series.title);
        expect(details.episodes).toBeDefined();
        expect(details.episodes['Archive.org']).toBeInstanceOf(Array);
        expect(details.episodes['Archive.org'].length).toBeGreaterThan(0);
        
        const episode = details.episodes['Archive.org'][0];
        expect(episode.id).toBeDefined();
        expect(episode.title).toBeDefined();
        expect(episode.url).toBeDefined();
    }, 20000);

    test('getEpisodeStreams should return playable streams', async () => {
        // 1. Get a series
        const searchResult = await source.search('Popeye', 1);
        const series = searchResult.results[0];
        
        // 2. Get first episode
        const details = await source.getVideoDetails(series.id, series.url);
        const episode = details.episodes['Archive.org'][0];
        
        // 3. Get streams
        // Note: The source method is named 'getEpisodeStreams', unlike NASA+ which used 'getVideoSources'
        // We should check which one is defined or if it uses the standard interface
        const streams = await source.getEpisodeStreams(episode.id, episode.url);
        
        expect(streams).toBeDefined();
        expect(streams.streams).toBeInstanceOf(Array);
        expect(streams.streams.length).toBeGreaterThan(0);
        
        const stream = streams.streams[0];
        expect(stream.url).toMatch(/^https:\/\/archive\.org\/download\//);
        expect(stream.quality).toBeDefined();
    }, 20000);
});
