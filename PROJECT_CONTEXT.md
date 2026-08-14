# Project Context

This file captures the main product, architecture, and design decisions for the Assistant Coach app so future Codex sessions can get up to speed without relying on a very long chat history.

## App Goal

Assistant Coach is an Expo React Native app for amateur football coaches. It helps manage:

- Players
- Training attendance
- Matchday setup
- Match results and player statistics
- Team settings, kit design, and shareable lineup/result images

The user is an experienced React web developer learning React Native, so changes should stay scalable, typed, and beginner-friendly.

## Tech Stack

- Expo SDK 56
- React Native
- TypeScript
- Expo Router
- SQLite via `expo-sqlite`
- `react-native-svg` for kit and overlay artwork
- `expo-image` for image assets
- `react-native-view-shot` and `expo-sharing` for exporting/shareable match images

Important local instruction from `AGENTS.md`: read the exact Expo SDK 56 docs before writing code.

## Architecture Preferences

Keep screens reasonably thin and move feature logic into feature folders where possible.

Current rough structure:

- `src/app/`: Expo Router screens
- `src/features/players/`: player data, types, repositories
- `src/features/events/`: training events, attendance, event components
- `src/features/match-day/`: matchday persistence and types
- `src/features/player-stats/`: player statistics repository/types
- `src/features/settings/`: team settings repository/types
- `src/features/share/`: share poster background and overlay positioning data
- `src/db/`: SQLite setup/schema
- `src/constants/theme.ts`: shared layout/theme constants

## Product Scope Decisions

### Players

- Player names are validated to prevent numbers and excessive invalid input.
- Players can be added, edited, and deleted.
- Player cards include icon-only edit/delete buttons.
- Player stats are shown via a player statistics modal from the player card.
- There is also a full-height team statistics modal opened from the players screen.

### Training

- The old generic Events tab has been simplified into training.
- Team/social events were removed for now.
- Training attendance defaults players to `available`.
- Training events can be created and later have attendance filled in.

### Matchday

The matchday flow is intentionally staged:

1. Match information
   - Opponent
   - Date/time
   - Home/away
   - Category: league, cup, friendly
   - Notes
   - Venue field was removed for match setup; home location comes from team settings.

2. Availability
   - Players default to available.
   - Coach can mark players unavailable.
   - Captain can be selected.
   - Up to two match duty players can be selected.
   - Match duty is the English equivalent chosen for Dutch "corvee".
   - If fewer than 11 players are available, show a warning.

3. Formation builder
   - Formation picker plus pitch view.
   - Only available players appear for assignment.
   - Players can be assigned to starting XI and substitutes.
   - There are seven substitute slots.
   - Assigned players show a kit with kit number and name.
   - Names prefer nickname if enabled in settings, otherwise first name.
   - Captain badge should sit on the top-right of the jersey, not inline with the name.
   - Goalkeeper jersey is black by default with white number.
   - Players can be moved/swapped by drag and drop.
   - Scrolling should be managed carefully around drag/drop.
   - Formation changes preserve players by numbered slots as much as possible.

4. Review
   - Shows opponent, date/time, home/away, formation, starting XI on pitch, substitutes.
   - Buttons: back/edit, share, save.

5. Match result wizard
   - Step 1: score.
   - Step 2: player stats.
   - Goals and assists are capped by the team score.
   - If trying to exceed the cap, show a warning.
   - Minutes played is an input field with steppers, because amateur players may sub off and back on.
   - Default minutes:
     - Starters: match duration from settings.
     - Substitutes: 0.
   - Rating defaults to 6.
   - Cards, goals, assists, attendance, lateness, no-show, and substitute involvement are captured.

### Match Overview

- Matches are sorted by date, most recent first.
- There are collapsible sections for unfinished and completed matches.
- The unfinished section only appears when there are unfinished matches.
- Unfinished match cards show an orange notification dot 3 hours after match start.
- Expanded match cards show a lineup/review style pitch.
- Expanded cards include edit, delete, and share actions.
- Delete requires a warning confirmation.

## Kit Settings

Team settings include:

- Team name
- Club/home location
- Match duration minutes
- Training days and default training time
- Prefer nicknames vs first names
- Fine jar enabled toggle for future use
- Kit design and colours

Kit colours:

- Primary: base/outfield kit colour
- Secondary: second kit colour
- Third colour: stored as `thirdKitColor`; used by sash and three-colour stripes
- Kit number colour
- Goalkeeper kit colour

Kit designs:

- Regular
- Stripes
- Three colour stripes
- Hoops
- Two colour sash
- Halves
- Sides

Important kit design details:

- The jersey should remain an SVG/CSS-style shirt, not a PNG, so colours can be customized later.
- Current jersey shape was iterated to look like a simple shirt outline with narrower sleeves and wider torso.
- Number is positioned higher on the kit and has a contrasting outline/shadow.
- For `three colour stripes`, the source of truth for stripe positioning was last adjusted in `src/app/settings.tsx`. Keep the other renderers in sync:
  - `src/app/index.tsx`
  - `src/app/match-day.tsx`
  - `src/app/share-position-playground.tsx`

