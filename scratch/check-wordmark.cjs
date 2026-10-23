const http = require('http');

http.get('http://localhost:3000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = data.match(/<a[^>]*class="[^"]*wordmark[^"]*"[\s\S]*?<\/a>/g);
    console.log('Found wordmarks:', matches ? matches.length : 0);
    if (matches) {
      matches.forEach((m, i) => console.log(`Wordmark ${i+1}:\n`, m, '\n---'));
    }
  });
}).on('error', err => console.error(err));
