<?php
// download_proxy.php - 支持 Range 请求的 APK 代理

$url = isset($_GET['url']) ? $_GET['url'] : '';
if (empty($url)) {
    http_response_code(400);
    die('Missing url parameter');
}

// 允许的域名白名单
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

// 获取客户端请求的 Range（如果有）
$range = isset($_SERVER['HTTP_RANGE']) ? $_SERVER['HTTP_RANGE'] : null;

// 初始化 cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 300,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    CURLOPT_HEADERFUNCTION => function($ch, $header) use (&$response_headers) {
        // 收集响应头，后面需要转发部分头
        $response_headers[] = $header;
        return strlen($header);
    }
]);

// 如果客户端请求了 Range，则传递给 Gitee
if ($range) {
    curl_setopt($ch, CURLOPT_RANGE, $range);
}

// 执行请求
$response_headers = [];
curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

// 发送正确的 APK MIME 类型（覆盖）
header('Content-Type: application/vnd.android.package-archive');

// 如果 Gitee 返回 206（Partial Content），则透传 206 和 Content-Range
if ($http_code === 206) {
    http_response_code(206);
    // 从收集的响应头中提取 Content-Range
    foreach ($response_headers as $h) {
        if (stripos($h, 'Content-Range:') === 0) {
            header(trim($h));
            break;
        }
    }
    // 同时发送 Accept-Ranges 让客户端知道支持断点续传
    header('Accept-Ranges: bytes');
} else {
    // 完整文件，返回 200
    http_response_code(200);
    header('Accept-Ranges: bytes');
}

// 禁用输出缓冲，确保流式传输
ob_end_clean();
flush();
// 重新输出已经由 curl_exec 直接输出的内容，无需额外操作
exit;



