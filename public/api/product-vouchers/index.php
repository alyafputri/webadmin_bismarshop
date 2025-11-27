<?php
// public/api/product-vouchers/index.php
// REST endpoint for Product Vouchers used by public/script.js

header('Content-Type: application/json');
// Adjust CORS for your environment
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// --- DB connection ---
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

// --- Utilities ---
function camelizeVoucher(array $row): array {
  // Map snake_case DB columns to camelCase expected by frontend
  return [
    'id' => (int)$row['id'],
    'code' => $row['code'],
    'name' => $row['name'],
    'description' => $row['description'],
    'type' => $row['type'] === 'fixed' ? 'fixed_amount' : $row['type'], // frontend may use 'fixed_amount'
    'value' => is_null($row['value']) ? null : (float)$row['value'],
    'maxDiscount' => is_null($row['max_discount']) ? null : (float)$row['max_discount'],
    'targetType' => $row['target_type'],
    'targetId' => is_null($row['target_id']) ? null : (int)$row['target_id'],
    'targetName' => $row['target_name'] ?? null, // may be null; UI will show 'Unknown'
    'minPurchase' => is_null($row['min_purchase']) ? 0 : (float)$row['min_purchase'],
    'usageLimit' => is_null($row['usage_limit']) ? null : (int)$row['usage_limit'],
    'usageCount' => is_null($row['usage_count']) ? 0 : (int)$row['usage_count'],
    'userLimit' => is_null($row['user_limit']) ? null : (int)$row['user_limit'],
    'startDate' => $row['start_date'],
    'endDate' => $row['end_date'],
    'isActive' => (int)$row['is_active'] === 1,
    'createdAt' => $row['created_at'] ?? null,
    'updatedAt' => $row['updated_at'] ?? null,
  ];
}

function parseJson(): ?array {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') return null;
  $data = json_decode($raw, true);
  return is_array($data) ? $data : null;
}

function toDateTime(?string $date, bool $end = false): ?string {
  if (!$date) return null;
  // If already contains time, return as is
  if (preg_match('/\d{2}:\d{2}:\d{2}/', $date)) return $date;
  return $end ? ($date . ' 23:59:59') : ($date . ' 00:00:00');
}

// Extract PATH_INFO for /:id
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$segments = array_values(array_filter(explode('/', $pathInfo)));
$id = isset($segments[0]) ? (int)$segments[0] : null;
$method = $_SERVER['REQUEST_METHOD'];

