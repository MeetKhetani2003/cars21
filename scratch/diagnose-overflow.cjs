const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

async function testViewport(width, height) {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9333;
  const tmpDir = path.join(os.tmpdir(), 'chrome-diag-' + Date.now());

  const proc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    `--user-data-dir=${tmpDir}`,
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 3500));

  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`);
    const list = await res.json();
    const page = list.find(x => x.type === 'page');
    if (!page) {
      console.log('No page target found');
      return;
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    let id = 1;
    const send = (method, params = {}) => new Promise(resolve => {
      const msgId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    // Emulate iPhone / mobile screen
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 600));

    // Evaluate in page
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const docWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;

          const overflowing = [];
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > docWidth + 1 || el.scrollWidth > docWidth + 1) {
              overflowing.push({
                tag: el.tagName.toLowerCase(),
                className: typeof el.className === 'string' ? el.className : '',
                id: el.id,
                rectRight: Math.round(rect.right),
                rectWidth: Math.round(rect.width),
                scrollWidth: el.scrollWidth,
                text: (el.innerText || '').slice(0, 40).replace(/\\n/g, ' ')
              });
            }
          }
          return {
            docWidth,
            scrollWidth,
            bodyScrollWidth,
            overflowCount: overflowing.length,
            overflowing: overflowing.slice(0, 20)
          };
        })()
      `,
      returnByValue: true
    });

    if (!evalRes || !evalRes.result) {
      console.log('Eval response was:', JSON.stringify(evalRes));
      return;
    }
    const val = evalRes.result.value;
    console.log(`=== VIEWPORT ${width}x${height} ===`);
    console.log('Document ClientWidth:', val.docWidth);
    console.log('Document ScrollWidth:', val.scrollWidth);
    console.log('Body ScrollWidth:', val.bodyScrollWidth);
    console.log('Overflowing elements count:', val.overflowCount);
    console.log('Top overflowing elements:');
    val.overflowing.forEach((item, idx) => {
      console.log(`${idx + 1}. <${item.tag}> class="${item.className}" rectRight=${item.rectRight} width=${item.rectWidth} scrollWidth=${item.scrollWidth} text="${item.text}"`);
    });

    ws.close();
  } catch (err) {
    console.error('Error diagnosing:', err);
  } finally {
    proc.kill();
  }
}

testViewport(375, 812);
