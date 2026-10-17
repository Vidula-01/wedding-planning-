<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require_login_json();

// Prevent PHP warnings/notices from corrupting the JSON response.
ini_set('display_errors', '0');

function jsonRespond(int $code, array $data): void {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$uid = (int)$_SESSION['user_id'];
$root = dirname(__DIR__);

try {
    $pdo = db();

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['view'])) {
        $stmt = $pdo->prepare('SELECT photo_path FROM wedding_details WHERE user_id=:uid LIMIT 1');
        $stmt->execute([':uid'=>$uid]);
        $row = $stmt->fetch();
        $path = (string)($row['photo_path'] ?? '');
        $file = '';
        if ($path !== '') {
            $clean = str_replace(['\\','..'], ['/',''], $path);
            $file = $root . '/' . ltrim($clean, '/');
        }
        if ($file && is_file($file)) {
            $mime = mime_content_type($file) ?: 'application/octet-stream';
            header('Content-Type: '.$mime);
            header('Cache-Control: private, max-age=3600');
            readfile($file);
            exit;
        }
        $default = $root . '/images/profile-default.png';
        if (is_file($default)) {
            header('Content-Type: image/png');
            header('Cache-Control: public, max-age=3600');
            readfile($default);
            exit;
        }
        http_response_code(404); exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonRespond(405,['success'=>false,'message'=>'Method not allowed.']);
    if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) jsonRespond(422,['success'=>false,'message'=>'Please choose an image.']);
    $file=$_FILES['photo'];
    if ($file['size'] > 5*1024*1024) jsonRespond(422,['success'=>false,'message'=>'Photo must be smaller than 5 MB.']);
    $info=@getimagesize($file['tmp_name']);
    if(!$info)jsonRespond(422,['success'=>false,'message'=>'The selected file is not a valid image.']);
    $mime=$info['mime']??'';
    $ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime]??null;
    if(!$ext)jsonRespond(422,['success'=>false,'message'=>'Only JPG, PNG, and WebP images are supported.']);

    $dir=$root.'/uploads/profile';
    if(!is_dir($dir)&&!mkdir($dir,0775,true)&&!is_dir($dir))jsonRespond(500,['success'=>false,'message'=>'Could not create the upload folder.']);
    $name='user_'.$uid.'_'.bin2hex(random_bytes(8)).'.'.$ext;
    $target=$dir.'/'.$name;
    if(!move_uploaded_file($file['tmp_name'],$target))jsonRespond(500,['success'=>false,'message'=>'Could not save the photo.']);
    $public = 'uploads/profile/' . $name;

    // A wedding_details row may already exist with a NULL/empty photo_path.
    // Check whether the ROW exists, not whether the old photo path is non-empty.
    $stmt = $pdo->prepare('SELECT id, photo_path FROM wedding_details WHERE user_id=:uid LIMIT 1');
    $stmt->execute([':uid' => $uid]);
    $existing = $stmt->fetch();

    if ($existing) {
        $old = (string)($existing['photo_path'] ?? '');
        if ($old !== '') {
            $oldClean = str_replace(['\\', '..'], ['/', ''], $old);
            $oldFile = $root . '/' . ltrim($oldClean, '/');
            if (str_starts_with($oldClean, 'uploads/profile/') && is_file($oldFile)) {
                @unlink($oldFile);
            }
        }

        $stmt = $pdo->prepare('UPDATE wedding_details SET photo_path=:photo WHERE user_id=:uid');
        $stmt->execute([':photo' => $public, ':uid' => $uid]);
    } else {
        $stmt = $pdo->prepare('INSERT INTO wedding_details(user_id,photo_path) VALUES(:uid,:photo)');
        $stmt->execute([':uid' => $uid, ':photo' => $public]);
    }
    $url='php/profile_photo.php?view=1&v='.rawurlencode((string)time());
    jsonRespond(200,['success'=>true,'message'=>'Photo updated successfully.','photo_path'=>$public,'photo_url'=>$url]);
} catch(Throwable $e) {
    error_log('[WEDORA profile_photo] '.$e->getMessage());
    jsonRespond(500,['success'=>false,'message'=>'Could not save your photo right now.']);
}
