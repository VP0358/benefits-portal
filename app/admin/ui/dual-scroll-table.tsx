"use client";

/**
 * DualScrollTable
 * テーブルの上部・下部の両方にスクロールバーを表示するラッパー。
 * 上部バーは JS で同期するミラーバー。
 */

import { useRef, useEffect, useCallback } from "react";

interface Props {
  children: React.ReactNode;
  /** 外枠に追加する className（角丸・枠線など） */
  className?: string;
}

export default function DualScrollTable({ children, className = "" }: Props) {
  const topBarRef  = useRef<HTMLDivElement>(null);
  const innerRef   = useRef<HTMLDivElement>(null);
  const syncingTop = useRef(false);
  const syncingBot = useRef(false);

  /* 上バー ↔ 本体 を相互同期 */
  const onTopScroll = useCallback(() => {
    if (syncingBot.current) return;
    syncingTop.current = true;
    if (innerRef.current && topBarRef.current)
      innerRef.current.scrollLeft = topBarRef.current.scrollLeft;
    syncingTop.current = false;
  }, []);

  const onBotScroll = useCallback(() => {
    if (syncingTop.current) return;
    syncingBot.current = true;
    if (innerRef.current && topBarRef.current)
      topBarRef.current.scrollLeft = innerRef.current.scrollLeft;
    syncingBot.current = false;
  }, []);

  /* 上バーのダミー幅を本体テーブルの実幅に合わせて更新 */
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const sync = () => {
      if (topBarRef.current) {
        const phantom = topBarRef.current.firstElementChild as HTMLDivElement | null;
        if (phantom) phantom.style.width = inner.scrollWidth + "px";
      }
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={className} style={{ position: "relative" }}>
      {/* ── 上部スクロールバー ── */}
      <div
        ref={topBarRef}
        onScroll={onTopScroll}
        className="table-scroll"
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          height: 14,           /* バーの高さだけ確保 */
          marginBottom: 2,
        }}
      >
        {/* テーブルと同じ幅のダミー要素 */}
        <div style={{ height: 1, minWidth: "max-content" }} />
      </div>

      {/* ── テーブル本体（下部バー付き） ── */}
      <div
        ref={innerRef}
        onScroll={onBotScroll}
        className="table-scroll"
        style={{ overflowX: "auto" }}
      >
        {children}
      </div>
    </div>
  );
}
