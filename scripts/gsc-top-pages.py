import asyncio
import json
import base64
import websockets

CDP_WS = "ws://127.0.0.1:9223/devtools/page/B5113AF37AE75052DD65803402D6C85E"
OUT = "/Users/pfinal/Documents/pfinal-vue-blog/.workbuddy"

async def main():
    async with websockets.connect(CDP_WS, max_size=10*1024*1024) as ws:
        counter = [1]
        def make_msg(method, params=None):
            msg = {"id": counter[0], "method": method, "params": params or {}}
            counter[0] += 1
            return msg
        
        async def recv_result(msg_id):
            while True:
                raw = await ws.recv()
                resp = json.loads(raw)
                if resp.get("id") == msg_id:
                    if "error" in resp: raise Exception(f"CDP error: {resp['error']}")
                    return resp.get("result", {})
        
        async def cmd(method, params=None):
            msg = make_msg(method, params)
            await ws.send(json.dumps(msg))
            return await recv_result(msg["id"])
        
        print("[1] Directly connecting to GSC page...")
        await cmd("Page.enable")
        
        # Navigate to Performance page with 28d filter + PAGE dimension
        print("[2] Navigating to Performance with 28d + PAGE dimension...")
        await cmd("Page.navigate", {
            "url": "https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Afriday-go.icu"
        })
        await asyncio.sleep(8)
        
        # Check current URL
        url_r = await cmd("Runtime.evaluate", {"expression": "document.location.href"})
        print(f"    URL: {url_r.get('result',{}).get('value','')}")
        
        # Click "28 天" filter button
        print("[3] Setting 28-day filter...")
        await cmd("Runtime.evaluate", {
            "expression": """
            (function() {
                const all = document.querySelectorAll('*');
                for (const el of all) {
                    if (el.textContent.trim() === '28 天' && 
                        (el.tagName === 'BUTTON' || el.tagName === 'MAT-BUTTON-TOGGLE' || 
                         el.closest('mat-button-toggle-group') || el.getAttribute('role') === 'radio')) {
                        const clickable = el.closest('mat-button-toggle, [role="radio"], button, label');
                        if (clickable) clickable.click();
                        else el.click();
                        return 'clicked 28d button';
                    }
                }
                return '28d button not found';
            })()
            """
        })
        await asyncio.sleep(3)
        
        # Click "网页" tab (the 2nd tab for PAGE dimension)
        print("[4] Clicking 网页 (PAGE) tab...")
        result = await cmd("Runtime.evaluate", {
            "expression": """
            (function() {
                // Find the tab bar - GSC uses specific structure
                // Try to find all tabs in the dimension selector
                const tabs = [];
                const all = document.querySelectorAll('*');
                for (const el of all) {
                    const text = el.textContent.trim();
                    if (text === '网页' && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
                        // Check if this is in the dimension tab bar (near 查询数, 国家/地区 etc)
                        const parent = el.parentElement;
                        const siblings = parent ? Array.from(parent.children) : [];
                        const hasQueryTab = siblings.some(s => s.textContent.includes('查询数'));
                        if (hasQueryTab || parent?.textContent?.includes('查询数')) {
                            // Click the element
                            const btn = el.closest('button, [role="tab"], mat-button-toggle, .mat-button-toggle, label');
                            if (btn) btn.click();
                            else el.click();
                            return 'clicked PAGE tab';
                        }
                    }
                }
                return 'PAGE tab not found in dimension bar';
            })()
            """
        })
        print(f"    Result: {result.get('result',{}).get('value','')}")
        await asyncio.sleep(8)
        
        # Take screenshot
        ss = await cmd("Page.captureScreenshot", {"format": "png", "fullPage": True})
        with open(f"{OUT}/gsc-pages-2026-07-24.png", "wb") as f:
            f.write(base64.b64decode(ss["data"]))
        print("[5] Screenshot saved!")
        
        # Extract text
        text_r = await cmd("Runtime.evaluate", {"expression": "document.body.innerText"})
        page_text = text_r.get("result", {}).get("value", "")
        with open(f"{OUT}/gsc-pages-text-2026-07-24.txt", "w") as f:
            f.write(page_text)
        print(f"[6] Text saved ({len(page_text)} chars)")
        
        print("\n[7] Full text:")
        print(page_text)

asyncio.run(main())
