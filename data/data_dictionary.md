# Data dictionary

`synthetic_astronaut_health_records.csv` contains fictional demonstration records. It is not an official NASA dataset or real astronaut medical data.

| Column | Meaning | Unit or values |
| --- | --- | --- |
| `record_id` | Unique check-in identifier | Text |
| `astronaut_id` | Fictional crew identifier | Text |
| `mission_day` | Day number in the demo mission | Integer |
| `date` | Check-in date | `YYYY-MM-DD` |
| `heart_rate_bpm` | Heart rate | Beats per minute |
| `blood_pressure_systolic_mmhg` | Systolic blood pressure | mmHg |
| `blood_pressure_diastolic_mmhg` | Diastolic blood pressure | mmHg |
| `blood_glucose_mg_dl` | Blood glucose | mg/dL |
| `body_temperature_c` | Body temperature | °C |
| `sleep_hours` | Self-reported sleep | Hours |
| `mood` | Self-reported mood | `positive`, `neutral`, `low` |
| `radiation_dose_msv` | Optional instrument reading | mSv; blank if not recorded |
| `gravity_phase` | Mission gravity context | `microgravity`, `lunar`, `martian`, `transition`, `not recorded` |
| `exercise_minutes` | Optional exercise log | Minutes |
| `symptoms` | Optional self-reported symptoms | Free text |
| `crew_note` | Optional note for context | Free text |
| `data_type` | Record provenance | Synthetic or user-entered demo |

A radiation dose is environmental context supplied by a sensor or entered for demonstration; it is not a diagnosis or an estimate of a specific health effect. Do not use this prototype to make medical decisions.
