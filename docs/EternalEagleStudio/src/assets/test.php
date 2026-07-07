<?php
// test.php - 极简诊断
error_reporting(E_ALL);
ini_set('display_errors', '1');

header('Content-Type: text/plain; charset=utf-8');

echo "=== 基础环境检查 ===\n";
echo "PHP 版本: " . PHP_VERSION . "\n";
echo "cURL: " . (function_exists('curl_init') ? '可用' : '不可用') . "\n";

if (function_exists('curl_init')) {
    echo "cURL 版本: " . curl_version()['version'] . "\n";
    
    // 测试连接 Gitee
    echo "\n=== 测试连接 Gitee ===\n";
    $ch = curl_init('https://gitee.com');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $result = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "HTTP 码: $httpCode\n";
    echo "错误: " . ($err ?: '无') . "\n";
    echo "返回长度: " . strlen($result) . "\n";
}

echo "\n=== 测试 header 发送 ===\n";
echo "此消息应在 header 之后输出\n";
