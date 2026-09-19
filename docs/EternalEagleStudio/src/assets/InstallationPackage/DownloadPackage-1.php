<?php
/**
 * DownloadPackage.php - 安全代理下载，失败时自动输出 TXT 诊断文件
 * 采用“先完整下载到内存，校验无误后再输出”策略，确保失败时一定返回 TXT。
 */

// ======================== 配置 ========================
$ALLOWED_HOSTS = [
    'gitee.com',
    '*.gitee.com',
    'raw.githubusercontent.com',
];
const MAX_REDIRECTS = 8;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ======================== 辅助函数 ========================
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

function outputErrorTxt($errorMsg, $httpCode = 500) {
    http_response_code($httpCode);
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="download_error_log.txt"');
    header('Cache-Control: no-cache');
    $content = "=== 下载失败诊断报告 ===\n";
    $content .= "时间: " . date('Y-m-d H:i:s') . "\n";
    $content .= "错误信息: $errorMsg\n";
    $content .= "请将此文件反馈给网站管理员。\n";
    echo $content;
    exit;
}

function httpRequest($url, $options = [], $returnBody = false, &$finalUrl = null) {
    $ch = curl_init();
    $defaults = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => $returnBody,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => USER_AGENT,
        CURLOPT_HEADERFUNCTION => null,
    ];
    foreach ($options as $k => $v) $defaults[$k] = $v;
    curl_setopt_array($ch, $defaults);

    $responseHeaders = [];
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeaders) {
        $responseHeaders[] = trim($header);
        return strlen($header);
    });

    $body = $returnBody ? curl_exec($ch) : null;
    $info = curl_getinfo($ch);
    $error = curl_error($ch);
    $httpCode = $info['http_code'];
    curl_close($ch);

    $finalUrl = $info['url'];
    return [
        'code' => $httpCode,
        'headers' => $responseHeaders,
        'body' => $body,
        'error' => $error,
    ];
}

function followRedirects($url, $options = [], $returnBody = false) {
    global $ALLOWED_HOSTS;
    $maxRedirects = MAX_REDIRECTS;
    $currentUrl = $url;
    $redirectCount = 0;

    while ($redirectCount <= $maxRedirects) {
        $host = parse_url($currentUrl, PHP_URL_HOST);
        if (!$host || !isHostAllowed($host, $ALLOWED_HOSTS)) {
            return [
                'success' => false,
                'error' => "域名 '$host' 不在白名单内",
                'finalUrl' => $currentUrl,
                'code' => 403,
                'headers' => [],
                'body' => '',
            ];
        }

        $resp = httpRequest($currentUrl, $options, $returnBody, $effectiveUrl);
        $code = $resp['code'];
        $headers = $resp['headers'];

        $location = null;
        foreach ($headers as $header) {
            if (stripos($header, 'Location:') === 0) {
                $location = trim(substr($header, strlen('Location:')));
                break;
            }
        }

        if (in_array($code, [301, 302, 303, 307, 308]) && $location) {
            if (parse_url($location, PHP_URL_HOST) === null) {
                $base = $currentUrl;
                $baseParts = parse_url($base);
                $scheme = $baseParts['scheme'] ?? 'https';
                $host = $baseParts['host'] ?? '';
                $port = isset($baseParts['port']) ? ':' . $baseParts['port'] : '';
                $prefix = $scheme . '://' . $host . $port;
                if (strpos($location, '/') === 0) {
                    $location = $prefix . $location;
                } else {
                    $path = isset($baseParts['path']) ? dirname($baseParts['path']) : '';
                    if ($path && substr($path, -1) !== '/') $path .= '/';
                    $location = $prefix . $path . $location;
                }
            }
            $currentUrl = $location;
            $redirectCount++;
            continue;
        }

        return [
            'success' => true,
            'finalUrl' => $effectiveUrl,
            'code' => $code,
            'headers' => $headers,
            'body' => $resp['body'],
            'error' => $resp['error'],
        ];
    }

    return [
        'success' => false,
        'error' => '超过最大重定向次数',
        'finalUrl' => $currentUrl,
        'code' => 0,
        'headers' => [],
        'body' => '',
    ];
}

