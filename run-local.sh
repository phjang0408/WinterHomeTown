#!/bin/sh
# 이 폴더를 로컬 서버로 연다 (Python 필요). 브라우저에서 http://localhost:8000/ 을 연다.
cd "$(dirname "$0")" && python3 -m http.server 8000
