/**
 * Generator function to stream responses from fetch calls.
 *
 * @param fetchCall - The fetch call to make. Should return a response with a readable body stream.
 * @returns An async generator that yields strings from the response stream.
 */
export async function* streamingFetch (fetchCall: () => ReturnType<typeof fetch>): AsyncGenerator<string> {
  const response = await fetchCall();

  // Attach Reader
  const reader = response.body!.getReader();

  const textDecoder = new TextDecoder();

  while (true) {
    // Wait for next encoded chunk
    const { done, value } = await reader.read();

    // Check if stream is done
    if (done) {
      break;
    }

    // Decodes data chunk and yields it
    yield textDecoder.decode(value);
  }
}
