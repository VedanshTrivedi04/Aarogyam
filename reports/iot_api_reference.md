# IoT Device API Reference

Base URL: `/api/v1/iot/`

---

## Authentication

| Type | How |
|---|---|
| Patient / Caregiver | `Authorization: Bearer <jwt_token>` |
| Firmware (ESP32) | `X-Device-Key: <api_key>` |

---

## PATIENT / Device Owner Endpoints

> JWT Bearer token required. Only the device owner can call these unless noted otherwise.

---

### `GET /devices/`
List all devices linked to the logged-in user.

**Request body:** None

**Response:**
```json
[{
  "id": "uuid",
  "device_name": "My Pillbox",
  "device_type": "PILLBOX",
  "api_key": "secret-key",
  "is_active": true,
  "battery_level": 85,
  "last_seen_at": "2026-05-18T10:00:00Z",
  "firmware_version": "1.0.0",
  "linked_patient_id": "uuid",
  "linked_patient_name": "Ramesh Kumar",
  "linked_patient_code": "PAT-001",
  "current_compartment_position": 2,
  "target_compartment": null,
  "last_aligned_compartment": 2,
  "intake_window_started_at": null
}]
```

---

### `POST /devices/link/`
Register a new device. **Premium feature.**

**Request body:**
```json
{
  "device_name": "Bedroom Pillbox",
  "device_type": "PILLBOX"
}
```

`device_type` options: `PILLBOX` | `WEARABLE` | `MONITOR` | `OTHER`

**Response:** Full device object (same as above). The `api_key` field must be flashed into the ESP32 firmware.

---

### `GET /devices/{device_id}/`
Get a single device's full detail.

**Request body:** None

**Response:** Same as device list item above.

---

### `DELETE /devices/{device_id}/`
Deactivate a device (soft delete — sets `is_active = false`).

**Request body:** None

---

### `GET /devices/{device_id}/status/`
Quick battery and online status check.

**Request body:** None

**Response:**
```json
{
  "device_id": "uuid",
  "is_active": true,
  "battery_level": 72,
  "last_seen_at": "2026-05-18T10:30:00Z",
  "firmware_version": "1.0.2"
}
```

---

### `GET /devices/{device_id}/events/`
Last 50 raw device events (dose taken, lid open, weight reading, etc.)

**Request body:** None

**Response:**
```json
[{
  "id": "uuid",
  "event_uuid": "uuid",
  "event_type": "WEIGHT_READING",
  "compartment_num": 3,
  "raw_payload": {
    "weight_grams": 12.4,
    "phase": "after_dose"
  },
  "processed": true,
  "created_at": "2026-05-18T08:01:00Z"
}]
```

**All possible `event_type` values:**

| event_type | Meaning |
|---|---|
| `DOSE_TAKEN` | Dose confirmed taken |
| `DOSE_MISSED` | Firmware-side missed dose |
| `DOSE_TIMEOUT` | 1-hour window expired (firmware) |
| `COMPARTMENT_OPEN` | Compartment opened (legacy) |
| `LOW_BATTERY` | Battery below 15% |
| `TAMPER` | Tamper detected |
| `DEVICE_ON` | Device powered on |
| `DEVICE_OFF` | Device powered off |
| `COMPARTMENT_ROTATED` | Motor aligned compartment to lid |
| `HAND_DETECTED` | Ultrasonic sensor detected user |
| `LID_OPENED` | Gate opened |
| `LID_CLOSED` | Gate closed after dose attempt |
| `WEIGHT_READING` | Load cell reading (before or after dose) |

---

### `GET /devices/{device_id}/compartments/`
See which prescription is assigned to each compartment.

**Request body:** None

**Response:**
```json
[{
  "compartment_number": 1,
  "prescription": "uuid",
  "next_scheduled_time": "2026-05-18T20:00:00Z"
}]
```

---

### `PUT /devices/{device_id}/compartments/`
Update compartment-to-prescription mapping.

