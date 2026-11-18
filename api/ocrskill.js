const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const OCRSKILL_ENDPOINT = 'https://api.ocrskill.com/ocr';
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
]);

function send(res, status, contentType, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, 'application/json; charset=utf-8', '{"error":"Method not allowed"}');
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) {
    return send(res, 403, 'application/json; charset=utf-8', '{"error":"Same-origin request required"}');
  }
  try {
    if (new URL(origin).host !== host) {
      return send(res, 403, 'application/json; charset=utf-8', '{"error":"Same-origin request required"}');
    }
  } catch (_) {
    return send(res, 403, 'application/json; charset=utf-8', '{"error":"Invalid request origin"}');
  }

  const apiKey = process.env.OCRSKILL_API_KEY;
  if (!apiKey) {
    return send(res, 503, 'application/json; charset=utf-8', '{"error":"OCRSkill is not configured"}');
  }

  const contentType = (req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    req.resume();
    return send(res, 415, 'application/json; charset=utf-8', '{"error":"Unsupported image type"}');
  }

  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > MAX_IMAGE_BYTES) {
    req.resume();
    return send(res, 413, 'application/json; charset=utf-8', '{"error":"Image exceeds 4 MB"}');
  }

  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES) {
        req.resume();
        return send(res, 413, 'application/json; charset=utf-8', '{"error":"Image exceeds 4 MB"}');
      }
      chunks.push(chunk);
    }
  } catch (_) {
    return send(res, 400, 'application/json; charset=utf-8', '{"error":"Could not read image"}');
  }

  if (!size) {
    return send(res, 400, 'application/json; charset=utf-8', '{"error":"Image is empty"}');
  }

  try {
    const upstream = await fetch(OCRSKILL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': contentType,
      },
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(25000),
    });
    const result = await upstream.text();
    if (!upstream.ok) {
      return send(res, upstream.status, 'application/json; charset=utf-8',
        JSON.stringify({ error: 'OCRSkill request failed', status: upstream.status }));
    }
    return send(res, upstream.status, 'text/plain; charset=utf-8', result);
  } catch (error) {
    const timedOut = error && error.name === 'TimeoutError';
    return send(
      res,
      timedOut ? 504 : 502,
      'application/json; charset=utf-8',
      timedOut ? '{"error":"OCRSkill request timed out"}' : '{"error":"OCRSkill request failed"}'
    );
  }
};
