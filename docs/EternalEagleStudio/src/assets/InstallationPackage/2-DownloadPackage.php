<?php
// DownloadPackage.php - 支持 Range 和独立日志下载

$url = isset($_GET['url']) ? $_GET['url'] : '';
$is_log_mode = isset($_GET['log']) && $_GET['log'] == '1';

if (empty($url)) {
    die('Missing url parameter');
}

// 域名白名单
$allowed = ['gitee.com', 'raw.githubusercontent.com'];
$host = parse_url($url, PHP_URL_HOST);
$ok = false;
foreach ($allowed as $h) {
    if (strpos($host, $h) !== false) { $ok = true; break; }
}
if (!$ok) {
    http_response_code(403);
    die('Domain not allowed');
}

// ---------- 日志模式：仅输出调试信息 ----------
if ($is_log_mode) {
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="gitee_diagnostic_log.txt"');
    
    echo "=== Gitee 下载诊断日志 ===\n";
    echo "URL: $url\n";
    echo "生成时间: " . date('Y-m-d H:i:s') . "\n\n";
    
    // 发起 HEAD 请求获取响应头（不下载内容）
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_NOBODY => true,              // HEAD 请求
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        CURLOPT_HEADERFUNCTION => function($ch, $header) use (&$headers) {
            $headers[] = trim($header);
            return strlen($header);
        }
    ]);
    curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $content_length = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
    curl_close($ch);
    
    echo "HTTP 状态码: $http_code\n";
    echo "Content-Type: $content_type\n";
    echo "Content-Length: " . ($content_length > 0 ? $content_length . " 字节" : "未知") . "\n";
    echo "Accept-Ranges 支持: " . (in_array('Accept-Ranges: bytes', $headers) ? "是 (bytes)" : "否") . "\n";
    echo "\n完整响应头:\n";
    foreach ($headers as $h) {
        echo "  $h\n";
    }
    
    // 额外测试：尝试下载前 4 个字节验证文件头是否为 APK (PK\x03\x04)
    echo "\n--- 文件头验证 ---\n";
    $ch2 = curl_init();
    curl_setopt_array($ch2, [
        CURLOPT_URL => $url,
        CURLOPT_RANGE => 'bytes=0-3',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_USERAGENT => 'Mozilla/5.0'
    ]);
    $first4 = curl_exec($ch2);
    $header_code = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    curl_close($ch2);
    
    if ($header_code == 206 && strlen($first4) == 4) {
        $hex = bin2hex($first4);
        echo "前4字节 HEX: $hex\n";
        if ($first4 === "\x50\x4B\x03\x04") {
            echo "✅ 文件头正确，这是一个有效的 APK/ZIP 文件。\n";
        } else {
            echo "❌ 文件头异常，不是 APK/ZIP 格式。\n";
        }
    } else {
        echo "无法获取文件头，HTTP 状态码: $header_code\n";
    }
    
    exit;
}

// ---------- 正常下载模式（支持 Range）----------
$range = isset($_SERVER['HTTP_RANGE']) ? $_SERVER['HTTP_RANGE'] : null;

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 300,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
]);

if ($range) {
    curl_setopt($ch, CURLOPT_RANGE, $range);
}

// 收集响应头（用于透传）
$response_headers = [];
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $header) use (&$response_headers) {
    $response_headers[] = $header;
    return strlen($header);
});

// 执行下载
curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 发送正确的 MIME 类型
header('Content-Type: application/vnd.android.package-archive');

if ($http_code === 206) {
    http_response_code(206);
    foreach ($response_headers as $h) {
        if (stripos($h, 'Content-Range:') === 0) {
            header(trim($h));
            break;
        }
    }
    header('Accept-Ranges: bytes');
} else {
    http_response_code(200);
    header('Accept-Ranges: bytes');
}

ob_end_clean();
flush();
// 内容已经由 curl_exec 直接输出，无需额外 echo
exit;



