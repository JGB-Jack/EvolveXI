import { Svg, Polygon, Line, Text } from "@react-pdf/renderer";
import { PDF_COLORS } from "./styles";

const SIZE = 220;
const CENTER = SIZE / 2;
const MAX_RADIUS = 78;
const RINGS = [0.2, 0.4, 0.6, 0.8, 1];

function pointFor(index: number, count: number, fraction: number) {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / count);
  return {
    x: CENTER + MAX_RADIUS * fraction * Math.cos(angle),
    y: CENTER + MAX_RADIUS * fraction * Math.sin(angle),
  };
}

function polygonPoints(count: number, fraction: number): string {
  return Array.from({ length: count }, (_, i) => {
    const { x, y } = pointFor(i, count, fraction);
    return `${x},${y}`;
  }).join(" ");
}

// Nudges each vertex label outward, and shifts it left/right depending on
// which side of the pentagon it falls on so labels don't overlap the shape.
function labelPosition(index: number, count: number, label: string) {
  const { x, y } = pointFor(index, count, 1.18);
  const approxWidth = label.length * 4.5;
  let anchorX = x - approxWidth / 2;
  if (x < CENTER - 5) anchorX = x - approxWidth;
  else if (x > CENTER + 5) anchorX = x;
  return { x: anchorX, y: y - 4 };
}

export function RadarChart({
  data,
}: {
  data: { pillar: string; score: number }[];
}) {
  const count = data.length;
  if (count === 0) return null;

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
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
            x1={CENTER}
            y1={CENTER}
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
          <Text key={i} x={x} y={y} style={{ fontSize: 9, fill: PDF_COLORS.mutedForeground }}>
            {d.pillar}
          </Text>
        );
      })}
    </Svg>
  );
}
