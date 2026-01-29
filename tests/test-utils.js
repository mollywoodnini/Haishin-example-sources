const fs = require('fs');
const path = require('path');

/**
 * Helper to load a source file by evaluating it in a sandbox
 * @param {string} relativePath - Path relative to the project root (e.g., 'sources/mysource.js')
 */
function loadSource(relativePath) {
    // Resolve full path assuming CWD is project root
    const filePath = path.resolve(process.cwd(), relativePath);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Source file not found: ${filePath}`);
    }

    const code = fs.readFileSync(filePath, 'utf8');
    
    // Minimal mock environment for the source
    // Most sources depend on 'source' variable being defined and returned
    try {
        // We wrap it in a function that takes 'console' and 'fetch' to inject them
        // We append "; return source;" to ensure we get the object back
        const factory = new Function('console', 'fetch', code + '\nreturn source;');
        return factory(console, global.fetch);
    } catch (e) {
        throw new Error(`Failed to load source ${filePath}: ${e.message}`);
    }
}

module.exports = { loadSource };
