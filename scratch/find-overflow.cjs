const { execSync } = require('child_process');
const http = require('http');

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9222;
  
  // Start headless Chrome with remote debugging
  const proc = require('child_process').spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--window-size=375,812',
    '--user-data-dir=' + require('os').tmpdir() + '\\chrome-test-profile',
    'http://localhost:3000'
  ]);

  // Give Chrome 2 seconds to start and load
  await new Promise(r => setTimeout(r, 2500));

  try {
    // Get list of targets
    const targetsRes = await fetch(`http://127.0.0.1:${port}/json`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
      console.log('No page target found');
      proc.kill();
      return;
    }

    const wsUrl = pageTarget.webSocketDebuggerUrl;
    // We can use a simple node WebSocket to inspect the page
    const WebSocket = require('ws') || null;
  } catch (err) {
    console.error(err);
  } finally {
    proc.kill();
  }
}

run();
