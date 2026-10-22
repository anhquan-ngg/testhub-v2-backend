// Local transport fixture derived from document-extraction.v1. Not a parser.
// Only synthetic marker bytes are sent here. No real document/provider data.
const http = require('node:http');
const crypto = require('node:crypto');
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'POST' || url.pathname !== '/documents/extract') {
    res.writeHead(501); res.end(); return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const marker = bytes.toString('utf8');
  if (marker.includes('busy')) { res.writeHead(503); res.end(); return; }
  if (marker.includes('html')) { res.writeHead(500, { 'Content-Type': 'text/html' }); res.end('<h1>proxy failure</h1>'); return; }
  if (marker.includes('invalid')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{'); return; }
  if (marker.includes('slow')) await new Promise((resolve) => setTimeout(resolve, 1000));
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ contract_version: 'document-extraction.v1', source_type: url.searchParams.get('source_type'),
    source_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    parser_version: 'pdf/fixture;text/v1',
    include_notes: url.searchParams.get('include_notes') === 'true', status: 'EXTRACTED',
    unit_count: 1, spans: [{ kind: 'PAGE', position: 1, text: 'Stack uses LIFO.' }], warnings: [] }));
}).listen(process.env.PORT || 4961);
