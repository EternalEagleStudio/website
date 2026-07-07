<?php
/**
 * LogCollector.php - 专业日志收集与诊断中心
 * 
 * 独立访问：
 *   LogCollector.php?download=1                    → 下载环境诊断报告
 *   LogCollector.php?download=1&error_msg=xxx       → 下载带指定错误的报告
 * 
 * 被引用：
 *   require_once 'LogCollector.php';
 *   $logger = LogCollector::getInstance();
 *   $logger->add('ERROR', '...');
 *   $logger->download('error_log.txt');
 */

declare(strict_types=1);

// 绝对禁止任何错误输出到浏览器，防止破坏 Header
error_reporting(0);
ini_set('display_errors', '0');

// 立即锁住输出缓冲
if (!ob_get_level()) ob_start();

class LogEntry
{
    public string $time;
    public string $level;
    public string $message;
    public ?string $file;
    public ?int $line;
    public array $context;

    public function __construct(string $level, string $message, ?string $file = null, ?int $line = null, array $context = [])
    {
        $this->time = (new DateTime('now', new DateTimeZone('Asia/Shanghai')))->format('Y-m-d H:i:s.u');
        $this->level = strtoupper($level);
        $this->message = $message;
        $this->file = $file;
        $this->line = $line;
        $this->context = $context;
    }

    public function toText(): string
    {
        $ctx = empty($this->context) ? '' : "\n  上下文: " . json_encode($this->context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $loc = $this->file ? " | {$this->file}:{$this->line}" : '';
        return "[{$this->time}] [{$this->level}]{$loc} {$this->message}{$ctx}";
    }
}

class LogCollector
{
    private static ?self $instance = null;
    private array $entries = [];
    private array $stats = ['INFO' => 0, 'DEBUG' => 0, 'WARN' => 0, 'ERROR' => 0, 'FATAL' => 0];
    private string $requestId;
    private bool $downloaded = false;

    private function __construct()
    {
        $this->requestId = substr(md5(uniqid((string)mt_rand(), true)), 0, 8);
        $this->registerHandlers();
    }

    public static function getInstance(): self
    {
        return self::$instance ??= new self();
    }

