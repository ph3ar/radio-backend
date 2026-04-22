## 2024-05-19 - requestAnimationFrame Bottlenecks in React
**Learning:** When using `requestAnimationFrame` inside a React `useEffect`, derived state (like array mapping/filtering/slicing) inside the draw loop can cause significant GC pressure and CPU overhead at 60fps.
**Action:** Always compute derived state outside the `requestAnimationFrame` loop, but inside the `useEffect` scope so it still updates when dependencies change.
