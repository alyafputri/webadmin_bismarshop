<?php
// public/api/customer-addresses/index.php
// REST endpoint for Customer Addresses used by public/script.js

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// --- DB connection (reuse same DSN as product-vouchers) ---
$dsn = 'mysql:host=127.0.0.1;dbname=bismarshop;charset=utf8mb4';
$user = 'root';
$pass = '';

try {
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'DB connection failed', 'error' => $e->getMessage()]);
  exit;
}

// Ensure table exists0
$pdo->exec("CREATE TABLE IF NOT EXISTS addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  label VARCHAR(100) NULL,
  recipient_name VARCHAR(150) NULL,
  phone VARCHAR(50) NULL,
  province VARCHAR(100) NULL,
  city VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

function jsonBody(): ?array {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') return null;
  $d = json_decode($raw, true);
  return is_array($d) ? $d : null;
}

function nowStr(): string { return date('Y-m-d H:i:s'); }

$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$segments = array_values(array_filter(explode('/', $pathInfo)));
$addressId = isset($segments[0]) ? (int)$segments[0] : null;
$subAction = isset($segments[1]) ? $segments[1] : null; // e.g. 'default'

// Fallback: allow id and action via query string (for servers not exposing PATH_INFO)
if (!$addressId && isset($_GET['id'])) {
  $addressId = (int)$_GET['id'];
}
if (!$subAction && isset($_GET['action'])) {
  $subAction = $_GET['action'];
}
$method = $_SERVER['REQUEST_METHOD'];

$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

try {
  // Simple count/health check
  if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'count') {
    if ($userId) {
      $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM addresses WHERE user_id = :uid');
      $stmt->execute([':uid' => $userId]);
      $row = $stmt->fetch();
      echo json_encode(['success' => true, 'count' => (int)($row['c'] ?? 0)]);
      exit;
    } else {
      $row = $pdo->query('SELECT COUNT(*) AS c FROM addresses')->fetch();
      echo json_encode(['success' => true, 'count' => (int)($row['c'] ?? 0)]);
      exit;
    }
  }

  if ($method === 'GET') {
    if (!$userId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'user_id is required']); exit; }
    $stmt = $pdo->prepare('SELECT * FROM addresses WHERE user_id = :uid ORDER BY is_default DESC, id ASC');
    $stmt->execute([':uid' => $userId]);
    $rows = $stmt->fetchAll();
    echo json_encode(['success' => true, 'addresses' => $rows]);
    exit;
  }

  if ($method === 'POST' && !$addressId) {
    if (!$userId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'user_id is required']); exit; }
    $d = jsonBody() ?? [];
    if (!isset($d['address_line1']) || trim($d['address_line1']) === '') {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'address_line1 is required']);
      exit;
    }

    $isDefault = !empty($d['is_default']);
    if ($isDefault) {
      $stmt = $pdo->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = :uid');
      $stmt->execute([':uid' => $userId]);
    }

    $stmt = $pdo->prepare('INSERT INTO addresses (user_id, label, recipient_name, phone, province, city, district, postal_code, address_line1, address_line2, latitude, longitude, is_default, created_at, updated_at)
      VALUES (:user_id, :label, :recipient_name, :phone, :province, :city, :district, :postal_code, :address_line1, :address_line2, :latitude, :longitude, :is_default, :created_at, :updated_at)');
    $stmt->execute([
      ':user_id' => $userId,
      ':label' => $d['label'] ?? null,
      ':recipient_name' => $d['recipient_name'] ?? null,
      ':phone' => $d['phone'] ?? null,
      ':province' => $d['province'] ?? null,
      ':city' => $d['city'] ?? null,
      ':district' => $d['district'] ?? null,
      ':postal_code' => $d['postal_code'] ?? null,
      ':address_line1' => $d['address_line1'],
      ':address_line2' => $d['address_line2'] ?? null,
      ':latitude' => isset($d['latitude']) && $d['latitude'] !== '' ? $d['latitude'] : null,
      ':longitude' => isset($d['longitude']) && $d['longitude'] !== '' ? $d['longitude'] : null,
      ':is_default' => $isDefault ? 1 : 0,
      ':created_at' => nowStr(),
      ':updated_at' => nowStr(),
    ]);
    $newId = (int)$pdo->lastInsertId();

    $stmt = $pdo->prepare('SELECT * FROM addresses WHERE id = :id');
    $stmt->execute([':id' => $newId]);
    $row = $stmt->fetch();

    echo json_encode(['success' => true, 'id' => $newId, 'address' => $row]);
    exit;
  }

  // Set default: support either POST /:id/default?user_id=... or POST ?id=..&action=default&user_id=..
  if ($method === 'POST' && $addressId && $subAction === 'default') {
    if (!$userId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'user_id is required']); exit; }
    // Ensure address belongs to user
    $stmt = $pdo->prepare('SELECT user_id FROM addresses WHERE id = :id');
    $stmt->execute([':id' => $addressId]);
    $row = $stmt->fetch();
    if (!$row || (int)$row['user_id'] !== $userId) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Address not found']); exit; }

    $pdo->beginTransaction();
    $pdo->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = :uid')->execute([':uid' => $userId]);
    $pdo->prepare('UPDATE addresses SET is_default = 1, updated_at = :ts WHERE id = :id')->execute([':id' => $addressId, ':ts' => nowStr()]);
    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Default address updated']);
    exit;
  }

  // Delete: support DELETE /:id?user_id=.. or POST ?id=..&action=delete&user_id=..
  if (($method === 'DELETE' && $addressId) || ($method === 'POST' && $addressId && $subAction === 'delete')) {
    if (!$userId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'user_id is required']); exit; }
    // Ensure address belongs to user
    $stmt = $pdo->prepare('SELECT user_id FROM addresses WHERE id = :id');
    $stmt->execute([':id' => $addressId]);
    $row = $stmt->fetch();
    if (!$row || (int)$row['user_id'] !== $userId) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Address not found']); exit; }

    $stmt = $pdo->prepare('DELETE FROM addresses WHERE id = :id');
    $stmt->execute([':id' => $addressId]);
    echo json_encode(['success' => true, 'message' => 'Address deleted']);
    exit;
  }

  http_response_code(405);
  echo json_encode(['success' => false, 'message' => 'Method not allowed']);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) { $pdo->rollBack(); }
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Server error', 'error' => $e->getMessage()]);
}