function probeResource($url) {
    // 获取最终 URL 和基本信息（HEAD 请求）
    $headResp = followRedirects($url, [CURLOPT_NOBODY => true], false);
    if (!$headResp['success']) {
        return ['ok' => false, 'error' => 'HEAD 请求失败: ' . $headResp['error']];
    }
    $finalUrl = $headResp['finalUrl'];
    $headers = $headResp['headers'];
    
    $contentLength = null;
    $contentType = null;
    $acceptRanges = false;
    foreach ($headers as $h) {
        if (stripos($h, 'Content-Length:') === 0) {
            $contentLength = (int)trim(substr($h, strlen('Content-Length:')));
        }
        if (stripos($h, 'Content-Type:') === 0) {
            $contentType = trim(substr($h, strlen('Content-Type:')));
        }
        if (stripos($h, 'Accept-Ranges:') === 0 && stripos($h, 'bytes') !== false) {
            $acceptRanges = true;
        }
    }
    
    if ($contentType && !preg_match('#application/vnd.android.package-archive|application/zip|application/octet-stream#i', $contentType)) {
        return ['ok' => false, 'error' => "Content-Type 不是 APK/ZIP: $contentType"];
    }
    
    // 获取前4字节验证文件头
    $rangeOpt = [CURLOPT_RANGE => 'bytes=0-3'];
    $rangeResp = followRedirects($url, $rangeOpt, true);
    if (!$rangeResp['success']) {
        return ['ok' => false, 'error' => '无法获取文件头: ' . $rangeResp['error']];
    }
    $body = $rangeResp['body'];
    if (strlen($body) >= 4) {
        $magic = substr($body, 0, 4);
        if ($magic !== "\x50\x4B\x03\x04") {
            return ['ok' => false, 'error' => "文件头签名错误，不是有效的 APK/ZIP 文件 (hex: " . bin2hex($magic) . ")"];
        }
    } else {
        return ['ok' => false, 'error' => "无法获取完整文件头（只收到 " . strlen($body) . " 字节）"];
    }
    
    $supportRange = ($rangeResp['code'] === 206) || $acceptRanges;
    
    return [
        'ok' => true,
        'finalUrl' => $finalUrl,
        'size' => $contentLength ?: 0,
        'supportRange' => $supportRange,
        'error' => '',
    ];
}

/**
 * 核心下载函数：完整下载到内存，校验无误后输出
 */
function downloadAndOutput($url, $expectedSize) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_USERAGENT => USER_AGENT,
    ]);
    
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    $downloadedSize = strlen($data);
    curl_close($ch);
    
    if ($data === false) {
        outputErrorTxt("cURL 下载失败: $error");
    }
    if ($httpCode !== 200 && $httpCode !== 206) {
        outputErrorTxt("远程服务器返回错误状态码: $httpCode");
    }
    if ($expectedSize > 0 && $downloadedSize != $expectedSize) {
        outputErrorTxt("文件大小不符: 期望 {$expectedSize} 字节，实际收到 {$downloadedSize} 字节");
    }
    if ($downloadedSize < 4) {
        outputErrorTxt("下载内容过小，无法验证 APK 头");
    }
    $magic = substr($data, 0, 4);
    if ($magic !== "\x50\x4B\x03\x04") {
        outputErrorTxt("下载的内容不是有效的 APK/ZIP 文件 (文件头: " . bin2hex($magic) . ")");
    }
    
    // 全部校验通过，输出 APK
    http_response_code(200);
    header('Content-Type: application/vnd.android.package-archive');
    header('Content-Disposition: attachment; filename="v20.apk"');
    header('Content-Length: ' . $downloadedSize);
    header('Accept-Ranges: bytes');
    header('Cache-Control: no-cache');
    echo $data;
    exit;
}

// ======================== 主流程 ========================
$url = isset($_GET['url']) ? $_GET['url'] : '';
if (empty($url)) {
    outputErrorTxt('Missing url parameter', 400);
}

// 探测资源
$probe = probeResource($url);
if (!$probe['ok']) {
    outputErrorTxt("资源探测失败: " . $probe['error']);
}

// 完整下载并输出
downloadAndOutput($probe['finalUrl'], $probe['size']);



