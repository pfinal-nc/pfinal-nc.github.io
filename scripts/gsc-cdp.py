import asyncio
import json
import base64
import websockets

CDP_WS = "ws://127.0.0.1:9223/devtools/browser/f1207289-6d80-4f78-b26e-93d9f5f8926a"
OUT = "/Users/pfinal/Documents/pfinal-vue-blog/.workbuddy"

async def main():
    print("[1] Connecting to CDP WebSocket...")
    async with websockets.connect(CDP_WS, max_size=10*1024*1024) as ws:
        print("[2] Connected!")
        
        counter = [1]
        def make_msg(method, params=None, session_id=None):
            msg = {"id": counter[0], "method": method, "params": params or {}}
            if session_id:
                msg["sessionId"] = session_id
            counter[0] += 1
            return msg
        
        async def recv_result(msg_id):
            while True:
                raw = await ws.recv()
                resp = json.loads(raw)
                if resp.get("id") == msg_id:
                    if "error" in resp:
                        raise Exception(f"CDP error: {resp['error']}")
                    return resp.get("result", {})
                # Store events silently
        
        async def cmd(method, params=None, session_id=None):
            msg = make_msg(method, params, session_id)
            await ws.send(json.dumps(msg))
            return await recv_result(msg["id"])
        
        # Create new page
        print("[3] Creating new page...")
        new_target = await cmd("Target.createTarget", {"url": "about:blank"})
        target_id = new_target["targetId"]
        print(f"    Target ID: {target_id}")
        
        # Attach (flattened)
        print("[4] Attaching to target (flattened)...")
        attach = await cmd("Target.attachToTarget", {"targetId": target_id, "flatten": True})
        session_id = attach["sessionId"]
        print(f"    Session ID: {session_id}")
        
        # Page commands use session_id
        print("[5] Enabling Page domain...")
        await cmd("Page.enable", {}, session_id)
        
        # Navigate to GSC
        print("[6] Navigating to GSC overview...")
        await cmd("Page.navigate", {"url": "https://search.google.com/search-console?resource_id=sc-domain%3Afriday-go.icu"}, session_id)
        
        print("[7] Waiting for page load (10s)...")
        await asyncio.sleep(10)
        
        # Check URL
        url_result = await cmd("Runtime.evaluate", {"expression": "document.location.href"}, session_id)
        current_url = url_result.get("result", {}).get("value", "unknown")
        print(f"    Current URL: {current_url}")
        
        # Take screenshot
        print("[8] Taking overview screenshot...")
        ss = await cmd("Page.captureScreenshot", {"format": "png", "fullPage": True}, session_id)
        with open(f"{OUT}/gsc-overview-2026-07-24.png", "wb") as f:
            f.write(base64.b64decode(ss["data"]))
        print("    ✅ Saved!")
        
        # Extract page text
        print("[9] Extracting page text...")
        text_r = await cmd("Runtime.evaluate", {"expression": "document.body.innerText"}, session_id)
        page_text = text_r.get("result", {}).get("value", "")
        with open(f"{OUT}/gsc-overview-text-2026-07-24.txt", "w") as f:
            f.write(page_text)
        print(f"    ✅ {len(page_text)} chars saved")
        
        # Check if we got GSC data or login page
        if "Google" in page_text[:200] and "Sign in" in page_text[:500]:
            print("\n⚠️  LOGIN REQUIRED - fresh Chrome instance doesn't have Google login session")
            print("    This browser instance was created with a separate profile.")
            print("    The user's logged-in Chrome is PID 27630 (9222) but the port isn't responding.")
            print("    To fix: close Chrome and restart with:")
            print("    --remote-debugging-port=9222 --user-data-dir=~/chrome-debug-profile")
            return
        
        # Navigate to Performance page
        print("\n[10] Navigating to Performance report...")
        await cmd("Page.navigate", {"url": "https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Afriday-go.icu"}, session_id)
        await asyncio.sleep(10)
        
        ss2 = await cmd("Page.captureScreenshot", {"format": "png", "fullPage": True}, session_id)
        with open(f"{OUT}/gsc-performance-2026-07-24.png", "wb") as f:
            f.write(base64.b64decode(ss2["data"]))
        print("    ✅ Performance screenshot saved!")
        
        text2 = await cmd("Runtime.evaluate", {"expression": "document.body.innerText"}, session_id)
        perf_text = text2.get("result", {}).get("value", "")
        with open(f"{OUT}/gsc-performance-text-2026-07-24.txt", "w") as f:
            f.write(perf_text)
        print(f"    ✅ {len(perf_text)} chars saved")
        
        # Navigate to Index coverage
        print("\n[11] Navigating to Index coverage...")
        await cmd("Page.navigate", {"url": "https://search.google.com/search-console/index?resource_id=sc-domain%3Afriday-go.icu"}, session_id)
        await asyncio.sleep(10)
        
        ss3 = await cmd("Page.captureScreenshot", {"format": "png", "fullPage": True}, session_id)
        with open(f"{OUT}/gsc-index-2026-07-24.png", "wb") as f:
            f.write(base64.b64decode(ss3["data"]))
        print("    ✅ Index screenshot saved!")
        
        text3 = await cmd("Runtime.evaluate", {"expression": "document.body.innerText"}, session_id)
        index_text = text3.get("result", {}).get("value", "")
        with open(f"{OUT}/gsc-index-text-2026-07-24.txt", "w") as f:
            f.write(index_text)
        print(f"    ✅ {len(index_text)} chars saved")
        
        print("\n✅ All screenshots and text extracted!")

asyncio.run(main())
