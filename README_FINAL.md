# WEDORA Final Fixed Build

## Setup
1. Copy this folder into `xampp/htdocs/Wedora/`.
2. Start Apache and MySQL in XAMPP.
3. Import `database/wedora.sql` into phpMyAdmin.
4. Open `http://localhost/Wedora/`.
5. Use the website through Apache; do not open HTML files directly with `file://`.

## Dashboard connections
- Tasks completed comes from the logged-in user's `tasks` records.
- Budget spent comes from the logged-in user's `budget_items.actual` values.
- Guests confirmed comes from `guests.rsvp = 'Confirmed'`.
- Vendors saved comes from the logged-in user's `vendors` records.
- Upcoming payments comes from the logged-in user's `payments` records with `status = 'upcoming'`.

## Profile photo
Profile photos are stored under `uploads/profile/` and served through `php/profile_photo.php`, so the image URL works correctly even when the project is installed inside a local subfolder.
