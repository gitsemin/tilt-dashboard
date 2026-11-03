import { useEffect, useMemo, useState } from "react"
import {
  createInitialSensorHistory,
  createNextSensorReading,
  type SensorReading,
} from "./data/mockSensor"

const CHART_WIDTH = 1000
const CHART_HEIGHT = 300
const PADDING = { top: 20, right: 18, bottom: 42, left: 52 }
const Y_TICKS = [90, 45, 0, -45, -90]

function formatTime(date: Date, includeSeconds = false) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  }).format(date)
}

function angleToY(angle: number) {
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  return PADDING.top + ((90 - angle) / 180) * plotHeight
}

function SensorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 8.4a6.3 6.3 0 0 1 9.6 0M4.5 5.7a10 10 0 0 1 15 0M9.9 11.1a2.8 2.8 0 0 1 4.2 0" />
      <circle cx="12" cy="14.3" r="1.2" />
      <path d="M12 17.5v2.2" />
    </svg>
  )
}

function TiltMark({ angle, color }: { angle: number color: string }) {
  const clampedAngle = Math.max(-45, Math.min(45, angle))

  return (
    <div className="tilt-mark" aria-hidden="true">
      <span
        className="tilt-mark__line"
        style={{ background: color, transform: `rotate(${clampedAngle}deg)` }}
      />
      <span className="tilt-mark__dot" style={{ background: color }} />
    </div>
  )
}

function AngleCard({
  axis,
  angle,
  accent,
  description,
}: {
  axis: "X" | "Y"
  angle: number
  accent: string
  description: string
}) {
  const direction = angle >= 0 ? "양의 방향" : "음의 방향"

  return (
    <article className="angle-card">
      <div className="angle-card__top">
        <div>
          <p className="eyebrow">{axis}축 기울기</p>
          <p className="angle-card__description">{description}</p>
        </div>
        <span
          className="axis-badge"
          style={{ color: accent, backgroundColor: `${accent}14` }}
        >
          {axis}
        </span>
      </div>

      <div className="angle-card__value-row">
        <p className="angle-card__value">
          <span>{angle.toFixed(1)}</span>
          <small>°</small>
        </p>
        <TiltMark angle={angle} color={accent} />
      </div>

      <div className="angle-card__footer">
        <span className="direction-dot" style={{ backgroundColor: accent }} />
        {direction}
      </div>
    </article>
  )
}

