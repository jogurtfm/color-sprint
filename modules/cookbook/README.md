# Cookbook

Open a recipe as an ordinary Obsidian page, or start **Cook** focus in Color Sprint
to use the same ingredients, steps, temperatures and timers. No special code block,
JSON, app editor or hidden database is needed to write a recipe.

## Recipes

- [[Recipes/Argentine Shrimp|Garlic-Butter Argentine Red Shrimp]]
- [[Recipes/Stuffed Bell Pepper chicken|Cheesy Chicken-Stuffed Bell Peppers]]

## Add a recipe by hand

1. Copy [[Recipe Template]] into **Recipes/** and give the note any filename.
2. Change the heading and `Recipe ID:`. IDs use lowercase letters, digits and
   hyphens and must be unique, for example `lemon-shrimp`.
3. List ingredients as ordinary Markdown bullets under `## Ingredients`.
4. Under `## Steps`, make one `### Step title` heading per step, with plain
   instructions below it. Step headings must be distinct within a recipe.
5. Optional: add `Temperature: ...` and `Timer: 5 min` to a step. Both are displayed
   exactly from your note. Supported timers: `90 sec`, `5 min`, `1.5 min`, `1 hr`,
   or `00:05:00` (hours:minutes:seconds), up to 24 hours. Omit Timer or use `0 min`
   for an untimed step. Do not put an estimated time in place of a missing recipe.
6. Set `Status: Ready` when the recipe is complete. Leaving `Status: Draft` keeps
   the draft warning. Servings and notes are optional. Keep your own source link
   in `## Notes` if the recipe came from somewhere else.

Refresh while in Cook focus, or wait about three seconds. New/edited notes load
automatically. Readable plain text is used in the interface, not executable HTML
or remote content. A bad recipe is flagged without hiding the others.

## Timers and checkmarks

Cooking timers are **independent of focus**: pausing focus does not pause cooking.
Each timed step has Start, Pause/Resume, +1 min, Reset and Cancel controls. More
than one step/recipe may run; a timer tray keeps them visible. Time reached is
not evidence of doneness, task completion, or XP. Use the recipe and a food
thermometer, not the timer alone, to decide whether food is cooked.

Timers and preparation checkmarks are app/device-local conveniences. They do not
rewrite recipe notes or the shared task tracker and do not sync between iPhone,
PC Obsidian and HUD. They restore from this app's local storage if available,
using real elapsed time. Editing a recipe invalidates its old local state rather
than attaching an old timer to changed instructions. Storage failures are shown.
If the app is suspended or closed, alarms/sounds are not reliable, especially on
iPhone. Use the iPhone Clock app for safety-critical cooking alarms. Reopening
shows overdue timers; no guaranteed background notification is implied.

You can switch recipes without losing running timers. Keep the Cook workspace
open for foreground alerts; leaving focus closes the visible workspace and stops
its foreground alert loop. Returning restores retained timers. Ingredient/step
checks here are a personal prep checklist, not the Cook task's completion state.

The two starter recipes come from the user's supplied Markdown. Source cooking
ranges and optional ingredients remain in the notes. Timers use the lower bound
of a range as the first check, not a promise that the food is finished. The blank
template remains Draft until filled in. No servings have been guessed.
