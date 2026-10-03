# WEDORA - Fixed Project

## What was fixed
- Unified the authenticated pages with the Dashboard colour palette and sidebar.
- Removed the FQA/FAQ item from the authenticated sidebar.
- Added working links for Dashboard, Wedding Details, Tasks, Budget, Vendors, Guests and Profile on every authenticated page.
- Kept a Log out button at the bottom of every authenticated sidebar.
- Fixed the Dashboard JavaScript syntax error that prevented the dashboard from loading.
- Made Tasks strictly user-specific; no demo/null-user tasks are inserted.
- Made Vendors strictly user-specific.
- Made Guests session-based and user-specific.
- Made Budget expenses update `wedding_details.spent_budget`, so Dashboard budget spending updates from Budget changes.
- Dashboard now calculates confirmed guests and saved vendors from the actual child tables.
- Dashboard budget uses Budget items when available and falls back to Wedding Details budget values.
- Rebuilt Profile to match the supplied reference layout.
- Profile now loads/saves full name, email and phone.
- Profile photo can be selected and uploaded to `uploads/profile/` and its path is stored in `wedding_details.photo_path`.
- Added working Change Password backend.
- Removed the broken reference to the missing `css/shell.css` file.

## Setup
1. Copy this project into `xampp/htdocs/Wedora`.
2. Start Apache and MySQL in XAMPP.
3. Import `database/wedora.sql` into phpMyAdmin.
4. Check `php/config.php` if your MySQL username/password differs from the default XAMPP setup.
5. Open `http://localhost/Wedora/`.

The project is intended to be used through Apache/PHP, not by opening the HTML files directly with `file://`.
