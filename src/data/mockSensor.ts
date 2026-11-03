/**
 * Replace the functions in this file when connecting a real sensor.
 * The dashboard only depends on the SensorReading shape below.
 */
export type SensorReading = {
  timestamp: Date
  x: number
  y: number
}

export const SENSOR_HISTORY_LENGTH = 61

const clamp = (value: number, min = -90, max = 90) =>
  Math.min(max, Math.max(min, value))

const jitter = (amount: number) => (Math.random() - 0.5) * amount

export function createNextSensorReading(
  previous: SensorReading,
  timestamp = new Date(),
): SensorReading {
  return {
    timestamp,
    x: clamp(
      previous.x + jitter(2.8) + Math.sin(timestamp.getTime() / 8000) * 0.28,
    ),
    y: clamp(
      previous.y + jitter(2.2) + Math.cos(timestamp.getTime() / 10000) * 0.24,
    ),
  }
}

export function createInitialSensorHistory(): SensorReading[] {
  const now = Date.now()
  const readings: SensorReading[] = [
    {
      timestamp: new Date(now - (SENSOR_HISTORY_LENGTH - 1) * 1000),
      x: 12.4,
      y: -6.8,
    },
  ]

  for (let index = 1; index < SENSOR_HISTORY_LENGTH; index += 1) {
    const timestamp = new Date(now - (SENSOR_HISTORY_LENGTH - 1 - index) * 1000)
    readings.push(createNextSensorReading(readings[index - 1], timestamp))
  }

  return readings
}