**Request body:**
```json
{
  "compartments": [
    { "compartment_number": 1, "prescription_id": "uuid" },
    { "compartment_number": 2, "prescription_id": "uuid" }
  ]
}
```

**Response:** `200 OK` with success message.

---

### `PATCH /devices/{device_id}/link-patient/`
Link or unlink a patient from this device. Owner only.

**Request body — link:**
```json
{ "patient_id": "uuid" }
```

**Request body — unlink:**
```json
{ "patient_id": null }
```

**Response:** Updated device object.

---

### `GET /devices/{device_id}/sessions/`
List last 50 dose sessions — every dose attempt tracked from alignment to completion.

**Request body:** None

**Response:**
```json
[{
  "id": "uuid",
  "compartment_num": 2,
  "reminder_job_id": "uuid",
  "status": "taken",
  "window_started_at": "2026-05-18T08:00:00Z",
  "window_expires_at": "2026-05-18T09:00:00Z",
  "completed_at": "2026-05-18T08:07:22Z",
  "expected_weight_before_g": 15.2,
  "actual_weight_after_g": 11.8,
  "weight_reduction_actual": 3.4,
  "weight_reduction_expected": 3.0,
  "lid_open_count": 1,
  "hand_detected": true,
  "is_locked": false,
  "caregiver_alerted_at": null,
  "caregiver_unlocked_at": null,
  "created_at": "2026-05-18T08:00:00Z",
  "updated_at": "2026-05-18T08:07:22Z"
}]
```

**`status` values:**

| status | Meaning |
|---|---|
| `pending` | Dose window open, waiting for patient |
| `taken` | Weight verified, dose confirmed |
| `partial` | Weight dropped but not enough, window still open |
| `missed` | Window expired with no dose |
| `locked` | Lid locked after missed dose, awaiting caregiver unlock |

---

### `POST /devices/{device_id}/commands/queue/`
Manually queue a command to the device. Owner can call this anytime.

**Request body:**
```json
{
  "type": "PLAY_VOICE_NOTE",
  "payload": {
    "text": "Dawai lene ka waqt ho gaya.",
    "compartment": 2
  }
}
```

**All `type` options:**

| type | What device does |
|---|---|
| `ROTATE_TO_COMPARTMENT` | Motor rotates to `target_compartment` |
| `PLAY_VOICE_NOTE` | Speaker plays `text` |
| `OPEN_LID` | Gate opens |
| `CANCEL_DISPENSE` | Cancels current dispense |
| `LOCK_LID` | Locks gate |
| `UNLOCK_LID` | Unlocks gate |
| `SYNC_SCHEDULE` | Pushes today's schedule to device |
| `SYNC_TIME` | Syncs device clock with server |
| `UPDATE_DISPLAY` | Updates OLED display |
| `FIRMWARE_UPDATE` | Triggers OTA update |
| `CUSTOM` | Any raw custom command |

**Response:**
```json
{
  "command_id": "uuid",
  "type": "PLAY_VOICE_NOTE",
  "payload": { "text": "Dawai lene ka waqt ho gaya.", "compartment": 2 },
  "status": "PENDING",
  "expires_at": null,
  "created_at": "2026-05-18T08:00:00Z"
}
```

---

## CAREGIVER Endpoints

> JWT Bearer token required. Caregiver must be actively linked to the device's patient (`PatientCaregiverLink.is_active = true`).

### Access Summary

| Endpoint | Patient/Owner | Caregiver |
|---|---|---|
| `GET /devices/` | ✅ | ❌ (sees own devices only) |
| `POST /devices/link/` | ✅ | ❌ |
| `GET /devices/{id}/` | ✅ | ❌ |
| `DELETE /devices/{id}/` | ✅ | ❌ |
| `GET /devices/{id}/status/` | ✅ | ❌ |
| `GET /devices/{id}/events/` | ✅ | ❌ |
| `GET /devices/{id}/compartments/` | ✅ | ❌ |
| `PUT /devices/{id}/compartments/` | ✅ | ❌ |
| `PATCH /devices/{id}/link-patient/` | ✅ | ❌ |
| `GET /devices/{id}/sessions/` | ✅ | ✅ |
| `POST /devices/{id}/sessions/{session_id}/unlock/` | ✅ | ✅ |
| `POST /devices/{id}/commands/queue/` | ✅ | ✅ |

