# Pillar Flow

Field log for concrete pillars — Captured Reality Inc., San Ignacio, Belize.

Load a job's DXF on the phone, drop a pillar on every corner, and log each one as
the crew plants it. Everything is saved on the phone first, so it works with no
signal, and syncs when there is one.

**This repository holds only the built app**, so that GitHub Pages can serve it.
Source, database setup and design notes live in a private repository.

Open it at **https://lilmmyers1.github.io/pillar-flow-app/**, then *Add to home
screen* in Chrome.

Signing in needs an account on the firm's own system; without one the app does
nothing. The Supabase URL and publishable key in the page are not secrets — every
row policy requires an authenticated user, and the key alone returns 401 on every
table.

Imagery is Esri World Imagery (Maxar, Earthstar Geographics and the GIS
community), shown for orientation only and not survey-grade.
