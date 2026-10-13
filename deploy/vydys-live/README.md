# Vydys Live Lite

Vydys Live Lite is the lightweight self-hosted classroom media layer for Vydys.

## Classroom model

- Instructor: camera, microphone, screen share, audio/video subscription.
- Student: microphone only, audio/video subscription.
- Student camera publication is denied in the signed LiveKit token.
- Vydys keeps its own chat, attendance, resources and assignments.
- No transcoding service is required for the basic classroom.
- LiveKit runs as an SFU and forwards media rather than creating a full video grid.

## Server requirements

Use a Linux server with a public IPv4 address and Docker. For the planned 50-person classroom, network bandwidth is more important than GPU resources because this configuration does not transcode the instructor stream.

DNS:
- Point `meet.vydys.com` to the server public IP.

Firewall:
- TCP 80 and 443 for HTTPS / certificate issuance.
- TCP 7881 for WebRTC TCP fallback.
- UDP 7882 for WebRTC media (single-port UDP mux).

## Setup

1. Copy this directory to the server.
2. Copy `livekit.yaml.example` to `livekit.yaml`.
3. Replace `CHANGE_ME_API_KEY` and `CHANGE_ME_API_SECRET` with strong random values.
4. Keep the same values as Vercel environment variables:
   - `LIVEKIT_URL=wss://meet.vydys.com`
   - `LIVEKIT_API_KEY=<api key>`
   - `LIVEKIT_API_SECRET=<api secret>`
5. Run:
   ```
   docker compose up -d
   ```
6. Verify HTTPS at `https://meet.vydys.com`.

Do not commit `livekit.yaml` after inserting the real secret.

## Vydys behavior

The Vydys frontend calls `/api/live/token`. The endpoint validates the current Supabase user against `get_classroom_session_access`, then signs a short-lived LiveKit token.

Instructor grant:
- camera
- microphone
- screen share
- room moderation

Student grant:
- microphone only
- subscribe to instructor audio/video

If the three LiveKit environment variables are not configured, Vydys temporarily falls back to the existing public Jitsi integration so current Classrooms are not interrupted.
