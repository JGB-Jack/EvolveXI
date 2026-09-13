import { Svg, Line, Circle, Text, Polyline } from "@react-pdf/renderer";
import { PDF_COLORS } from "./styles";

const WIDTH = 380;
const HEIGHT = 130;
const PAD_LEFT = 18;
const PAD_RIGHT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 28;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Font size shrinks as more sessions need to fit across the same width, so
// every date can still be shown rather than only the first and last.
function labelFontSize(count: number): number {
  if (count <= 6) return 8;
  if (count <= 10) return 7;
  if (count <= 16) return 6;
  return 5;
}

export function LineChart({
  data,
}: {
  data: { date: string; score: number }[];
}) {
  if (data.length < 2) return null;

  const fontSize = labelFontSize(data.length);
  const points = data.map((d, i) => ({
    x: PAD_LEFT + (i / (data.length - 1)) * PLOT_WIDTH,
    y: PAD_TOP + PLOT_HEIGHT - (Math.max(0, Math.min(5, d.score)) / 5) * PLOT_HEIGHT,
    label: formatDate(d.date),
  }));

  return (
    <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {[0, 1, 2, 3, 4, 5].map((v) => {
        const y = PAD_TOP + PLOT_HEIGHT - (v / 5) * PLOT_HEIGHT;
        return (
          <Line
            key={v}
            x1={PAD_LEFT}
            y1={y}
            x2={WIDTH - PAD_RIGHT}
            y2={y}
            stroke={PDF_COLORS.border}
            strokeWidth={1}
          />
        );
      })}
      {[0, 1, 2, 3, 4, 5].map((v) => {
        const y = PAD_TOP + PLOT_HEIGHT - (v / 5) * PLOT_HEIGHT;
        return (
          <Text
            key={v}
            x={4}
            y={y + 3}
            style={{ fontSize: 8, fill: PDF_COLORS.mutedForeground }}
          >
            {v}
          </Text>
        );
      })}

      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        stroke={PDF_COLORS.primary}
        strokeWidth={2}
        fill="none"
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={PDF_COLORS.primary} />
      ))}

      {points.map((p, i) => {
        const approxWidth = p.label.length * fontSize * 0.55;
        const x = Math.max(0, Math.min(WIDTH - approxWidth, p.x - approxWidth / 2));
        return (
          <Text
            key={i}
            x={x}
            y={HEIGHT - 4}
            style={{ fontSize, fill: PDF_COLORS.mutedForeground }}
          >
            {p.label}
          </Text>
        );
      })}
    </Svg>
  );
}
