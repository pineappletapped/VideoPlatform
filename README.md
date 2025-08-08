# VideoPlatform

This project is a web app for managing live graphics, video and music playback. Everything lives under `wwwroot` so it can run from nearly any host that can execute PHP.

Uploaded media is stored on the server under `wwwroot/uploads` while metadata lives in Firebase Realtime Database.

## Running locally

Use PHP's built‑in server:

```bash
php -S localhost:8080 -t wwwroot
```

Make sure the `wwwroot/uploads` directory exists and is writable (e.g. `chmod 777 wwwroot/uploads`). After starting the server open `http://localhost:8080/app/index.html` to access the dashboard. The root `index.html` now shows a marketing page.

## Marketing Landing Page

Visiting the site root displays a sales page highlighting what the graphics package can do. It outlines core features, pricing tiers and is styled with Tailwind CSS. Use the **Login** button on that page to access the dashboard.

## Login & Events

The dashboard lives under `app/index.html`. Sign up or log in and create events. Each
event row offers links to the main control panel, a simplified **Graphics** panel,
the listener and the overlay page. Login sessions last for eight hours and are
required for all control panels, but the overlay page itself stays public so it
can be embedded in OBS without timing out.

Sports events now support **Tournament Mode** when creating an event. Enable
this to manage a pool of teams. The **Teams** tab in the graphics panel lets you
select which two teams are playing via dropdowns and edit each team from a list.

If Firebase registration isn't available you can log in using the built‑in admin
account `ryanadmin` with password `password`.

### Subscriptions with Square

When new users register they must pick one of the available billing tiers and
enter their card details. The form uses Square's Web Payments SDK and sends a
nonce to `create-subscription.php` which creates a customer, stores the card on
file and starts a subscription for the chosen plan. The script requires a
`square-config.php` file with your access token, location ID and plan IDs. A
sample is provided as `square-config.sample.php`.

Only accounts with an active subscription can access the dashboard or control
panels. The default `ryanadmin` account bypasses this check for local testing.
Create a `squareConfig.js` file next to `index.html` with your Square
Application ID, location ID and plan IDs based on the `squareConfig.sample.js`
template.

### Optional ATEM bridge

If you need to control a Blackmagic ATEM switcher, generate and run the Python
script shown under **Add ATEM** in `listener.html`. It simply bridges WebSocket
messages from the app to the ATEM using [PyATEMMax]. Run it with Python 3:

```bash
python3 wwwroot/atem_websocket_bridge.py
```

### VT preloading

When you load a VT clip in the control panel, the overlay automatically
preloads the video. Once the clip can play all the way through, the overlay
sets `status/<event>/vtReady` to `true`. The input sources bar highlights the
VT button with a green outline when the clip is buffered and ready to play.

### Graphics-only panel

Use the **Graphics** link from the dashboard if you only need to operate the
overlay. This stripped down panel removes OBS and ATEM options and embeds side‑by‑side Preview and Program monitors so you can rehearse a graphic before taking it live.

### Preview workflow

Each graphic item has **Preview** and **Live** buttons. Previewing sends the
graphic only to the left monitor, allowing you to check positioning. Taking it
live removes it from preview and displays it in the right monitor as well as on
`overlay.html`. The **Cut** button above the preview monitor promotes anything in
preview to live in one click.

### Admin panel & billing

Logging in as `ryanadmin` reveals an **Admin** button on the dashboard. This
opens a simple admin panel showing all users and their billing tier. Plans are:

- **bronze** – Bronze £3.75/month (1 event)
- **silver** – Silver £6/month (3 events)
- **gold** – Gold £15/month (8 events)

Regular users can manage their default branding from **Brand Settings** in the
account menu. Uploaded logos are stored under `uploads/user_<id>/branding/`.

### Sponsorship

Events can manage sponsor logos from the **Sponsors** tab in either the sports
admin page or the graphics control panel. Upload sponsors with names, colours
and logos then assign them to placements such as above or below the scoreboard,
the bottom of formation graphics or any screen corner. The app logs whenever a
sponsor is shown or hidden so you can review exposure reports later.

### Active & Favourite Graphics

Each graphic in the control panel has a ★ button to mark it as a favourite.
Favourites appear under the **Favourites** tab in the Active Graphics panel
for quick access. The **Active** tab lists anything currently visible so you
can hide them in one click.