---

### `GET /devices/{device_id}/sessions/`
View patient's dose sessions. Same response as patient section above.

---

### `POST /devices/{device_id}/sessions/{session_id}/unlock/`
Remotely unlock the dispenser lid after a missed-dose lock.

**Request body:** None

**Response:**
```json
{
  "command_id": "uuid",
  "session_id": "uuid",
  "status": "unlock_queued"
}
```

**Errors:**

| Code | Status | Meaning |
|---|---|---|
| `NOT_LOCKED` | 400 | Session is not currently locked |
| — | 404 | Device or session not found / no access |

---

### `POST /devices/{device_id}/commands/queue/`
Queue a command to the patient's device. Same request/response as patient section above.

**Common caregiver use case — manual unlock:**
```json
{
  "type": "UNLOCK_LID",
  "payload": { "compartment": 2, "reason": "caregiver_override" }
}
```

---

## FIRMWARE (ESP32) Endpoints

> No JWT. Use `X-Device-Key` header with the `api_key` value from device registration.

---

### `POST /heartbeat/`
Device sends health data every 30 seconds.

**Header:** `X-Device-Key: <api_key>`

**Request body:**
```json
{
  "battery_level": 78,
  "firmware_version": "1.0.2",
  "wifi_strength": -65,
  "uptime_seconds": 3600
}
```

**Response:** `200 OK`

---

### `POST /events/`
Send any event from the device to the backend. Idempotent — duplicate `event_uuid` is silently ignored.

**Header:** `X-Device-Key: <api_key>`

**Base request body (all events):**
```json
{
  "event_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "HAND_DETECTED",
  "compartment_num": 2
}
```

**Event-specific payloads:**

#### `COMPARTMENT_ROTATED`
Motor has aligned compartment to the lid.
```json
{
  "event_uuid": "uuid",
  "event_type": "COMPARTMENT_ROTATED",
  "compartment_num": 3
}
```

#### `HAND_DETECTED`
Ultrasonic sensor fired — user's hand is near the lid.
```json
{
  "event_uuid": "uuid",
  "event_type": "HAND_DETECTED",
  "compartment_num": 2
}
```
Backend auto-queues `OPEN_LID` command in response.

#### `LID_OPENED`
Gate physically opened.
```json
{
  "event_uuid": "uuid",
  "event_type": "LID_OPENED",
  "compartment_num": 2
}
```

#### `LID_CLOSED`
Gate closed after dose attempt.
```json
{
  "event_uuid": "uuid",
  "event_type": "LID_CLOSED",
  "compartment_num": 2
}
```
Backend auto-queues `READ_WEIGHT` command in response.

#### `WEIGHT_READING` — Before dose (baseline)
Send immediately after `READ_WEIGHT` command is received with `phase: before_dose`.
```json
{
  "event_uuid": "uuid",
  "event_type": "WEIGHT_READING",
  "compartment_num": 2,
  "weight_grams": 15.2,
  "phase": "before_dose"
}
```

#### `WEIGHT_READING` — After dose (verification)
Send after lid closes and `READ_WEIGHT` command is received with `phase: after_dose`.
```json
{
  "event_uuid": "uuid",
  "event_type": "WEIGHT_READING",
  "compartment_num": 2,
  "weight_grams": 11.8,
  "phase": "after_dose",
  "session_id": "dose-session-uuid"
}
```
Backend compares drop. If drop >= 50% of expected → dose marked `taken`.

#### `DOSE_TIMEOUT`
Firmware-side 1-hour timeout. Backend also tracks this independently via Celery.
```json
{
  "event_uuid": "uuid",
  "event_type": "DOSE_TIMEOUT",
  "compartment_num": 2
}
```

