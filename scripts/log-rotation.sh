#!/bin/sh
# 日志轮转脚本
# 用于定期清理和轮转日志文件

set -e

# 配置变量
LOG_DIR="/app/logs"
MAX_DAYS=30
MAX_SIZE="100M"  # 最大文件大小
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROTATED_LOG_DIR="${LOG_DIR}/rotated"

# 创建轮转日志目录
mkdir -p "$ROTATED_LOG_DIR"

echo "[$(date)] Starting log rotation..."

# 清理超过保留期的日志文件
echo "[$(date)] Cleaning up log files older than $MAX_DAYS days..."
find "$LOG_DIR" -name "*.log" -type f -mtime +$MAX_DAYS -exec rm -v {} \;

# 轮转过大的日志文件
echo "[$(date)] Rotating large log files..."
find "$LOG_DIR" -name "*.log" -type f -size +$MAX_SIZE -exec sh -c '
    file="$1"
    filename=$(basename "$file")
    mv "$file" "'"$ROTATED_LOG_DIR/${filename}_${TIMESTAMP}"'"
    echo "Rotated: $file -> $ROTATED_LOG_DIR/${filename}_${TIMESTAMP}"
' sh {} \;

# 清理轮转日志目录中的旧文件
echo "[$(date)] Cleaning up old rotated logs..."
find "$ROTATED_LOG_DIR" -name "*.log_*" -type f -mtime +$MAX_DAYS -exec rm -v {} \;

# 检查磁盘使用情况
echo "[$(date)] Checking disk usage..."
du -sh "$LOG_DIR"
du -sh "$ROTATED_LOG_DIR"

# 压缩旧的轮转日志文件（可选）
echo "[$(date)] Compressing old rotated logs..."
find "$ROTATED_LOG_DIR" -name "*.log_*" -type f -mtime +1 ! -name "*.gz" -exec gzip -v {} \;

# 显示日志文件统计
echo "[$(date)] Log file statistics:"
echo "Active logs:"
find "$LOG_DIR" -name "*.log" -type f -exec ls -lh {} \; | awk '{print $5, $9}' | sort -hr
echo "Rotated logs:"
find "$ROTATED_LOG_DIR" -name "*.log*" -type f -exec ls -lh {} \; | awk '{print $5, $9}' | sort -hr

# 发送通知（如果需要）
echo "[$(date)] Log rotation completed successfully."

# 检查是否有错误
if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Log rotation failed!" >&2
    exit 1
fi

exit 0