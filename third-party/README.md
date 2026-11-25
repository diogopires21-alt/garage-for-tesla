# Third-party material

The MIT licence in [`LICENSE`](../LICENSE) covers the code of this project. The material below was made by other people, keeps its own licence and is NOT covered by the MIT licence.

## 3D car models (`dist/*.glb`)

- `dist/garage-for-tesla-model3-highland.glb`: "2024 Tesla Model 3" by RBLXSupercars
  (https://sketchfab.com/3d-models/2024-tesla-model-3-fd22be415215453693d67e33aa7812d0),
  CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- `dist/garage-for-tesla-model3-classic.glb`: "Tesla M3 model" by wintrez
  (https://sketchfab.com/3d-models/tesla-m3-model-3a602469d7874d1397efa67182198705),
  CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- `dist/garage-for-tesla-modely-juniper.glb`: "2025 Tesla Model Y" by BloxBloger
  (https://sketchfab.com/3d-models/2025-tesla-model-y-619601e7800d418da5922c4fa7833f74),
  CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/) - **non-commercial use only**.
- `dist/garage-for-tesla-modely-classic.glb`: "Tesla Model Y 2021" by 763468712
  (https://sketchfab.com/3d-models/tesla-model-y-2021-c0a86cac582d4b33aba0fb1b1912d970),
  CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Also modified: holes in
  the paint filled, inward-facing panels flipped, glass made see-through, a centre
  screen added and the mesh simplified.

All were compressed (meshopt/WebP), rotated, and had materials renamed or split
(lights, seats); the paint and seat colours are changed at runtime.

The same files are kept, before the build, in `src/*.glb` and `models/src/` (and, encoded, in
`mock/car-model*.js`), under the same licences.

## Font

The font embedded in the card for the energy written on the floor (`src/floorfont.js`) is a
subset of Inter Light, Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter),
licensed under the SIL Open Font License 1.1 - see [Inter-OFL.txt](Inter-OFL.txt). It is NOT covered
by the MIT licence.