#### `LOW_BATTERY`
```json
{
  "event_uuid": "uuid",
  "event_type": "LOW_BATTERY",
  "battery_level": 12
}
```

#### `TAMPER`
```json
{
  "event_uuid": "uuid",
  "event_type": "TAMPER"
}
```

#### `DEVICE_OFF`
```json
{
  "event_uuid": "uuid",
  "event_type": "DEVICE_OFF"
}
```

**Response:**
```json
{
  "id": "uuid",
  "event_uuid": "uuid",
  "event_type": "WEIGHT_READING",
  "compartment_num": 2,
  "raw_payload": {},
  "processed": false,
  "created_at": "2026-05-18T08:01:00Z"
}
```
`status: 201` if new event, `status: 200` if duplicate (already exists).

---

### `GET /devices/{device_id}/commands/`
Poll for pending commands. All returned commands are immediately marked `DELIVERED`.

**Header:** `X-Device-Key: <api_key>`

**Request body:** None

**Response:**
```json
{
  "commands": [
    {
      "command_id": "uuid",
      "type": "ROTATE_TO_COMPARTMENT",
      "payload": { "target_compartment": 3 },
      "status": "DELIVERED",
      "expires_at": "2026-05-18T08:05:00Z",
      "created_at": "2026-05-18T08:00:00Z"
    },
    {
      "command_id": "uuid",
      "type": "PLAY_VOICE_NOTE",
      "payload": {
        "text": "Dawai lene ka waqt ho gaya. Metformin 500mg lein.",
        "compartment": 3
      },
      "status": "DELIVERED",
      "expires_at": "2026-05-18T08:10:00Z",
      "created_at": "2026-05-18T08:00:01Z"
    }
  ]
}
```

Firmware should poll this endpoint every 5–10 seconds while active.

---

## Full Dispenser Workflow (Sequence)

```
Reminder due (Celery)
    │
    ├─► Queue: ROTATE_TO_COMPARTMENT  (if not already aligned)
    ├─► Queue: READ_WEIGHT  phase=before_dose
    └─► Queue: PLAY_VOICE_NOTE

ESP32 polls /commands/ → executes ROTATE
    └─► sends COMPARTMENT_ROTATED event

ESP32 polls /commands/ → executes READ_WEIGHT
    └─► sends WEIGHT_READING  phase=before_dose  (baseline stored)

ESP32 plays voice note

Patient puts hand near lid
    └─► ESP32 sends HAND_DETECTED
            └─► Backend queues OPEN_LID

ESP32 polls /commands/ → opens lid
    └─► ESP32 sends LID_OPENED

Patient takes medicine, lid closes
    └─► ESP32 sends LID_CLOSED
            └─► Backend queues READ_WEIGHT  phase=after_dose

ESP32 reads weight → sends WEIGHT_READING  phase=after_dose
    ├─► Drop >= 50% of expected  →  DoseSession status = taken
    │                                ReminderJob status = TAKEN
    │                                Patient + Caregiver notified ✅
    └─► Drop < 50%               →  DoseSession status = partial
                                     Window stays open

[If 60 min pass with no confirmation]
    └─► Celery check_dose_windows task fires
            ├─► Queue: LOCK_LID
            ├─► DoseSession status = locked
            ├─► Patient notified: "Dispenser lock ho gaya"
            └─► Caregiver notified: "Please unlock karo"

Caregiver calls POST /sessions/{id}/unlock/
    └─► Queue: UNLOCK_LID
            └─► ESP32 opens lid again
```

---

## Error Responses

All errors follow the same shape:

```json
{
  "success": false,
  "code": "NOT_LOCKED",
  "message": "Session is not locked.",
  "data": null
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Missing or invalid token / device key |
| 402 | Premium feature — subscription required |
| 403 | Access denied (wrong caregiver link, device mismatch) |
| 404 | Resource not found |
