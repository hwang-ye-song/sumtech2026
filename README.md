# sumtech2026

SUMTECH 2026 루프톤 팀 서비스 저장소예요.

## 문서

- 문제 정의·기능 명세: `docs/problem.yaml` (2단계에서 작성)
- 사용자 핵심 흐름: `docs/scenarios.yaml` (2단계에서 작성)
- 진행 기록: `progress.md`

## 설치·실행

3단계에서 `Dockerfile`·`docker-compose.yml`을 만든 뒤 여기에 적어요.

## 환경변수

| 이름 | 용도 | 설정 위치 |
| ---- | ---- | --------- |
| `AI_GATEWAY_API_KEY` | 서비스의 AI 기능 호출(필요할 때만) | 로컬 `.env`, 배포 환경, GitHub Secrets |
