import { useState, ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type ChamferProps = {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  glow?: string;
  glowRadius?: number;
  chamfer?: [number, number, number, number]; // [tl, tr, br, bl]
  style?: ViewStyle;
  children?: ReactNode;
};

function buildChamferPath(w: number, h: number, [tl, tr, br, bl]: [number, number, number, number]) {
  const parts: string[] = [`M ${tl} 0`];
  parts.push(`L ${w - tr} 0`);
  if (tr) parts.push(`L ${w} ${tr}`);
  parts.push(`L ${w} ${h - br}`);
  if (br) parts.push(`L ${w - br} ${h}`);
  parts.push(`L ${bl} ${h}`);
  if (bl) parts.push(`L 0 ${h - bl}`);
  parts.push(`L 0 ${tl}`, 'Z');
  return parts.join(' ');
}

// Arcade button shape — renders a chamfered SVG background behind children.
// Default chamfer [0, 8, 0, 8] = TR + BL cuts, matching arcAClipBtn from the design bundle.
export function Chamfer({
  fill, stroke, strokeWidth = 1.5,
  glow, glowRadius = 16,
  chamfer = [0, 8, 0, 8],
  style, children,
}: ChamferProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.w !== width || size.h !== height) {
      setSize({ w: width, h: height });
    }
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        glow ? {
          shadowColor: glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: glowRadius,
          elevation: 6,
        } : undefined,
        style,
      ]}
    >
      {size && (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFillObject}
          // @ts-ignore — pointerEvents on Svg is valid in react-native-svg but type definitions vary
          pointerEvents="none"
        >
          <Path
            d={buildChamferPath(size.w, size.h, chamfer)}
            fill={fill}
            stroke={stroke ?? 'none'}
            strokeWidth={stroke ? strokeWidth : 0}
          />
        </Svg>
      )}
      {children}
    </View>
  );
}

// Multi-color Google "G" mark using the four canonical brand colors.
export function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M44.5 20H24v8.5h11.7C34.7 33.4 30 36.5 24 36.5c-7 0-12.5-5.6-12.5-12.5S17 11.5 24 11.5c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z"
      />
      <Path
        fill="#34A853"
        d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <Path
        fill="#FBBC05"
        d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.4c-2 1.4-4.6 2.3-7.6 2.3-5.9 0-10.9-3.9-12.7-9.3l-7 5.4C7.7 39.1 15.2 44 24 44z"
      />
      <Path
        fill="#EA4335"
        d="M44.5 20H24v8.5h11.7c-1 2.7-2.7 4.9-5 6.5l6.5 5.4c4.4-4 7.3-10 7.3-16.4 0-1.3-.2-2.7-.5-4z"
      />
    </Svg>
  );
}
