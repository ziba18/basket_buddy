import { useMemo } from 'react';
import { View } from 'react-native';
// The core encoder only — the package's main entry pulls in Node/canvas
// renderers we don't need.
import { create } from 'qrcode/lib/core/qrcode';

interface QrCodeProps {
  value: string;
  size: number;
  color?: string;
  backgroundColor?: string;
}

// Drawn with plain Views (one per horizontal run of dark modules) instead of
// react-native-svg + react-native-qrcode-svg: this is the app's only vector
// graphic, and those two packages added a native module plus a CSS parser
// (css-tree/mdn-data, ~700 KB of JS) to the app for one small square.
export function QrCode({ value, size, color = '#000000', backgroundColor = '#ffffff' }: QrCodeProps) {
  const { count, runs } = useMemo(() => {
    const modules = create(value, { errorCorrectionLevel: 'M' }).modules;
    const found: { row: number; start: number; length: number }[] = [];
    for (let row = 0; row < modules.size; row++) {
      let start = -1;
      for (let col = 0; col <= modules.size; col++) {
        const dark = col < modules.size && modules.get(row, col);
        if (dark && start < 0) start = col;
        if (!dark && start >= 0) {
          found.push({ row, start, length: col - start });
          start = -1;
        }
      }
    }
    return { count: modules.size, runs: found };
  }, [value]);

  // Whole-pixel modules so neighbouring runs never leave hairline seams.
  const cell = Math.max(1, Math.floor(size / count));
  const side = cell * count;

  return (
    <View style={{ width: side, height: side, backgroundColor }}>
      {runs.map((run, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            top: run.row * cell,
            left: run.start * cell,
            width: run.length * cell,
            height: cell,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
