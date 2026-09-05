function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Next.js `output: "export"` with the default trailingSlash:false emits
    // <route>.html, never <route>/index.html. Only the site root is
    // index.html.
    if (uri === '/') {
        request.uri = '/index.html';
        return request;
    }
    if (uri.endsWith('/')) {
        request.uri = uri.slice(0, -1) + '.html';
        return request;
    }

    // Match a KNOWN static extension rather than "the last segment contains
    // a dot". The dot heuristic is wrong for this site and shipped broken:
    // every version landing page (/github/1.2.3, /aws/2.2.1) has a dot in
    // its own last segment, so it was left unrewritten, missed
    // github/1.2.3.html in the bucket, and 404'd. Only the trailing-slash
    // form worked. Extension list derived from what the real deployed
    // bucket actually contains (.txt .html .json .js .css .svg .png), plus
    // the font and image types a future asset could reasonably add.
    var STATIC_EXT = /\.(html|txt|json|js|mjs|css|map|svg|png|jpe?g|gif|ico|webp|avif|woff2?|ttf|eot|xml|webmanifest)$/i;
    if (!STATIC_EXT.test(uri)) {
        request.uri = uri + '.html';
    }
    return request;
}