    private function registerHandlers(): void
    {
        set_error_handler(function (int $errno, string $errstr, string $file, int $line) {
            $level = in_array($errno, [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_PARSE], true) ? 'ERROR' : 'WARN';
            $this->add($level, "[PHP原生错误 E{$errno}] {$errstr}", $file, $line, ['errno' => $errno]);
            return true;
        });

        set_exception_handler(function (Throwable $e) {
            $this->add('FATAL', "未捕获异常: " . get_class($e) . " | " . $e->getMessage(), $e->getFile(), $e->getLine(), [
                'code' => $e->getCode(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->download("fatal_error_{$this->requestId}.txt");
        });

        register_shutdown_function(function () {
            $err = error_get_last();
            if ($err && in_array($err['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE], true)) {
                $this->add('FATAL', "[Shutdown捕获] {$err['message']}", $err['file'], $err['line'], ['type' => $err['type']]);
                if (!$this->downloaded && !headers_sent()) {
                    $this->download("shutdown_fatal_{$this->requestId}.txt");
                }
            }
        });
    }

    public function add(string $level, string $message, ?string $file = null, ?int $line = null, array $context = []): void
    {
        $file ??= __FILE__;
        $line ??= __LINE__;
        $this->entries[] = new LogEntry($level, $message, $file, $line, $context);
        $this->stats[$level] = ($this->stats[$level] ?? 0) + 1;
    }

    public function addEnvSnapshot(): void
    {
        $this->add('INFO', '=== 运行时环境快照 ===', __FILE__, __LINE__, [
            'PHP版本' => PHP_VERSION,
            'SAPI' => PHP_SAPI,
            'OS' => PHP_OS_FAMILY,
            'max_execution_time' => ini_get('max_execution_time'),
            'memory_limit' => ini_get('memory_limit'),
            '当前脚本' => $_SERVER['SCRIPT_NAME'] ?? 'CLI',
            '请求方法' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
            '请求URI' => $_SERVER['REQUEST_URI'] ?? 'N/A',
            'UserAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'N/A',
            'RemoteIP' => $_SERVER['REMOTE_ADDR'] ?? 'N/A',
            'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'N/A',
            'HTTP_RANGE' => $_SERVER['HTTP_RANGE'] ?? '无',
            'headers_sent_at_init' => headers_sent(),
        ]);
    }

    /** 从 GET 参数接收外部错误（用于跨脚本传递） */
    public function ingestExternalError(): void
    {
        if (!empty($_GET['error_msg'])) {
            $this->add('ERROR', $_GET['error_msg'], $_GET['error_file'] ?? 'external', (int)($_GET['error_line'] ?? 0));
        }
        if (!empty($_GET['warn_msg'])) {
            $this->add('WARN', $_GET['warn_msg'], $_GET['warn_file'] ?? 'external', (int)($_GET['warn_line'] ?? 0));
        }
    }

    public function generateReport(): string
    {
        $lines = [
            "══════════════════════════════════════════════════════════",
            "  PHP 全链路诊断日志报告",
            "══════════════════════════════════════════════════════════",
            "Request ID: {$this->requestId}",
            "生成时间: " . (new DateTime('now', new DateTimeZone('Asia/Shanghai')))->format('Y-m-d H:i:s.u'),
            "记录条数: " . count($this->entries),
            "级别统计: " . json_encode($this->stats, JSON_UNESCAPED_UNICODE),
            "══════════════════════════════════════════════════════════",
            ""
        ];

        foreach ($this->entries as $entry) {
            $lines[] = $entry->toText();
        }

        $lines[] = "";
        $lines[] = "══════════════════════════════════════════════════════════";
        $lines[] = "报告结束 | 共 " . count($this->entries) . " 条记录";
        $lines[] = "══════════════════════════════════════════════════════════";

        return implode("\n", $lines);
    }

    /**
     * 核心下载方法：三重保险 flush，确保手机浏览器 100% 收到
     */
    public function download(string $filename = 'download_log.txt'): void
    {
        if ($this->downloaded) return;
        $this->downloaded = true;

        // 彻底清理所有缓冲层
        while (ob_get_level()) @ob_end_clean();

        $content = $this->generateReport();
        $length = strlen($content);

        // 如果 Header 已脏，回退到屏幕输出（红色背景）
        if (headers_sent()) {
            echo "<pre style='background:#300;color:#fff;padding:20px;font:14px monospace;word-wrap:break-word;'>\n";
            echo "=== Header 已发送，无法提供文件下载，以下为日志内容 ===\n\n";
            echo htmlspecialchars($content, ENT_QUOTES, 'UTF-8');
            echo "\n</pre>";
            exit;
        }

        // 干净的 Header 序列
        header('Content-Type: text/plain; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . $length);
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Connection: close');

        echo $content;

        // ★ 三重保险推送
        if (ob_get_level()) ob_flush();
        flush();
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();

        exit;
    }

    /** 保存到服务器本地（可选，用于后台留档） */
    public function saveToFile(string $dir = __DIR__): ?string
    {
        if (!is_dir($dir) || !is_writable($dir)) {
            $this->add('WARN', "日志目录不可写，跳过本地保存: {$dir}");
            return null;
        }
        $filename = 'log_' . $this->requestId . '_' . date('Ymd_His') . '.txt';
        $path = rtrim($dir, '/') . '/' . $filename;
        if (file_put_contents($path, $this->generateReport(), LOCK_EX) !== false) {
            return $path;
        }
        return null;
    }

    public function getRequestId(): string
    {
        return $this->requestId;
    }

    public function getStats(): array
    {
        return $this->stats;
    }
}

// ==================== Standalone 模式 ====================
// 如果直接访问 LogCollector.php，自动进入诊断模式
if (basename($_SERVER['SCRIPT_NAME'] ?? '') === 'LogCollector.php') {
    $logger = LogCollector::getInstance();
    $logger->addEnvSnapshot();
    $logger->ingestExternalError();

    if (isset($_GET['download']) && $_GET['download'] === '1') {
        $logger->download('php_diagnostic_report.txt');
    } else {
        header('Content-Type: text/plain; charset=utf-8');
        echo $logger->generateReport();
    }
}
