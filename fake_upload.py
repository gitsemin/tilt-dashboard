"""아두이노 없이 연습할 때 쓰는 가짜 업로더.

upload.py는 시리얼 포트에서 값을 읽지만, 이 스크립트는 1초마다
기울기처럼 보이는 가짜 각도(-90~90)를 만들어 readings.value에 저장한다.
아두이노가 생기면 upload.py를 대신 실행하면 된다.
"""

import argparse
import logging
import math
import os
import random
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from postgrest.exceptions import APIError
from supabase import Client, create_client

TABLE_NAME = "readings"
INTERVAL_SECONDS = 1.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload fake tilt angles to Supabase every second (no Arduino needed)."
    )
    parser.add_argument(
        "--count",
        type=int,
        default=0,
        help="몇 개만 올리고 멈출지 (0이면 Ctrl+C로 멈출 때까지 계속)",
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


def fake_angle(step: int) -> float:
    # 천천히 좌우로 기우는 움직임 + 손떨림 같은 작은 잡음
    angle = 35 * math.sin(step / 8) + random.uniform(-3, 3)
    return round(max(-90.0, min(90.0, angle)), 1)


def upload_fake_values(client: Client, count: int) -> None:
    step = 0
    logging.info("가짜 값을 %s 테이블에 1초마다 올립니다. 중지하려면 Ctrl+C를 누르세요.", TABLE_NAME)

    while count == 0 or step < count:
        value = fake_angle(step)
        client.table(TABLE_NAME).insert({"value": value}).execute()
        step += 1
        logging.info("readings.value = %s 저장 완료 (누적 %d건)", value, step)
        time.sleep(INTERVAL_SECONDS)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args = parse_args()

    try:
        client = create_supabase_client()
        upload_fake_values(client, args.count)
    except KeyboardInterrupt:
        logging.info("사용자 요청으로 업로드를 종료합니다.")
    except ValueError as error:
        logging.error("%s", error)
        return 1
    except APIError as error:
        logging.error("Supabase가 저장을 거부했습니다: %s", error.message)
        if error.code == "42501":
            logging.error("readings 테이블에 INSERT 정책(allow_insert, 식 true)이 있는지 확인하세요.")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
