<?php
/**
 * DownloadPackage.php - 200 流式传输版（Chrome 完美进度条）
 * 如果 50 秒内传不完，会自动超时并下载错误日志
 */

declare(strict_types=1);
error_reporting(0);
ini_set('display_errors', '0');
if (!ob_get_level()) ob_start();

require_once 'LogCollector.php';

$ALLOWED_HOSTS = ['gitee.com', '*.gitee.com', 'raw.githubusercontent.com'];
define('USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

// 50 秒极限传输
@set_time_limit(50);
@ini_set('max_execution_time', '50');
ignore_user_abort(false);

$logger = LogCollector::getInstance();
$logger->addEnvSnapshot();

function abortWithLog(string $errorMsg, int $httpCode = 500) {
    global $logger;
    $logger->add('ERROR', $errorMsg, __FILE__, __LINE__, ['httpCode' => $httpCode]);
    $logger->download('download_error_log.txt');
}

function cleanOutput() {
    while (ob_get_level()) @ob_end_clean();
}

function isHostAllowed($host, $allowedHosts) {
    foreach ($allowedHosts as $pattern) {
        if ($pattern === $host) return true;
        if (strpos($pattern, '*') !== false) {
            $regex = '/^' . str_replace('\*', '.*', preg_quote($pattern, '/')) . '$/i';
            if (preg_match($regex, $host)) return true;
        }
    }
    return false;
}

// ======================== 主流程 ========================
$url = isset($_GET['url']) ? $_GET['url'] : '';
$is_log_mode = isset($_GET['log']) && $_GET['log'] == '1';

if (empty($url)) {
    abortWithLog('Missing url parameter', 400);
}

$host = parse_url($url, PHP_URL_HOST);
if (!$host || !isHostAllowed($host, $ALLOWED_HOSTS)) {
    abortWithLog("域名 '{$host}' 不在白名单内", 403);
}

// ---------- 探测 ----------
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_NOBODY => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_USERAGENT => USER_AGENT,
    CURLOPT_RETURNTRANSFER => true,
]);
curl_exec($ch);
$totalSize = (int)curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
$probeErr = curl_error($ch);
curl_close($ch);

if ($probeErr || $totalSize <= 0) {
    abortWithLog("无法获取文件大小: {$probeErr}");
}

$logger->add('INFO', '准备200流式传输', __FILE__, __LINE__, [
    'totalSize' => $totalSize,
    'totalMB' => round($totalSize/1024/1024, 2)
]);

// 魔数验证
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RANGE => 'bytes=0-3',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_USERAGENT => USER_AGENT,
]);
$magic = curl_exec($ch);
curl_close($ch);

if ($magic !== "\x50\x4B\x03\x04") {
    abortWithLog("远程资源不是有效的 APK/ZIP 文件");
}

// ---------- 200 流式传输 ----------
cleanOutput();

// ★ 关键：用随机文件名，避免 Chrome 历史拦截
$filename = 'v23_' . substr(md5((string)time()), 0, 6) . '.apk';

http_response_code(200);
header('Content-Type: application/octet-stream'); // 伪装成通用二进制，Chrome 不拦截
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . $totalSize);  // ★ Chrome 靠这个建进度条
header('Accept-Ranges: bytes');
// 不要 Connection: close，让 Apache 正常结束

// 立即推送 Header
echo '';
if (ob_get_level()) ob_flush();
flush();

$bytesTransferred = 0;
$startTime = microtime(true);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 50,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_USERAGENT => USER_AGENT,
    CURLOPT_BUFFERSIZE => 32768, // 32KB
    CURLOPT_WRITEFUNCTION => function ($curl, $data) use (&$bytesTransferred) {
        echo $data;
        $bytesTransferred += strlen($data);
        // 每 512KB 刷新一次（平衡速度 vs 缓冲）
        static $lastFlush = 0;
        if ($bytesTransferred - $lastFlush > 524288) {
            if (ob_get_level()) ob_flush();
            flush();
            $lastFlush = $bytesTransferred;
        }
        return strlen($data);
    },
]);

curl_exec($ch);
$err = curl_error($ch);
$info = curl_getinfo($ch);
curl_close($ch);

$duration = round(microtime(true) - $startTime, 2);

$logger->add('INFO', '传输结束', __FILE__, __LINE__, [
    'bytesTransferred' => $bytesTransferred,
    'totalSize' => $totalSize,
    'durationSec' => $duration,
    'speedKBps' => $duration > 0 ? round($bytesTransferred/1024/$duration, 2) : 0,
    'curlError' => $err ?: '无'
]);

if ($err) {
    $logger->add('ERROR', "传输中断: {$err}", __FILE__, __LINE__);
    // 如果超时，自动下载日志
    if (strpos($err, 'timed out') !== false) {
        $logger->download('timeout_log.txt');
    }
}

exit;
