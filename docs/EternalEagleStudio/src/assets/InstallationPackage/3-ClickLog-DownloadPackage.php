<?php
/**
 * DownloadPackage.php - 安全代理下载，失败时回退输出 TXT 诊断文件
 *
 * 特性：
 * - 域名白名单（支持 gitee.com 子域名及 githubusercontent）
 * - 手动处理重定向，每次跳转均验证域名合法性
 * - 探测阶段校验文件头（APK/ZIP 签名），确保资源有效
 * - 支持 Range 请求（206 部分内容）
 * - 任何错误（网络、HTTP 状态码、非 APK 内容等）均输出 TXT 错误报告
 */

// ======================== 配置 ========================
// 允许的域名（支持精确匹配和子域名通配）
$ALLOWED_HOSTS = [
    'gitee.com',
    '*.gitee.com',          // 匹配所有 gitee 子域名，如 foruda.gitee.com
    'raw.githubusercontent.com',
];
const MAX_REDIRECTS = 8;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ======================== 辅助函数 ========================
/**
 * 检查域名是否在白名单内
 * @param string $host
 * @return bool
 */
function isHostAllowed($host, $allowedHosts) {
    foreach ($allowedHosts as $pattern) {
        if ($pattern === $host) {
            return true;
        }
        if (strpos($pattern, '*') !== false) {
            $regex = '/^' . str_replace('\*', '.*', preg_quote($pattern, '/')) . '$/i';
            if (preg_match($regex, $host)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 安全发送错误文本文件，代替 APK 下载
 * @param string $errorMsg 详细错误信息
 * @param int $httpCode HTTP 状态码（默认 500）
 */
function outputErrorTxt($errorMsg, $httpCode = 500) {
    http_response_code($httpCode);
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="download_error_log.txt"');
    header('Cache-Control: no-cache');
    $content = "=== 下载失败诊断报告 ===\n";
    $content .= "时间: " . date('Y-m-d H:i:s') . "\n";
    $content .= "错误信息: $errorMsg\n";
    $content .= "建议反馈此日志给网站管理员。\n";
    echo $content;
    exit;
}

/**
 * 执行 HTTP 请求（支持手动重定向、可返回响应体、响应头）
 * @param string $url 请求 URL
 * @param array $options curl 额外选项
 * @param bool $returnBody 是否返回响应体（false 时仅返回响应头）
 * @param string &$finalUrl 最终重定向后的 URL
 * @return array ['code'=>int, 'headers'=>array, 'body'=>string, 'error'=>string]
 */
function httpRequest($url, $options = [], $returnBody = false, &$finalUrl = null) {
    $ch = curl_init();
    $defaults = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => $returnBody,
        CURLOPT_FOLLOWLOCATION => false,    // 手动处理重定向
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => USER_AGENT,
        CURLOPT_HEADERFUNCTION => null,
    ];
    // 合并用户选项
    foreach ($options as $k => $v) {
        $defaults[$k] = $v;
    }
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

/**
 * 手动处理重定向，并确保每次跳转的域名都在白名单内
 * @param string $url 初始 URL
 * @param array $options curl 选项（如 Range 头）
 * @param bool $returnBody 是否返回响应体
 * @return array ['success'=>bool, 'finalUrl'=>string, 'code'=>int, 'headers'=>array, 'body'=>string, 'error'=>string]
 */
function followRedirects($url, $options = [], $returnBody = false) {
    global $ALLOWED_HOSTS;
    $maxRedirects = MAX_REDIRECTS;
    $currentUrl = $url;
    $redirectCount = 0;

    while ($redirectCount <= $maxRedirects) {
        // 检查当前 URL 的域名是否白名单
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

        // 定位 Location 头
        $location = null;
        foreach ($headers as $header) {
            if (stripos($header, 'Location:') === 0) {
                $location = trim(substr($header, strlen('Location:')));
                break;
            }
        }

        // 重定向处理（301/302/303/307/308）
        if (in_array($code, [301, 302, 303, 307, 308]) && $location) {
            // 构建绝对 URL
            if (parse_url($location, PHP_URL_HOST) === null) {
                $base = $currentUrl;
                $baseParts = parse_url($base);
                $scheme = isset($baseParts['scheme']) ? $baseParts['scheme'] : 'https';
                $host = isset($baseParts['host']) ? $baseParts['host'] : '';
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

        // 非重定向响应，返回结果
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

/**
 * 探测远程资源有效性：状态码、Content-Type、文件头签名
 * @param string $url
 * @return array ['ok'=>bool, 'finalUrl'=>string, 'size'=>int, 'supportRange'=>bool, 'error'=>string]
 */
function probeResource($url) {
    // 1. 先获取资源头信息（通过 HEAD 方式，但 HEAD 可能被某些服务器禁止，改用 GET + Range:0-0）
    $options = [
        CURLOPT_RANGE => 'bytes=0-0',
        CURLOPT_NOBODY => false,   // 需要获取前1字节
    ];
    $resp = followRedirects($url, $options, true);
    if (!$resp['success']) {
        return ['ok' => false, 'error' => '探测请求失败: ' . $resp['error']];
    }
    $code = $resp['code'];
    if ($code !== 200 && $code !== 206) {
        return ['ok' => false, 'error' => "HTTP 状态码异常: $code"];
    }

    // 获取 Content-Length 和 Content-Type
    $headers = $resp['headers'];
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
        if (stripos($h, 'Accept-Ranges:') === 0) {
            $acceptRanges = (stripos($h, 'bytes') !== false);
        }
    }

    // 检查 Content-Type 是否为 APK/ZIP
    if ($contentType && !preg_match('#application/vnd.android.package-archive|application/zip|application/octet-stream#i', $contentType)) {
        return ['ok' => false, 'error' => "Content-Type 不是 APK/ZIP: $contentType"];
    }

    // 2. 检查文件头签名（PK\x03\x04）
    $body = $resp['body'];
    if (strlen($body) >= 4) {
        $magic = substr($body, 0, 4);
        if ($magic !== "\x50\x4B\x03\x04") {
            return ['ok' => false, 'error' => "文件头签名错误，不是有效的 APK/ZIP 文件 (hex: " . bin2hex($magic) . ")"];
        }
    } else {
        // 如果服务器忽略了 Range，返回了完整内容的一部分？但 Range 请求通常返回206或200全文件，这里取前4字节失败
        return ['ok' => false, 'error' => "无法获取文件头（服务器不支持 Range 或返回数据不完整）"];
    }

    // 如果第一次请求返回 200，可能不支持 Range，需要修正支持标记
    $supportRange = ($code === 206) || $acceptRanges;

    // 如果 Content-Length 未获取到，尝试通过第二次完整请求获取（但可能开销大，暂且用已知长度）
    if (!$contentLength) {
        // 可选：发起一个不带 Range 的 HEAD 请求
        $headResp = followRedirects($url, [CURLOPT_NOBODY => true], false);
        foreach ($headResp['headers'] as $h) {
            if (stripos($h, 'Content-Length:') === 0) {
                $contentLength = (int)trim(substr($h, strlen('Content-Length:')));
                break;
            }
        }
    }

    return [
        'ok' => true,
        'finalUrl' => $resp['finalUrl'],
        'size' => $contentLength ?: 0,
        'supportRange' => $supportRange,
        'error' => '',
    ];
}

/**
 * 执行流式下载（支持 Range）
 * @param string $url 原始 URL（内部会重定向）
 * @param string|null $rangeHeader 客户端 Range 头
 * @param int $fileSize 文件总大小（来自探测）
 * @param bool $supportRange 远程是否支持 Range
 */
function streamDownload($url, $rangeHeader, $fileSize, $supportRange) {
    // 准备 curl 选项
    $options = [
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_HEADERFUNCTION => null,
    ];

    // 处理 Range 头
    $sendRange = false;
    $rangeValue = null;
    if ($rangeHeader && $supportRange) {
        // 简单校验 Range 格式
        if (preg_match('/bytes=(\d*)-(\d*)/i', $rangeHeader, $matches)) {
            $start = $matches[1] === '' ? null : (int)$matches[1];
            $end = $matches[2] === '' ? null : (int)$matches[2];
            if ($start !== null && $end !== null && $start > $end) {
                // 非法 Range，返回 416
                http_response_code(416);
                header('Content-Range: bytes */' . ($fileSize ?: '*'));
                header('Content-Type: text/plain');
                echo 'Invalid Range';
                exit;
            }
            if ($start !== null && $fileSize && $start >= $fileSize) {
                http_response_code(416);
                header('Content-Range: bytes */' . $fileSize);
                header('Content-Type: text/plain');
                echo 'Requested Range Not Satisfiable';
                exit;
            }
            $options[CURLOPT_RANGE] = $rangeHeader;
            $sendRange = true;
        }
    }

    // 手动处理重定向并流式输出
    $ch = curl_init();
    $finalUrl = $url;
    $maxRedirects = MAX_REDIRECTS;
    $redirectCount = 0;

    // 为避免复杂，复用 followRedirects 逻辑但改为流式输出，因此单独写一个流式请求循环
    while ($redirectCount <= $maxRedirects) {
        // 域名检查
        $host = parse_url($finalUrl, PHP_URL_HOST);
        global $ALLOWED_HOSTS;
        if (!$host || !isHostAllowed($host, $ALLOWED_HOSTS)) {
            outputErrorTxt("重定向目标域名 '$host' 不在白名单内");
        }

        curl_setopt_array($ch, [
            CURLOPT_URL => $finalUrl,
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT => 300,
            CURLOPT_USERAGENT => USER_AGENT,
        ]);
        if ($sendRange && isset($options[CURLOPT_RANGE])) {
            curl_setopt($ch, CURLOPT_RANGE, $options[CURLOPT_RANGE]);
        }

        // 收集响应头以便处理 Location
        $responseHeaders = [];
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeaders) {
            $responseHeaders[] = trim($header);
            return strlen($header);
        });

        // 先执行获取响应头（不输出 body）
        ob_start(); // 捕获可能提前输出的内容
        $bodySent = curl_exec($ch);
        $info = curl_getinfo($ch);
        $httpCode = $info['http_code'];
        ob_end_clean();

        if (curl_errno($ch)) {
            outputErrorTxt("下载时发生 cURL 错误: " . curl_error($ch));
        }

        // 查找 Location
        $location = null;
        foreach ($responseHeaders as $h) {
            if (stripos($h, 'Location:') === 0) {
                $location = trim(substr($h, strlen('Location:')));
                break;
            }
        }

        if (in_array($httpCode, [301,302,303,307,308]) && $location) {
            // 构建绝对 URL
            if (parse_url($location, PHP_URL_HOST) === null) {
                $base = $finalUrl;
                $baseParts = parse_url($base);
                $scheme = isset($baseParts['scheme']) ? $baseParts['scheme'] : 'https';
                $host = isset($baseParts['host']) ? $baseParts['host'] : '';
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
            $finalUrl = $location;
            $redirectCount++;
            continue;
        }

        // 非重定向：输出正确的响应头并发送 body
        // 根据状态码设置 HTTP 响应
        if ($httpCode === 206 || ($sendRange && $httpCode === 200)) {
            // 206 部分内容，或服务器忽略 Range 返回 200 全文件
            http_response_code($sendRange ? 206 : 200);
        } elseif ($httpCode === 200) {
            http_response_code(200);
        } else {
            outputErrorTxt("下载时遇到非预期 HTTP 状态码: $httpCode");
        }

        // 透传 Content-Type，确保浏览器识别 APK
        $contentType = 'application/vnd.android.package-archive';
        foreach ($responseHeaders as $h) {
            if (stripos($h, 'Content-Type:') === 0) {
                $contentType = trim(substr($h, strlen('Content-Type:')));
                break;
            }
        }
        header('Content-Type: ' . $contentType);

        // 透传 Content-Disposition（如果有）
        foreach ($responseHeaders as $h) {
            if (stripos($h, 'Content-Disposition:') === 0) {
                header($h);
                break;
            }
        }

        // 透传 Accept-Ranges
        if ($supportRange) {
            header('Accept-Ranges: bytes');
        }

        // 透传 Content-Length 或 Content-Range
        foreach ($responseHeaders as $h) {
            if (stripos($h, 'Content-Length:') === 0 || stripos($h, 'Content-Range:') === 0) {
                header($h);
                break;
            }
        }

        // 禁用输出缓冲，流式输出剩余内容
        ob_end_clean();
        flush();

        // 重新执行一次请求，这次直接输出 body
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, null); // 不再收集头部
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($curl, $data) {
            echo $data;
            flush();
            return strlen($data);
        });
        curl_exec($ch);
        if (curl_errno($ch)) {
            // 如果已经开始输出，不能回退为 TXT，记录错误日志但不中断
            error_log("DownloadPackage: 流式传输中 cURL 错误 - " . curl_error($ch));
        }
        curl_close($ch);
        exit;
    }

    curl_close($ch);
    outputErrorTxt("下载时超过最大重定向次数");
}

// ======================== 主流程 ========================
$url = isset($_GET['url']) ? $_GET['url'] : '';
$is_log_mode = isset($_GET['log']) && $_GET['log'] == '1';

if (empty($url)) {
    outputErrorTxt('Missing url parameter', 400);
}

// 日志模式：输出诊断信息（保持原有功能）
if ($is_log_mode) {
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="gitee_diagnostic_log.txt"');
    echo "=== Gitee 下载诊断日志 ===\nURL: $url\n生成时间: " . date('Y-m-d H:i:s') . "\n\n";
    $probe = probeResource($url);
    echo "探测结果: " . ($probe['ok'] ? "成功" : "失败") . "\n";
    echo "错误信息: " . ($probe['error'] ?? '无') . "\n";
    echo "最终 URL: " . ($probe['finalUrl'] ?? '未知') . "\n";
    echo "文件大小: " . ($probe['size'] ?? 0) . " 字节\n";
    echo "支持 Range: " . ($probe['supportRange'] ? '是' : '否') . "\n";
    exit;
}

// 正常下载模式：先探测资源有效性
$probe = probeResource($url);
if (!$probe['ok']) {
    outputErrorTxt("资源探测失败: " . $probe['error']);
}

// 探测成功，执行流式下载
$rangeHeader = isset($_SERVER['HTTP_RANGE']) ? $_SERVER['HTTP_RANGE'] : null;
streamDownload($url, $rangeHeader, $probe['size'], $probe['supportRange']);



