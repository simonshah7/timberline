'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection, Geometry } from 'geojson';

// Map our data country names to world-atlas names
const NAME_MAP: Record<string, string> = {
  'United States': 'United States of America',
};

const REGION_COLORS: Record<string, string> = {
  Americas: '#3B53FF',
  EMEA: '#7A00C1',
  APAC: '#006170',
  Other: '#94a3b8',
};

const COUNTRY_TO_REGION: Record<string, string> = {
  'United States': 'Americas',
  Canada: 'Americas',
  Mexico: 'Americas',
  Brazil: 'Americas',
  Argentina: 'Americas',
  Colombia: 'Americas',
  'United Kingdom': 'EMEA',
  Germany: 'EMEA',
  France: 'EMEA',
  Switzerland: 'EMEA',
  Netherlands: 'EMEA',
  Denmark: 'EMEA',
  Sweden: 'EMEA',
  Finland: 'EMEA',
  Belgium: 'EMEA',
  Austria: 'EMEA',
  Italy: 'EMEA',
  Spain: 'EMEA',
  Ireland: 'EMEA',
  Poland: 'EMEA',
  Hungary: 'EMEA',
  Luxembourg: 'EMEA',
  'Saudi Arabia': 'EMEA',
  'United Arab Emirates': 'EMEA',
  Japan: 'APAC',
  Australia: 'APAC',
  Singapore: 'APAC',
  India: 'APAC',
};

interface WorldMapChartProps {
  countryDistribution: Record<string, number>;
  totalOpportunities: number;
}

interface CountryFeature {
  type: string;
  properties: { name: string };
  geometry: Geometry;
}

export default function WorldMapChart({
  countryDistribution,
  totalOpportunities,
}: WorldMapChartProps) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch('/countries-110m.json')
      .then((res) => res.json())
      .then((topo: Topology) => {
        const geo = feature(
          topo,
          topo.objects.countries as Parameters<typeof feature>[1]
        ) as unknown as FeatureCollection;
        setGeojson(geo);
      })
      .catch(() => {});
  }, []);

  // Build reverse lookup: geoName -> { count, country, region }
  const geoLookup = useMemo(() => {
    const map = new Map<
      string,
      { count: number; country: string; region: string }
    >();
    for (const [country, count] of Object.entries(countryDistribution)) {
      const geoName = NAME_MAP[country] || country;
      const region = COUNTRY_TO_REGION[country] || 'Other';
      map.set(geoName, { count, country, region });
    }
    return map;
  }, [countryDistribution]);

  const maxCount = useMemo(() => {
    const vals = Object.values(countryDistribution);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [countryDistribution]);

  const width = 800;
  const height = 420;

  const projection = useMemo(
    () =>
      geoNaturalEarth1()
        .scale(145)
        .translate([width / 2, height / 2 + 20])
        .rotate([-10, 0, 0]),
    []
  );

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  if (!geojson) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ maxHeight: '420px' }}
      >
        {geojson.features.map((feat, i) => {
          const f = feat as unknown as CountryFeature;
          const geoName = f.properties.name;
          const data = geoLookup.get(geoName);
          const d = pathGenerator(feat as Parameters<typeof pathGenerator>[0]) || '';

          if (!data) {
            return (
              <path
                key={i}
                d={d}
                fill="#1e1e2e"
                stroke="#2a2a3e"
                strokeWidth={0.4}
              />
            );
          }

          const baseColor = REGION_COLORS[data.region] || '#94a3b8';
          const opacity = 0.45 + (data.count / maxCount) * 0.55;
          const pct =
            totalOpportunities > 0
              ? ((data.count / totalOpportunities) * 100).toFixed(1)
              : '0';

          return (
            <path
              key={i}
              d={d}
              fill={baseColor}
              fillOpacity={opacity}
              stroke="#0d0d1a"
              strokeWidth={0.5}
              className="transition-all duration-150 cursor-pointer"
              onMouseEnter={(e) => {
                const svg = svgRef.current;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                setTooltip({
                  text: `${data.country}: ${data.count} opps (${pct}%)`,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 10,
                });
                (e.target as SVGPathElement).setAttribute('fill-opacity', '1');
                (e.target as SVGPathElement).setAttribute('stroke', '#fff');
                (e.target as SVGPathElement).setAttribute('stroke-width', '1.2');
              }}
              onMouseLeave={(e) => {
                setTooltip(null);
                (e.target as SVGPathElement).setAttribute(
                  'fill-opacity',
                  String(opacity)
                );
                (e.target as SVGPathElement).setAttribute('stroke', '#0d0d1a');
                (e.target as SVGPathElement).setAttribute('stroke-width', '0.5');
              }}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-black/80 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap z-10"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Region legend */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
        {Object.entries(REGION_COLORS).map(([region, color]) => (
          <div key={region} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-[11px] text-white/80">{region}</span>
          </div>
        ))}
      </div>

      {/* Top countries overlay */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-4 gap-y-1 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
        {Object.entries(countryDistribution)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8)
          .map(([country, count]) => {
            const region = COUNTRY_TO_REGION[country] || 'Other';
            const color = REGION_COLORS[region] || '#94a3b8';
            return (
              <div key={country} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-white/70">{country}</span>
                <span className="text-[10px] text-white font-medium">
                  {count}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