function TiltChart({ readings }: { readings: SensorReading[] }) {
  const { xPath, yPath, timeLabels } = useMemo(() => {
    const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
    const pointX = (index: number) =>
      PADDING.left + (index / Math.max(readings.length - 1, 1)) * plotWidth
    const makePath = (key: "x" | "y") =>
      readings
        .map((reading, index) => {
          const command = index === 0 ? "M" : "L"
          return `${command}${pointX(index).toFixed(1)},${angleToY(reading[key]).toFixed(1)}`
        })
        .join(" ")

    const labelIndexes = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
      Math.round((readings.length - 1) * ratio),
    )

    return {
      xPath: makePath("x"),
      yPath: makePath("y"),
      timeLabels: labelIndexes.map((index) => ({
        x: pointX(index),
        label: readings[index]
          ? formatTime(readings[index].timestamp, true)
          : "",
      })),
    }
  }, [readings])

  const latest = readings[readings.length - 1]

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="최근 60초간 X축과 Y축 기울기 변화 선 그래프"
      >
        <defs>
          <linearGradient id="xLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2F6BFF" stopOpacity=".55" />
            <stop offset="1" stopColor="#2F6BFF" />
          </linearGradient>
          <linearGradient id="yLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#13A68C" stopOpacity=".55" />
            <stop offset="1" stopColor="#13A68C" />
          </linearGradient>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Y_TICKS.map((tick) => {
          const y = angleToY(tick)
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={CHART_WIDTH - PADDING.right}
                y1={y}
                y2={y}
                className={tick === 0 ? "chart__zero-line" : "chart__grid-line"}
              />
              <text
                x={PADDING.left - 13}
                y={y + 4}
                textAnchor="end"
                className="chart__label"
              >
                {tick}°
              </text>
            </g>
          )
        })}

        {timeLabels.map(({ x, label }) => (
          <text
            key={`${x}-${label}`}
            x={x}
            y={CHART_HEIGHT - 10}
            textAnchor="middle"
            className="chart__label chart__time-label"
          >
            {label}
          </text>
        ))}

        <path d={xPath} className="chart__line chart__line--x" />
        <path d={yPath} className="chart__line chart__line--y" />

        {latest && (
          <>
            <circle
              cx={CHART_WIDTH - PADDING.right}
              cy={angleToY(latest.x)}
              r="8"
              fill="#2F6BFF"
              opacity=".13"
            />
            <circle
              cx={CHART_WIDTH - PADDING.right}
              cy={angleToY(latest.x)}
              r="3.5"
              fill="#fff"
              stroke="#2F6BFF"
              strokeWidth="2.5"
            />
            <circle
              cx={CHART_WIDTH - PADDING.right}
              cy={angleToY(latest.y)}
              r="8"
              fill="#13A68C"
              opacity=".13"
            />
            <circle
              cx={CHART_WIDTH - PADDING.right}
              cy={angleToY(latest.y)}
              r="3.5"
              fill="#fff"
              stroke="#13A68C"
              strokeWidth="2.5"
            />
          </>
        )}
      </svg>
    </div>
  )
}

export default function App() {
  const [readings, setReadings] = useState<SensorReading[]>(() =>
    createInitialSensorHistory(),
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReadings((current) => {
        const next = createNextSensorReading(current[current.length - 1])
        return [...current.slice(1), next]
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const latest = readings[readings.length - 1]

  return (
    <main className="dashboard-shell">
      <div className="dashboard">
        <header className="topbar">
          <div className="brand">
            <div className="brand__icon">
              <SensorIcon />
            </div>
            <div>
              <p className="brand__name">Tilt Monitor</p>
              <p className="brand__sub">기울기 센서 대시보드</p>
            </div>
          </div>

          <div className="connection">
            <span className="connection__pulse" />
            <span>센서 연결됨</span>
          </div>
        </header>

        <section className="intro">
          <div>
            <p className="section-kicker">LIVE MONITORING</p>
            <h1>센서 기울기 현황</h1>
            <p className="intro__copy">
              장치의 X축과 Y축 각도를 실시간으로 확인하세요.
            </p>
          </div>
          <div className="updated-at">
            <span>마지막 갱신</span>
            <strong>{formatTime(latest.timestamp, true)}</strong>
            <i />
          </div>
        </section>

        <section className="angle-grid" aria-label="현재 센서값">
          <AngleCard
            axis="X"
            angle={latest.x}
            accent="#2F6BFF"
            description="좌우 기울기"
          />
          <AngleCard
            axis="Y"
            angle={latest.y}
            accent="#13A68C"
            description="앞뒤 기울기"
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <p className="eyebrow">실시간 변화</p>
              <h2>기울기 추이</h2>
              <p>최근 60초 동안의 각도 변화</p>
            </div>
            <div className="legend" aria-label="그래프 범례">
              <span>
                <i className="legend__line legend__line--x" />
                X축
              </span>
              <span>
                <i className="legend__line legend__line--y" />
                Y축
              </span>
            </div>
          </div>
          <TiltChart readings={readings} />
          <div className="chart-card__foot">
            <span>각도 범위</span>
            <strong>−90°</strong>
            <i />
            <strong>+90°</strong>
            <span className="chart-card__foot-note">
              1초 간격으로 자동 갱신
            </span>
          </div>
        </section>
      </div>
    </main>
  )
}
