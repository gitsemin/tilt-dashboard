import argparse
import logging
import os
import sys
from pathlib import Path

import serial
from dotenv import load_dotenv
from supabase import Client, create_client

BAUD_RATE = 115200
TABLE_NAME = "readings"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read newline-delimited Arduino data and upload it to Supabase."
    )
    parser.add_argument(
        "port",
        help="Arduino serial port, for example COM3 (Windows) or /dev/ttyACM0 (Linux)",
    )
    return parser.parse_args()


def create_supabase_client() -> Client:
    load_dotenv(Path(__file__).with_name(".env"))
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")

    if not url:
        raise ValueError(".env에 VITE_SUPABASE_URL 값이 없습니다.")
    if not key:
        raise ValueError(".env에 VITE_SUPABASE_ANON_KEY 값이 없습니다.")

    return create_client(url, key)


def upload_lines(port_name: str, client: Client) -> None:
    uploaded_count = 0
    logging.info("시리얼 포트 %s에 %d baud로 연결합니다.", port_name, BAUD_RATE)

    with serial.Serial(port_name, baudrate=BAUD_RATE, timeout=1) as port:
        logging.info("연결되었습니다. 중지하려면 Ctrl+C를 누르세요.")
        while True:
            raw_line = port.readline()
            if not raw_line:
                continue

            line = raw_line.decode("utf-8", errors="replace").strip()
            # 스케치는 "STATE=RUN ... rotation_deg=0.2 rateZ=1.61 ..." 형식으로 보낸다.
            # 부팅·보정 로그 같은 다른 줄은 건너뛴다.
            if not line.startswith("STATE=RUN"):
                continue

            fields = dict(pair.split("=", 1) for pair in line.split() if "=" in pair)
            try:
                value = float(fields["rotation_deg"])
            except (KeyError, ValueError):
                logging.warning("형식이 다른 줄을 건너뜁니다: %s", line)
                continue

            client.table(TABLE_NAME).insert({"value": value}).execute()
            uploaded_count += 1
            logging.info("readings.value 저장 완료 (누적 %d건)", uploaded_count)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args = parse_args()

    try:
        client = create_supabase_client()
        upload_lines(args.port, client)
    except KeyboardInterrupt:
        logging.info("사용자 요청으로 업로드를 종료합니다.")
    except (ValueError, serial.SerialException) as error:
        logging.error("%s", error)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
