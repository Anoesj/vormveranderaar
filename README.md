### Findings
- In `Puzzle`, when turning `*puzzlePiecePlacementOptionsIterator` into an `AsyncGenerator`, it gets about 8% slower.
- In `Puzzle`, when using `setImmediate` in an async version of `*puzzlePiecePlacementOptionsIterator`, it gets about 26% slower than when keeping it sync and leaving out `setImmediate`.
- Using `for` loops instead of `for..of` loops in critical places did not really affect performance at all.
- Memory heap keeps going up after every "possible solution start", we need to find a way to clean up memory.
- `structuredClone` is VERY, VERY SLOW.