"use client";

import { useEffect } from "react";

// Mantém a landing page em /: clicar num link para a própria página rola até a seção sem pôr #id na URL
export function SamePageLinks() {
  useEffect(() => {
    // Quem chega com #id na URL vai direto à seção, e a URL volta a ser /
    if (window.location.hash) {
      findHashTarget(window.location.hash)?.scrollIntoView({ behavior: "instant" });
      history.replaceState(history.state, "", window.location.pathname + window.location.search);
    }

    function scrollToLinkTarget(event: MouseEvent) {
      const isPlainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      if (event.defaultPrevented || !isPlainClick) return;
      const link = (event.target as Element).closest("a");
      if (!link || link.target) return;

      const url = new URL(link.href);
      const isSamePage = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
      if (!isSamePage) return;

      event.preventDefault();
      // O comportamento suave e o desconto do cabeçalho vêm do CSS (scroll-behavior e scroll-padding-top)
      const target = findHashTarget(url.hash);
      if (target) target.scrollIntoView();
      else window.scrollTo({ top: 0 });
    }

    document.addEventListener("click", scrollToLinkTarget);
    return () => document.removeEventListener("click", scrollToLinkTarget);
  }, []);

  return null;
}

function findHashTarget(hash: string) {
  if (!hash) return undefined;
  return document.getElementById(decodeURIComponent(hash.slice(1))) ?? undefined;
}
