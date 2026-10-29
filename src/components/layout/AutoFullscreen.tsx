"use client";

import { useEffect } from "react";

export function AutoFullscreen() {
  useEffect(() => {
    const enterFullscreen = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    window.addEventListener("click", enterFullscreen, { once: true });
    return () => window.removeEventListener("click", enterFullscreen);
  }, []);

  return null;
}

export default AutoFullscreen;
