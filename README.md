# WEDORA — Home page

The all-in-one wedding planning app for Sri Lankan couples.

## What was added

| File | Purpose |
|---|---|
| `index.html` | The home page (hero, features, steps, about, FAQ, CTA, footer, Learn More popup) |
| `css/home.css` | Styles for the home page only — `css/style.css` is untouched, so login and register still look the same |
| `js/home.js` | Hero slideshow, Learn More popup, FAQ accordion, mobile menu, live stats, newsletter |
| `php/home_data.php` | Reads the live registered-couple count and the current session from the database |
| `php/subscribe.php` | Saves newsletter emails into `newsletter_subscribers` |
| `php/logout.php` | Ends the session and returns to the home page |
| `images/hero-1.jpg`, `images/slide-2…5.jpg` | Five 1920×880 hero photos of the couple in the blush / maroon palette |
| `images/hero-3.jpg` | The floral image used in the About section |

## Where the buttons go

| Control | Goes to |
|---|---|
| **Login** (header) | `login.html` |
| **Get Started** (header) | `register.html` |
| **Start Planning Now** (hero) | `register.html` |
| **Learn More** (hero) | Opens a popup describing WEDORA — closes with the ✕, the backdrop, or the Esc key |
| **Start planning now** (inside the popup) | `register.html` |

## Hero photo slideshow

Five photos of the couple crossfade automatically **every 3.5 seconds**, each
with a slow zoom. All five share the original blush / maroon / cream palette.

1. `hero-1.jpg` — the original photo, widened to the hero frame
2. `slide-2.jpg` — the couple on a blush garden background
3. `slide-3.jpg` — the couple on an ivory floral background
4. `slide-4.jpg` — mirrored, on a dusty rose background
5. `slide-5.jpg` — the couple on a soft peony background

The couple was cut out of the original photo and placed onto each background,
so every slide shows them and nothing clashes with the palette.

### Changing the photo with the mouse

- **Arrows** appear on the left and right of the hero when you move the mouse
  over it — click to go back or forward.
- **Dots** under the hero jump straight to any photo.
- **Drag or swipe** across the hero to move one photo either way.
- **Left / right arrow keys** work once an arrow or dot has focus.

Any manual change restarts the 3.5-second clock, so the photo you picked gets a
full turn before the slideshow carries on by itself. Auto-play does not run for
visitors who have "reduce motion" switched on, but the controls still work.

**To use your own photos:** replace the files in `images/` keeping the same file
names, or edit the five `background-image` URLs near the top of `index.html`.
Keep them around **1920×880** with the couple on the right and the left third
fairly plain, so the headline stays readable.

## Database setup (XAMPP)

1. Copy the whole folder into `C:\xampp\htdocs\wedora`.
2. Start **Apache** and **MySQL** in the XAMPP control panel.
3. Open phpMyAdmin → **Import** → choose `database/wedora.sql` → **Go**.
   This creates `wedora_db` with `users`, `user_sessions`,
   `newsletter_subscribers` and `password_reset_tokens`.
4. Open <http://localhost/wedora/index.html>.

Database settings live in `php/config.php` (default XAMPP values: user `root`,
empty password). Change them there if your MySQL differs.

### What the home page reads and writes

- **Reads** the number of rows in `users` and shows it under "Couples planning".
- **Reads** the PHP session — once you log in, the header swaps *Login / Get
  Started* for your name and a *Log out* button.
- **Writes** newsletter emails to `newsletter_subscribers`.

If MySQL is not running, every endpoint falls back to the CSV files in
`database/` instead of failing, so the page still works.

> Open the site through `http://localhost/...`, not by double-clicking the HTML
> file. Opening it as `file://` means PHP never runs, so the live count and the
> newsletter form cannot reach the database.

## Other changes

`js/login.js` used to redirect to `dashboard.html`, which does not exist yet.
It now returns to `index.html` after a successful login.
