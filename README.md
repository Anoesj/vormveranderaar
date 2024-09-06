## Getting started
- Use `bun`, because brute forcing puzzles takes time and `bun` is just a lot faster than `node`.
- `bun i`
- `bun --bun run dev` to start Nuxt. The `--bun` flag will force Nuxt to use `bun` instead of `node`.

## Technical info
### Solving the puzzle
Todo

### Findings
- In `Puzzle`, when turning `*puzzlePiecePlacementOptionsIterator` into an `AsyncGenerator`, it gets about 8% slower.
- In `Puzzle`, when using `setImmediate` in an async version of `*puzzlePiecePlacementOptionsIterator`, it gets about 26% slower than when keeping it sync and leaving out `setImmediate`.
- `structuredClone` is VERY, VERY SLOW in most cases.
- Using classic `for` loops with cached array sizes instead of `for..of` loops in critical places affected performance a lot, sometimes 7x speed improvements. Prevent `.reduce`, `.flat`, `.map`, etc. in critical places.
- Using `arr1.concat(arr2)` is a bit faster than `[...arr1, ...arr2]`.
- Using `const item1 = arr[0]; const rest = arr.slice(1);` is a bit faster than `const [item1, ...rest] = arr;`.
- Memory heap kept going up after every "possible solution start", because we saved every unique situation we encountered, so we can skip iterations where we run into the same situation with the same unused puzzle pieces. It doesn't matter how small we could serialize this situation + unused puzzle pieces, it would always cause memory issues at this scale.
- Using `bun` instead of `node` is 3-4x faster.
- Promises make everything slower.
- Calculating the possible solution starts based on getting the corners right only is a lot slower than just brute forcing the puzzle. Can be 3x faster without it and in some cases, where there are a lot of solutions for the corners only, 10+ times speed improvements. Focus on the brute force!
- Sorting the unused puzzle pieces from large to small seems to make quite a difference (untested). With size I mean the number of influenced cells by the puzzle piece.
- Don't create new functions, always reuse them.
- Early returns for the win. Stop executing code as soon as possible in the brute force iterator.
- What made the most difference is counting how many cells the following puzzle pieces can influence at max and checking if the number of incorrect cells is more than that. This way, we can skip a lot of unnecessary iterations.
- Nested generators are awesome but complicated. I want to try using regular function recursion and see if there's any perf gains there.