## Shareable Match Images

The shareable image feature is important. It is used for pre-match lineups and post-match results.

Implementation:

- `react-native-view-shot` captures the poster view.
- `expo-sharing` opens the native share sheet.
- The exported image should have square corners, not rounded corners.
- The preview can be inside a modal, but the captured poster frame itself should not use rounded corners.

Backgrounds:

- Backgrounds are stored in `assets/images/match-day/`.
- Background metadata is in `src/features/share/share-background-templates.ts`.
- Backgrounds include amateur/stadium day/night variants.
- Positioning was tuned manually and should not be casually reset.

Overlays:

- Overlay positioning is in `src/features/share/share-poster-overlays.ts`.
- There are at least two overlay styles:
  - `classic`
  - `broadcast`
- The playground route is useful for positioning overlays and should remain available for now.
- Assistant Coach logo is included in the shareable image with a subtle 10% opaque background.

Share image colour rules:

- If the kit has a third colour:
  - Home/YOUR TEAM title panel uses third colour.
  - Opponent panel uses secondary colour.
  - Location panel uses primary colour.
- If the kit only has two colours:
  - YOUR TEAM panel uses primary.
  - Opponent and location panels use secondary.
- Text is white unless the panel background is white or yellow, then use black.
- In broadcast overlay, score panel colour follows the actual team:
  - If your team is home, home score panel uses YOUR TEAM/title colour.
  - If your team is away, away score panel uses YOUR TEAM/title colour.
  - Opponent score uses opponent/value colour.

Share image colour picker:

- Uses preset swatches only.
- Custom hex input was removed because most users will not know hex codes.
- Swatches include white, black/dark, green, blue, purple, light blue, orange, red, burgundy, yellow.

Share poster substitute details:

- In classic overlay, the substitute section was moved down 15px to avoid goalkeeper name overlap.
- Green sub-on icon appears beside substitute names only if the substitute has `minutesPlayed > 0`.
- Sub icon positioning is in `SharePosterTextLayer` in `src/app/match-day.tsx`.

Badge placement:

- The user manually tuned compact jersey result badge placement and likes it.
- Avoid changing compact badge placement unless explicitly asked.
- Goals/assists:
  - If count is 3 or less, show individual icons.
  - If count is more than 3, show a single icon with the number.
  - Number should sit above the icon with higher z-index.
- Assist, goal, card, sub-on, sub-off icons are image assets in `assets/images/match-day/`.

## Player Statistics

Player statistics are currently considered good.

Important stats:

- Training attendance percentage
- Match attendance percentage
- Lateness percentage
- Average minutes
- Goals
- Assists
- Average rating
- Last 5 ratings with colours:
  - 8+ green
  - 5-7 yellow
  - 4 or lower red
- Team/social events were moved out of core football attendance stats.

The old overall football attendance percentage was removed because it felt less useful than separate training and match percentages.

## Design Preferences

General:

- Keep interfaces practical and coach-friendly.
- Avoid clutter and overly explanatory in-app text.
- Use buttons/icons where appropriate.
- Use `PageTopPadding` consistently for page top spacing.
- Cards should not be too rounded.
- Matchday/share visuals can be more expressive.

Modals:

- Modals should keep a visible background, currently using `ModalBackgroundColor`/whitesmoke-like background.

Buttons:

- Icon-only buttons are acceptable where clear.
- Edit usually uses warning/yellow.
- Delete uses error/red.
- Add buttons should use actual icon plus symbol, not plain `"+"`, where already established.

## Data/Persistence Notes

- Data is local SQLite on the device.
- Existing discussion: cloud sync is not implemented yet.
- Device OS backups may help if app data is included, but this should be confirmed before launch.
- Cloud sync would be a future larger feature.

## Future Ideas

- Finish share image polish and export flows as needed.
- Add actual social/share variants for pre-match lineup and post-match result.
- Fine jar.
- Push notifications for training days/times.
- Cloud sync or backup strategy.
- More coach settings/preferences.
- Match result social media templates.
- More kit designs and club branding.

## Important Maintenance Notes

- Do not revert user edits unless explicitly asked.
- The user often manually tunes visual coordinates. If they say they fixed positioning in one file, treat that file as source of truth and copy values elsewhere.
- For share-image/kit changes, check all renderers:
  - `src/app/settings.tsx`
  - `src/app/index.tsx`
  - `src/app/match-day.tsx`
  - `src/app/share-position-playground.tsx`
  - `src/features/share/share-poster-overlays.ts`
  - `src/features/share/share-background-templates.ts`
- Always run:
  - `npx tsc --noEmit`
  - `npm run lint`
