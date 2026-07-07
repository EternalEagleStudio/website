<?php
// 引入数据库配置
$config = require __DIR__ . '/../config/Database.php';

// 获取 JSON 请求体
$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

// 设置响应类型为 JSON
header('Content-Type: application/json');

// 1. 基本验证
if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
    exit;
}
if (strlen($password) < 6) {
    echo json_encode(['success' => false, 'message' => '密码长度至少需要6位']);
    exit;
}

// 2. 密码哈希
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {
    // 3. 连接数据库
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8",
        $config['username'],
        $config['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 4. 插入用户
    $stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    $stmt->execute([$username, $passwordHash]);

    // 5. 成功：返回 JSON，前端负责跳转
    echo json_encode([
        'success' => true,
        'redirectUrl' => 'Four_Components/Activity/LoginAPP/LoginActivity.html'
    ]);
    exit;

} catch (PDOException $e) {
    // 重复用户名错误（MySQL 错误码 1062）
    if ($e->errorInfo[1] == 1062) {
        echo json_encode(['success' => false, 'message' => '用户名已被占用，请换一个']);
    } else {
        // 其他错误（生产环境不要暴露细节）
        echo json_encode(['success' => false, 'message' => '注册失败，请稍后重试']);
    }
    exit;
}