### Lineup Tables & Match Results

The Lineups panel now offers **Table** buttons to show each team's roster in a
simple list overlay. There's also a **Match Result** button that displays the
final score along with goal scorers and times based on the scoreboard log.

### Match Logs & Real-time Clocks

The scoreboard timer now runs client-side. Starting the clock records a start
timestamp so overlay pages keep counting without constant database updates. The
Scoreboard panel also includes **Match Log** buttons to record goals,
substitutions and penalties with the current time. These entries can be shown as
an overlay via the **Show Log** button.

### Sport-specific scoreboards

Each sport can now define its own scoreboard layout and stylesheet. Football was
the first sport to use this modular approach, and rugby now joins it with
dedicated JavaScript and CSS templates that mirror traditional broadcast
scorebugs, including try/convert/penalty breakdowns. Hockey now has a tailored
module with period tracking and shots-on-goal summaries, and ice hockey adds
power-play indicators alongside SOG stats. Boxing introduces a ring-style bug
with round and clock readouts, while darts shows remaining points with sets and
  legs tracking plus a throw indicator. Tennis displays sets, games and points
  with serve markers, snooker tracks frames, breaks and high breaks for each
  player, table tennis shows games and points with a serve indicator, pool
  displays rack counts with a break marker, basketball tracks quarters with a
  game clock, netball highlights centre passes along with the timer, volleyball
  tracks sets and rally points with a serve marker, and badminton shows games
  and points with service indicators.

### Tournament Panel

When an event is created in **Tournament Mode** an extra tab appears in the
Graphics panel. The **Tournament** tab lets you list all the match-ups,
configure scoring for wins, draws and losses and show individual match results
as an overlay.

### Sport-specific Scoreboards

Each sport can now define its own scoreboard styles. Darts scoreboards track
every throw and automatically deduct scores. The panel keeps a running 3‑dart
average, counts 180s, 140s and 100+ scores and records the highest checkout of
the match. Use the **New Leg** button to reset both players to 301 or 501 as
configured.

Cricket mode offers a dedicated scoreboard showing runs, wickets and overs for
both sides plus a secondary bar for run rate, target and required rate, closely
matching the detail seen on Sky Sports broadcasts. Choose between this and the
regular styles from the options modal. Tennis bugs show set and game progression
with serve indicators, while snooker displays frame scores, current breaks and
highest breaks. Golf introduces a leaderboard-style bug that highlights the course name and player totals, and the intro panel now includes an intuitive course editor for tees, yardages and pars. Baseball scorebugs track the inning along with pitch count, outs and base runners, American football layouts pair quarter and game clock readouts with gridiron-themed styling, volleyball scoreboards show set tallies with rally points and a serve indicator, and badminton boards display games and points in a familiar tournament format.

### Logo Stingers

All events include a **Stinger** tab letting you quickly display a fullscreen
logo for scene transitions. Choose from your event branding logos, the
currently selected team logos or any uploaded sponsors.

### Expanded Sports Offering

The platform now includes presets for additional sports beyond the original
set. Each one comes with sensible defaults for team sizes, positions and
scoreboard layouts. Newly added sports are:

- **Baseball** – nine innings with simple run tracking
- **American Football** – four quarters with touchdown, field goal and extra
  point buttons
- **Volleyball** – best-of-five sets with point scoring
- **Badminton** and **Squash** – games and points for singles matches
- **Gaelic Football** and **Hurling** – standard GAA scoring with goals worth
  three points

These join football, rugby, hockey, cricket and many more so you can tailor
graphics to most competitions. Motorsports and horse racing will be handled in
a future update as they require external timing feeds.

### Commentator & Speakers Pages

Sports events now provide a **Commentator** page from the dashboard. A scoreboard and game clock sit at the top of the page with two columns below – one for each team.  Each column has tabs for **Players**, **Formation**, **Stats** and **Log** so commentators can quickly reference line‑ups, formations, player stats and a filtered match log.

Corporate events instead include a **Speakers** page. Presenters can upload a PDF or PowerPoint file, step through the slides and add notes. The graphics operator can show the presentation fullscreen or as a PiP overlay via the new Presentation panel.
Each event row on the dashboard now includes buttons linking directly to the Commentator or Speakers page as appropriate so staff can open them quickly.
