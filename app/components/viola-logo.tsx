import React from "react";

interface ViolaLogoProps {
  /** ロゴ全体のサイズ（高さ基準） */
  size?: "sm" | "md" | "lg" | "xl";
  /** モノグラムのみ表示 */
  iconOnly?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { height: 28, iconSize: 22, titleSize: 13, pureSize: 10 },
  md: { height: 36, iconSize: 28, titleSize: 16, pureSize: 12 },
  lg: { height: 48, iconSize: 38, titleSize: 22, pureSize: 15 },
  xl: { height: 64, iconSize: 50, titleSize: 28, pureSize: 19 },
};

/**
 * VIOLA Pure ロゴコンポーネント
 * VP モノグラム（細い直線と曲線の組み合わせ）+ "VIOLA" セリフ体 + "Pure" 小文字
 * 黒文字のみ・背景透過
 */
export default function ViolaLogo({ size = "md", iconOnly = false, className = "" }: ViolaLogoProps) {
  const { height, iconSize, titleSize, pureSize } = sizeMap[size];

  if (iconOnly) {
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="VIOLA Pure logo"
      >
        <VPMonogram />
      </svg>
    );
  }

  const totalWidth = iconOnly ? iconSize : iconSize + 8 + (titleSize * 4.5);

  return (
    <svg
      width={totalWidth}
      height={height}
      viewBox={`0 0 ${totalWidth} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VIOLA Pure"
    >
      {/* VP モノグラム */}
      <g transform={`scale(${iconSize / 40})`}>
        <VPMonogram />
      </g>

      {/* テキスト部分 */}
      <g transform={`translate(${iconSize + 8}, 0)`}>
        {/* VIOLA - セリフ体スタイル */}
        <text
          x="0"
          y={height * 0.58}
          fontSize={titleSize}
          fontFamily="'Georgia', 'Times New Roman', serif"
          fontWeight="600"
          letterSpacing="0.08em"
          fill="#0f0f0f"
        >
          VIOLA
        </text>
        {/* Pure - ソフトなミックスケース */}
        <text
          x="1"
          y={height * 0.58 + pureSize + 2}
          fontSize={pureSize}
          fontFamily="'Georgia', 'Times New Roman', serif"
          fontWeight="400"
          fontStyle="italic"
          letterSpacing="0.12em"
          fill="#333333"
        >
          Pure
        </text>
      </g>
    </svg>
  );
}

/** VP モノグラム：細い直線と曲線で構成された抽象的なモノグラム */
function VPMonogram() {
  return (
    <>
      {/* V の部分 - 細い直線2本で逆V形 */}
      <path
        d="M6 8 L14 28 L18 16"
        stroke="#0f0f0f"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* P の部分 - 縦線と半円カーブ */}
      <path
        d="M18 8 L18 28"
        stroke="#0f0f0f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M18 8 C26 8, 30 12, 30 17 C30 22, 26 25, 18 25"
        stroke="#0f0f0f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* V と P をつなぐ細いアクセントライン */}
      <line
        x1="14"
        y1="28"
        x2="18"
        y2="28"
        stroke="#0f0f0f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* 装飾：下部の薄い水平線 */}
      <line
        x1="6"
        y1="32"
        x2="30"
        y2="32"
        stroke="#0f0f0f"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.4"
      />
    </>
  );
}
