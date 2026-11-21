# Garage for Tesla

A 3D dashboard card for Home Assistant that puts your Tesla front and centre: a real 3D model on a glass floor, tinted to match your paint, with the car's status where it belongs and every control one tap away.

> **Not affiliated with Tesla, Inc.** "Tesla", "Model 3" and "Model Y" are trademarks of Tesla, Inc. This is a free community project.

![Garage for Tesla](docs/preview-dark.png)

## What you get

- **3D car** you can rotate, with a reflective glass floor and a background that matches your paint colour.
- **Information on the car itself**: lock state on the roof, frunk and trunk at each end, charging power at the charge port, tyre pressures on a top-down view, battery and range in the header.
- **Live effects on the 3D car**: charging light under the car, Sentry Mode scan, open doors/frunk and low tyres blinking orange, heated seats and heated steering wheel blinking red.
- **Controls menu on the right**, grouped like iOS Settings: security, climate, charging, doors & windows, quick actions. You choose which ones appear.
- **Shortcut row** under the car (lights, horn, climate, windows, frunk… you pick).
- Light and dark mode (follows Home Assistant or set it yourself), Portuguese and English.
- Safety prompts before unlocking or opening the frunk/trunk.

## Works with

The card does not log in to Tesla. It reads the entities that your Tesla integration already created in Home Assistant and finds them automatically:

| Integration | Status |
|---|---|
| [Tessie](https://www.home-assistant.io/integrations/tessie) | Tested |
| [Teslemetry](https://www.home-assistant.io/integrations/teslemetry) | Supported (same entity keys) |
| [Tesla Fleet](https://www.home-assistant.io/integrations/tesla_fleet) | Supported (same entity keys) |
| [Tesla Custom Integration](https://github.com/alandtse/tesla) | Best effort (matched by entity name) |

If something isn't detected, you can point the card to the right entity with `entities:` (see below).

## Install

**Home Assistant 2026.11 or newer (Marketplace)**

1. Settings → Marketplace → **Add from link**
2. Paste `https://github.com/diogopires21-alt/garage-for-tesla` and install **Garage for Tesla**.
3. Reload the browser when asked.

**Older versions (HACS)**: HACS → ⋮ → Custom repositories → add the link above as *Dashboard*.

## Add it to a dashboard

The best fit is a dashboard (or view) in **Panel** mode so the card fills the screen:

1. Create a new dashboard, open a view, set the view type to **Panel (single card)**.
2. Add card → **Garage for Tesla**. Your car is picked automatically.

Minimal YAML:

```yaml
type: custom:garage-for-tesla-card
```

All options:

```yaml
type: custom:garage-for-tesla-card
device_id: 0123456789abcdef          # optional, first Tesla car found if empty
name: K.I.T.T.                       # optional, defaults to the device name
car_model: model3_highland           # model3_highland, model3_classic, modely_juniper
color: pearl_white                   # only colours that exist for the chosen model (see below)
interior: white                      # white or black
theme: auto                          # auto (follow HA), light, dark
shortcuts: [flash, honk, climate, windows, frunk]
menu: [lock, sentry, climate, defrost, seat_fl, seat_fr, charge, charge_port, charge_limit, frunk, trunk, windows, flash, honk]
height: 720px                        # optional, full height by default
confirm: true                        # ask before unlock / frunk / trunk
entities:                            # optional overrides
  battery: sensor.my_car_battery
```

Models and colours (only real factory colours for each one):

| `car_model` | Car | Colours |
|---|---|---|
| `model3_highland` | Model 3 (2024+) | `pearl_white`, `stealth_grey`, `quicksilver`, `diamond_black`, `solid_black`, `ultra_red`, `deep_blue`, `marine_blue` |
| `model3_classic` | Model 3 (2017–2023) | `pearl_white`, `midnight_silver`, `silver_metallic`, `solid_black`, `deep_blue`, `red_multicoat` |
| `modely_juniper` | Model Y (2025+) | `pearl_white`, `stealth_grey`, `quicksilver`, `diamond_black`, `solid_black`, `ultra_red`, `glacier_blue`, `deep_blue`, `marine_blue`, `frost_blue`, `coastal_blue` |

Control keys: `lock, sentry, valet, climate, defrost, steering_heat, steering_level, seat_fl, seat_fr, seat_rl, seat_rr, charge, charge_port, charge_limit, charge_amps, frunk, trunk, windows, flash, honk, wake, homelink, boombox, keyless`.

## Credits

3D models (compressed for the web, rotated and with renamed materials; the paint and seats are recoloured at runtime):

- Model 3 (2024+): ["2024 Tesla Model 3"](https://sketchfab.com/3d-models/2024-tesla-model-3-fd22be415215453693d67e33aa7812d0) by **RBLXSupercars**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Model 3 (2017–2023): ["Tesla M3 model"](https://sketchfab.com/3d-models/tesla-m3-model-3a602469d7874d1397efa67182198705) by **wintrez**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Model Y (2025+): ["2025 Tesla Model Y"](https://sketchfab.com/3d-models/2025-tesla-model-y-619601e7800d418da5922c4fa7833f74) by **BloxBloger**, [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). **Non-commercial use only**: you can use it freely at home, but not in anything sold or used commercially.

Other:

- 3D engine: [three.js](https://threejs.org) (MIT).
- Code: MIT licence.

## Roadmap

- More 3D models (Model Y 2020–2024, Model S, Model X, Cybertruck) so you can pick yours.
- Open windows shown on the 3D model.
- Map card with the car's location.
