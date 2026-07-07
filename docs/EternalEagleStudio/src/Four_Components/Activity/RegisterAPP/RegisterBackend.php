<?php




if (basename($_SERVER['SCRIPT_FILENAME']) == basename(__FILE__)) {
    echo "<br>正在运行PHP文件<br>";
    echo "当前目录：" . __DIR__ . "<br>";
    
    $path = __DIR__ . '/../../../../../config/Database.php';
     echo "尝试加载: $path<br>";
     echo "文件存在: " . (file_exists($path) ? '是' : '否');
    exit;
}






// 引入数据库配置
$config = require __DIR__ . '/../../../../../config/Database.php';

// 获取 JSON 请求体
$input = json_decode(file_get_contents('php://input'), true);
$用户名 = trim($input['用户名'] ?? '');
$密码 = $input['密码'] ?? '';

// 设置响应类型为 JSON
header('Content-Type: application/json');

// 1. 基本验证
if (empty($用户名) || empty($密码)) {
    echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
    exit;
}
if (strlen($密码) < 6) {
    echo json_encode(['success' => false, 'message' => '密码长度至少需要6位']);
    exit;
}

// 2. 密码哈希
$哈希密码_ = password_hash($密码, PASSWORD_DEFAULT);

try {
    // 3. 连接数据库
    $pdo = new PDO(
        "mysql:host={$config['主机']};dbname={$config['数据库名']};charset=utf8mb4",
        $config['超级管理员'],
        $config['密码']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 4. 插入用户
    $stmt = $pdo->prepare("INSERT INTO users (用户名, password_hash) VALUES (?, ?)");
    $stmt->execute([$用户名, $哈希密码]);

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
