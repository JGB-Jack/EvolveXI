import { Svg, Polygon, Line, Text } from "@react-pdf/renderer";
import { PDF_COLORS } from "./styles";

const WIDTH = 300;
const HEIGHT = 230;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const MAX_RADIUS = 68;
const RINGS = [0.2, 0.4, 0.6, 0.8, 1];
const LABEL_FONT_SIZE = 8;

function pointFor(index: number, count: number, fraction: number) {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / count);
  return {
    x: CENTER_X + MAX_RADIUS * fraction * Math.cos(angle),
    y: CENTER_Y + MAX_RADIUS * fraction * Math.sin(angle),
  };
}

function polygonPoints(count: number, fraction: number): string {
  return Array.from({ length: count }, (_, i) => {
    const { x, y } = pointFor(i, count, fraction);
    return `${x},${y}`;
  }).join(" ");
}

// Nudges each vertex label outward, shifts it left/right depending on which
// side of the pentagon it falls on, then clamps it inside the canvas so
// long labels (e.g. "Psychological") never get clipped at the edge.
function labelPosition(index: number, count: number, label: string) {
  const { x, y } = pointFor(index, count, 1.2);
  const approxWidth = label.length * LABEL_FONT_SIZE * 0.55;
  let anchorX = x - approxWidth / 2;
  if (x < CENTER_X - 5) anchorX = x - approxWidth;
  else if (x > CENTER_X + 5) anchorX = x;
  anchorX = Math.max(2, Math.min(WIDTH - approxWidth - 2, anchorX));
  const anchorY = Math.max(9, Math.min(HEIGHT - 4, y));
  return { x: anchorX, y: anchorY };
}

export function RadarChart({
  data,
}: {
  data: { pillar: string; score: number }[];
}) {
  const count = data.length;
  if (count === 0) return null;

  return (
    <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {RINGS.map((r) => (
        <Polygon
          key={r}
          points={polygonPoints(count, r)}
          stroke={PDF_COLORS.border}
          strokeWidth={1}
          fill="none"
        />
      ))}

      {data.map((_, i) => {
        const outer = pointFor(i, count, 1);
        return (
          <Line
            key={i}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={outer.x}
            y2={outer.y}
            stroke={PDF_COLORS.border}
            strokeWidth={1}
          />
        );
      })}

      <Polygon
        points={data
          .map((d, i) => {
            const { x, y } = pointFor(i, count, Math.max(0, Math.min(1, d.score / 5)));
            return `${x},${y}`;
          })
          .join(" ")}
        stroke={PDF_COLORS.primary}
        strokeWidth={2}
        fill={PDF_COLORS.primary}
        fillOpacity={0.35}
      />

      {data.map((d, i) => {
        const { x, y } = labelPosition(i, count, d.pillar);
        return (
          <Text
            key={i}
            x={x}
            y={y}
            style={{ fontSize: LABEL_FONT_SIZE, fill: PDF_COLORS.mutedForeground }}
          >
            {d.pillar}
          </Text>
        );
      })}
    </Svg>
  );
}