try {
  if ($method === 'GET' && !$id) {
    // Optional summary mode: /api/product-vouchers?summary=1
    if (isset($_GET['summary'])) {
      $active = (int)$pdo->query("SELECT COUNT(*) FROM product_vouchers WHERE is_active=1 AND NOW() BETWEEN start_date AND end_date")->fetchColumn();
      $cat = (int)$pdo->query("SELECT COUNT(*) FROM product_vouchers WHERE target_type='category'")->fetchColumn();
      $prod = (int)$pdo->query("SELECT COUNT(*) FROM product_vouchers WHERE target_type='product'")->fetchColumn();
      $usage = (int)$pdo->query("SELECT COALESCE(SUM(usage_count),0) FROM product_vouchers")->fetchColumn();
      echo json_encode(['success' => true, 'data' => [
        'active' => $active,
        'category' => $cat,
        'product' => $prod,
        'total_usage' => $usage,
      ]]);
      exit;
    }

    // List vouchers
    $stmt = $pdo->query("SELECT pv.* FROM product_vouchers pv ORDER BY pv.created_at DESC");
    $rows = $stmt->fetchAll();
    $data = array_map('camelizeVoucher', $rows);
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
  }

  if ($method === 'GET' && $id) {
    $stmt = $pdo->prepare('SELECT * FROM product_vouchers WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Not found']); exit; }
    echo json_encode(['success' => true, 'data' => camelizeVoucher($row)]);
    exit;
  }

  if ($method === 'POST') {
    $d = parseJson() ?? [];
    // Normalize type
    $type = $d['type'] ?? 'percentage';
    if ($type === 'fixed_amount') $type = 'fixed';

    $sql = 'INSERT INTO product_vouchers (code, name, description, type, value, max_discount, target_type, target_id, min_purchase, usage_limit, user_limit, start_date, end_date, is_active)
            VALUES (:code, :name, :description, :type, :value, :max_discount, :target_type, :target_id, :min_purchase, :usage_limit, :user_limit, :start_date, :end_date, :is_active)';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
      ':code' => strtoupper($d['code'] ?? ''),
      ':name' => $d['name'] ?? '',
      ':description' => $d['description'] ?? null,
      ':type' => $type,
      ':value' => $d['value'] ?? 0,
      ':max_discount' => $d['maxDiscount'] ?? $d['max_discount'] ?? null,
      ':target_type' => $d['targetType'] ?? $d['target_type'] ?? 'all',
      ':target_id' => $d['targetId'] ?? $d['target_id'] ?? null,
      ':min_purchase' => $d['minPurchase'] ?? $d['min_purchase'] ?? 0,
      ':usage_limit' => $d['usageLimit'] ?? $d['usage_limit'] ?? null,
      ':user_limit' => $d['userLimit'] ?? $d['user_limit'] ?? 1,
      ':start_date' => toDateTime($d['startDate'] ?? $d['start_date'] ?? date('Y-m-d')), 
      ':end_date' => toDateTime($d['endDate'] ?? $d['end_date'] ?? null, true),
      ':is_active' => isset($d['isActive']) ? ((bool)$d['isActive'] ? 1 : 0) : (isset($d['is_active']) ? (int)$d['is_active'] : 1),
    ]);
    $newId = (int)$pdo->lastInsertId();
    echo json_encode(['success' => true, 'data' => ['id' => $newId]]);
    exit;
  }

  if (($method === 'PUT' || $method === 'PATCH') && $id) {
    $d = parseJson() ?? [];

    $fields = [];
    $params = [':id' => $id];

    $map = [
      'code' => 'code',
      'name' => 'name',
      'description' => 'description',
      'type' => 'type',
      'value' => 'value',
      'maxDiscount' => 'max_discount',
      'targetType' => 'target_type',
      'targetId' => 'target_id',
      'minPurchase' => 'min_purchase',
      'usageLimit' => 'usage_limit',
      'userLimit' => 'user_limit',
      'startDate' => 'start_date',
      'endDate' => 'end_date',
      'isActive' => 'is_active',
    ];

    foreach ($map as $in => $col) {
      if (array_key_exists($in, $d)) {
        $val = $d[$in];
        if ($in === 'type' && $val === 'fixed_amount') $val = 'fixed';
        if ($in === 'startDate') $val = toDateTime($val, false);
        if ($in === 'endDate') $val = toDateTime($val, true);
        if ($in === 'isActive') $val = $val ? 1 : 0;
        $fields[] = "$col = :$col";
        $params[":$col"] = $val;
      }
    }

    // Also accept snake_case keys
    $snake = [
      'max_discount','target_type','target_id','min_purchase','usage_limit','user_limit','start_date','end_date','is_active'
    ];
    foreach ($snake as $key) {
      if (array_key_exists($key, $d)) {
        $val = $d[$key];
        if ($key === 'start_date') $val = toDateTime($val, false);
        if ($key === 'end_date') $val = toDateTime($val, true);
        $fields[] = "$key = :$key";
        $params[":$key"] = $val;
      }
    }

    if (!$fields) { echo json_encode(['success' => false, 'message' => 'No fields to update']); exit; }

    $sql = 'UPDATE product_vouchers SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true]);
    exit;
  }

  if ($method === 'DELETE' && $id) {
    $stmt = $pdo->prepare('DELETE FROM product_vouchers WHERE id = :id');
    $stmt->execute([':id' => $id]);
    echo json_encode(['success' => true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['success' => false, 'message' => 'Method not allowed']);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Server error', 'error' => $e->getMessage()]);
}
