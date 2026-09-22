<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - log out and return to the home page
   ========================================================== */

session_start();
$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $p['path'], $p['domain'], (bool)$p['secure'], (bool)$p['httponly']);
}

session_destroy();

header('Location: ../index.html');
exit;
