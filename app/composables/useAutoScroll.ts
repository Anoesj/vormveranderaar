export function useAutoScroll (speed = 60, initialValue = false) {
  const autoScrollEnabled = ref(initialValue);

  let scrollAnimationId: number | null = null;

  watch(autoScrollEnabled, (newValue) => {
    if (!import.meta.client) return;

    if (newValue) {
      startAutoScroll(speed);
    }
    else {
      stopAutoScroll();
    }
  }, {
    immediate: true,
  });

  function startAutoScroll(pixelsPerSecond: number) {
    let lastTime: number | null = null;

    function scrollStep (timestamp: number) {
      if (lastTime !== null) {
        const deltaTime = timestamp - lastTime;
        const pixelsToScroll = (pixelsPerSecond * deltaTime) / 1000;
        window.scrollBy(0, Math.ceil(pixelsToScroll));

        // Optionally: Stop scrolling when reaching the bottom of the page
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
          cancelAutoScroll();
          return;
        }
      }

      lastTime = timestamp;
      scrollAnimationId = requestAnimationFrame(scrollStep);
    }

    scrollAnimationId = requestAnimationFrame(scrollStep);

    document.addEventListener('wheel', cancelAutoScroll, { passive: true });
    document.addEventListener('touchstart', cancelAutoScroll, { passive: true });
    document.addEventListener('keydown', cancelAutoScrollIfEsc, { passive: true });
  }

  function stopAutoScroll() {
    if (scrollAnimationId !== null) {
      cancelAnimationFrame(scrollAnimationId);
      scrollAnimationId = null;
    }

    document.removeEventListener('wheel', cancelAutoScroll);
    document.removeEventListener('touchstart', cancelAutoScroll);
    document.removeEventListener('keydown', cancelAutoScrollIfEsc);
  }

  function cancelAutoScroll() {
    autoScrollEnabled.value = false;
  }

  function cancelAutoScrollIfEsc(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      cancelAutoScroll();
    }
  }

  return autoScrollEnabled;
}