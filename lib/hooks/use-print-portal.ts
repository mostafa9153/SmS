"use client";

import { useEffect, useState } from "react";

/**
 * A <div id={id}> on document.body for createPortal print sheets (print CSS isolates it).
 * Returns null until mounted; the node is removed on unmount.
 */
export function usePrintPortal(id: string): HTMLDivElement | null {
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let node = document.getElementById(id) as HTMLDivElement | null;
    if (!node) {
      node = document.createElement("div");
      node.id = id;
      document.body.appendChild(node);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the node only exists after mount
    setEl(node);
    return () => {
      node?.parentNode?.removeChild(node);
      setEl(null);
    };
  }, [id]);

  return el;
}
