---
title: "拖放实现实战 - RxJS 实战案例"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS 实战案例，展示如何使用 fromEvent 和 switchMap 实现拖放功能。
keywords:
  - RxJS
  - 拖放
  - drag-and-drop
  - 实战
---

# 拖放实现实战

使用 RxJS 可以优雅地实现拖放功能。

## 示例

```typescript
import { fromEvent } from 'rxjs';
import { switchMap, takeUntil, map } from 'rxjs/operators';

const draggable = document.getElementById('draggable');

const mouseDown$ = fromEvent(draggable, 'mousedown');
const mouseMove$ = fromEvent(document, 'mousemove');
const mouseUp$ = fromEvent(document, 'mouseup');

const drag$ = mouseDown$.pipe(
  switchMap((startEvent: MouseEvent) => {
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    
    return mouseMove$.pipe(
      map((moveEvent: MouseEvent) => ({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY
      })),
      takeUntil(mouseUp$)
    );
  })
);

drag$.subscribe(({ x, y }) => {
  draggable.style.transform = `translate(${x}px, ${y}px)`;
});
```
