/**
 * NASA+ Source for Haishin
 * 
 * Provides access to official NASA video content including live streams,
 * documentaries, and mission updates via the NASA+ public API.
 * 
 * @version 1.0.0
 * @author Haishin
 * @license MIT
 */

var source = {
    // ============================================
    // METADATA
    // ============================================
    
    id: "nasa-plus",
    name: "NASA+",
    version: "1.0.0",
    description: "Official streaming service from the National Aeronautics and Space Administration",
    author: "Haishin",
    baseUrl: "https://plus.nasa.gov",
    apiUrl: "https://plus.nasa.gov/wp-json/wp/v2",
    icon: "https://plus.nasa.gov/wp-content/uploads/2023/03/cropped-nasa-png-placeholder.png",
    language: "en",
    nsfw: false,

    // ============================================
    // REQUIRED METHODS
    // ============================================

    /**
     * Search for videos by query.
     * Uses the WordPress REST API search endpoint.
     */
    async search(query, page) {
        // Page is 1-indexed in Haishin, same in WP API
        const limit = 20;
        
        try {
            // Use the search endpoint restricted to video subtype
            const searchUrl = `${this.apiUrl}/search?search=${encodeURIComponent(query)}&subtype=video&per_page=${limit}&page=${page}&_embed`;
            
            const response = await fetch(searchUrl);
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            
            // WP API returns total pages in header
            const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");
            const hasNextPage = page < totalPages;

            const results = data.map(item => {
                // The _embed parameter should bring in featured media, but search endpoint structure 
                // is slightly different. We might need a secondary lookup or use what's available.
                // For search results, we often just get ID and Title.
                // Ideally we'd map this, but let's try to get minimal info first.
                
                let coverUrl = null;
                if (item._embedded && item._embedded['wp:featuredmedia']) {
                    const media = item._embedded['wp:featuredmedia'][0];
                    coverUrl = media.source_url;
                }

                return {
                    id: item.id.toString(),
                    title: this._decodeHtml(item.title),
                    url: item.url,
                    coverUrl: coverUrl // Might be null if not embedded
                };
            });

            return {
                results,
                hasNextPage
            };
        } catch (error) {
            console.error("NASA+ search error:", error);
            // Return empty results on error to prevent app crash
            return { results: [], hasNextPage: false };
        }
    },

    /**
     * Get detailed information about a video.
     * Uses the 'video' post type endpoint.
     */
    async getVideoDetails(videoId, videoUrl) {
        // If we only have URL, we might need to extract ID or query by slug
        // Ideally Haishin passes the ID we returned in search/latest
        
        try {
            const detailsUrl = `${this.apiUrl}/video/${videoId}`;
            const response = await fetch(detailsUrl);
            
            if (!response.ok) {
                throw new Error(`Get video details failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Extract metadata from custom fields (meta)
            // Based on API analysis: meta.video-url contains the master m3u8
            
            const meta = data.meta || {};
            const streamUrl = meta['video-url'];
            const duration = meta.runtime; // in seconds
            const rating = meta.rating;
            
            // Extract description (rendered HTML)
            const synopsis = data.content ? this._stripHtml(data.content.rendered) : "";
            
            // Featured image
            const coverUrl = data.featured_image_url || null;

            return {
                id: data.id.toString(),
                title: this._decodeHtml(data.title.rendered),
                synopsis: synopsis,
                coverUrl: coverUrl,
                rating: null, // NASA doesn't stick to standard numeric ratings
                releaseDate: data.date, // ISO format
                status: "completed",
                genres: ["Space", "Science", "Documentary"],
                
                // We map the HLS stream directly as a server
                servers: {
                    "nasa-main": "NASA+ Master Stream"
                },
                episodes: {
                    "nasa-main": [
                        {
                            id: "main",
                            number: 1,
                            title: "Full Video",
                            url: streamUrl // Pass the direct stream URL to the next step
                        }
                    ]
                }
            };

        } catch (error) {
            console.error("NASA+ details error:", error);
            throw error;
        }
    },

    /**
     * Get streaming URLs.
     * Since we extracted the direct HLS URL in details, we just return it here.
     */
    async getVideoSources(episodeId, episodeUrl) {
        if (!episodeUrl) {
            throw new Error("No stream URL found");
        }

        return {
            streams: [
                {
                    quality: "auto",
                    url: episodeUrl,
                    type: "m3u8"
                }
            ],
            subtitles: [] // NASA usually burns in subs or provides CC in the HLS stream
        };
    },

    // ============================================
    // OPTIONAL METHODS
    // ============================================

    /**
     * Get latest/recently updated videos.
     * Uses the main video endpoint sorted by date.
     */
    async getLatest(page) {
        const limit = 20;
        try {
            const url = `${this.apiUrl}/video?per_page=${limit}&page=${page}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Get latest failed: ${response.status}`);
            }

            const data = await response.json();
            const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");

            const results = data.map(item => ({
                id: item.id.toString(),
                title: this._decodeHtml(item.title.rendered),
                coverUrl: item.featured_image_url || null,
                url: item.link
            }));

            return {
                results,
                hasNextPage: page < totalPages
            };

        } catch (error) {
            console.error("NASA+ latest error:", error);
            return { results: [], hasNextPage: false };
        }
    },

    /**
     * Get popular/trending videos.
     * NASA WP API doesn't have a specific "popular" endpoint, 
     * so we'll fetch a different subset or just latest for now.
     * Alternatively, we could look for a 'popular' category if it exists.
     * For now, we will return the latest videos as a fallback.
     */
    async getPopular(page) {
        // Fallback to latest since 'popular' sort isn't standard in WP API without plugins
        return this.getLatest(page);
    },

    // ============================================
    // HELPER METHODS
    // ============================================

    _decodeHtml(html) {
        if (!html) return "";
        return html
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, "\"")
            .replace(/&#039;/g, "'")
            .replace(/&#8217;/g, "'")
            .replace(/&#8211;/g, "-")
            .replace(/&#8212;/g, "--");
    },

    _stripHtml(html) {
        if (!html) return "";
        return html.replace(/<[^>]*>?/gm, "")
                   .replace(/\n\n/g, "\n")
                   .trim();
    }
};

// Export the source
source;
