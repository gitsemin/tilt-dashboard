import { useEffect, useMemo, useRef, useState } from "react"
import type { SensorReading } from "./data/mockSensor"

const CHART_WIDTH = 1000
const CHART_HEIGHT = 300
const HISTORY_LIMIT = 100
const PADDING = { top: 20, right: 18, bottom: 42, left: 52 }
const Y_TICKS = [90, 45, 0, -45, -90]

type SerialPortConnection = {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
}

type WebSerialApi = {
  requestPort(): Promise<SerialPortConnection>
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "disconnecting" | "error"

type NavigatorWithSerial = Navigator & {
  serial?: WebSerialApi
}

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

function TiltMark({ angle, color }: { angle: number | null; color: string }) {
  const clampedAngle = Math.max(-45, Math.min(45, angle ?? 0))

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
  angle: number | null
  accent: string
  description: string
}) {
  const direction =
    angle === null ? "데이터 대기 중" : angle >= 0 ? "양의 방향" : "음의 방향"

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
          <span>{angle === null ? "--" : angle.toFixed(1)}</span>
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
      readings.length === 1
        ? PADDING.left + plotWidth
        : PADDING.left + (index / Math.max(readings.length - 1, 1)) * plotWidth
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
        aria-label="최근 100개 X축과 Y축 기울기 변화 선 그래프"
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

        {timeLabels.map(({ x, label }, index) => (
          <text
            key={index}
            x={x}
            y={CHART_HEIGHT - 10}
            textAnchor="middle"
            className="chart__label chart__time-label"
          >
            {label}
          </text>
        ))}

        {readings.length === 0 && (
          <text
            x={CHART_WIDTH / 2}
            y={CHART_HEIGHT / 2}
            textAnchor="middle"
            className="chart__label chart__empty"
          >
            시리얼 연결 후 데이터를 기다립니다
          </text>
        )}

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
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected")
  const [serialMessage, setSerialMessage] = useState("")
  const portRef = useRef<SerialPortConnection | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const intentionalDisconnectRef = useRef(false)

  useEffect(() => {
    return () => {
      const reader = readerRef.current
      if (reader) {
        void reader.cancel().catch((error: unknown) => {
          console.error("시리얼 리더를 정리하지 못했습니다.", error)
        })
      }
    }
  }, [])

  const latest = readings[readings.length - 1]

  async function consumeSerialData(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    port: SerialPortConnection,
  ) {
    const decoder = new TextDecoder()
    let pendingText = ""
    let readError: unknown

    const consumeLine = (line: string) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      const values = trimmedLine.split(/[,\s]+/).map(Number)
      if (
        values.length !== 2 ||
        values.some(
          (value) => !Number.isFinite(value) || value < -90 || value > 90,
        )
      ) {
        setSerialMessage(
          `데이터 형식 오류: "${trimmedLine}" — 한 줄에 -90~90도 범위의 X,Y 각도 두 개를 보내세요.`,
        )
        return
      }

      const [x, y] = values
      const reading: SensorReading = { timestamp: new Date(), x, y }
      setReadings((current) => [...current.slice(-(HISTORY_LIMIT - 1)), reading])
      setSerialMessage("")
    }

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        pendingText += decoder.decode(value, { stream: true })
        if (pendingText.length > 1024) {
          pendingText = ""
          setSerialMessage("데이터 줄이 너무 깁니다. 줄바꿈과 함께 값을 보내세요.")
          continue
        }

        const lines = pendingText.replace(/\r/g, "\n").split("\n")
        pendingText = lines.pop() ?? ""
        lines.forEach(consumeLine)
      }

      pendingText += decoder.decode()
      consumeLine(pendingText)
    } catch (error) {
      readError = error
    } finally {
      reader.releaseLock()
      if (readerRef.current === reader) readerRef.current = null

      if (portRef.current === port) {
        portRef.current = null
        try {
          await port.close()
        } catch (error) {
          readError = readError ?? error
        }
      }

      if (readError) {
        setConnectionStatus("error")
        setSerialMessage(
          `시리얼 통신이 종료되었습니다: ${
            readError instanceof Error ? readError.message : String(readError)
          }`,
        )
      } else {
        setConnectionStatus("disconnected")
        if (!intentionalDisconnectRef.current) {
          setSerialMessage("시리얼 연결이 종료되었습니다.")
        }
      }
      intentionalDisconnectRef.current = false
    }
  }

  async function connectSerial() {
    setConnectionStatus("connecting")
    setSerialMessage("")

    const serial = (navigator as NavigatorWithSerial).serial
    if (!serial) {
      setConnectionStatus("error")
      setSerialMessage(
        "Web Serial API를 지원하는 Chrome 또는 Edge에서 HTTPS/localhost로 접속하세요.",
      )
      return
    }

    let selectedPort: SerialPortConnection | null = null
    let opened = false
    try {
      selectedPort = await serial.requestPort()
      await selectedPort.open({ baudRate: 9600 })
      opened = true
      const readable = selectedPort.readable
      if (!readable) throw new Error("선택한 포트에서 데이터를 읽을 수 없습니다.")

      const reader = readable.getReader()
      portRef.current = selectedPort
      readerRef.current = reader
      intentionalDisconnectRef.current = false
      setReadings([])
      setConnectionStatus("connected")
      void consumeSerialData(reader, selectedPort)
    } catch (error) {
      if (opened && selectedPort) {
        try {
          await selectedPort.close()
        } catch (closeError) {
          error = new Error(
            `${error instanceof Error ? error.message : String(error)}; 포트를 닫지 못했습니다: ${
              closeError instanceof Error ? closeError.message : String(closeError)
            }`,
          )
        }
      }

      if (error instanceof DOMException && error.name === "NotFoundError") {
        setConnectionStatus("disconnected")
        return
      }
      setConnectionStatus("error")
      setSerialMessage(
        `시리얼 연결에 실패했습니다: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  async function disconnectSerial() {
    const reader = readerRef.current
    if (!reader) return

    intentionalDisconnectRef.current = true
    setConnectionStatus("disconnecting")
    setSerialMessage("")
    try {
      await reader.cancel()
    } catch (error) {
      intentionalDisconnectRef.current = false
      setConnectionStatus("error")
      setSerialMessage(
        `시리얼 연결을 종료하지 못했습니다: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  const connectionLabel: Record<ConnectionStatus, string> = {
    disconnected: "연결 대기",
    connecting: "연결 중",
    connected: "센서 연결됨",
    disconnecting: "연결 종료 중",
    error: "연결 오류",
  }

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

          <div className="topbar__actions">
            <div className={`connection connection--${connectionStatus}`}>
              <span className="connection__pulse" />
              <span>{connectionLabel[connectionStatus]}</span>
            </div>
            <button
              className="serial-button"
              type="button"
              onClick={
                connectionStatus === "connected"
                  ? disconnectSerial
                  : connectSerial
              }
              disabled={
                connectionStatus === "connecting" ||
                connectionStatus === "disconnecting"
              }
            >
              {connectionStatus === "connected" ? "연결 해제" : "시리얼 연결"}
            </button>
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
            <strong>
              {latest ? formatTime(latest.timestamp, true) : "--:--:--"}
            </strong>
            {latest && <i />}
          </div>
        </section>

        {serialMessage && (
          <p className="serial-message" role="status">
            {serialMessage}
          </p>
        )}

        <section className="angle-grid" aria-label="현재 센서값">
          <AngleCard
            axis="X"
            angle={latest?.x ?? null}
            accent="#2F6BFF"
            description="좌우 기울기"
          />
          <AngleCard
            axis="Y"
            angle={latest?.y ?? null}
            accent="#13A68C"
            description="앞뒤 기울기"
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <p className="eyebrow">실시간 변화</p>
              <h2>기울기 추이</h2>
              <p>최근 {HISTORY_LIMIT}개 수신값 · 데이터는 저장되지 않습니다</p>
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
              9600 baud · 줄마다 X,Y 값 (예: 12.4,-6.8)
            </span>
          </div>
        </section>
      </div>
    </main>
  )
}
