@echo off
rem 이 폴더를 로컬 서버로 열고 브라우저를 띄운다 (Python 필요)
start "" http://localhost:8000/
python -m http.server 8000
