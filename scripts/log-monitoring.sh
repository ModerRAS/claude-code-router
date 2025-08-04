#!/bin/sh
# 日志监控脚本
# 用于监控日志系统状态和性能指标

set -e

# 配置变量
LOG_DIR="/app/logs"
PID_FILE="/app/logs/monitoring.pid"
ALERT_LOG="${LOG_DIR}/monitoring-alerts.log"
MAX_LOG_SIZE="1G"  # 日志文件最大大小警告阈值
MAX_LOG_COUNT="100" # 日志文件数量警告阈值

# 创建警告日志文件
touch "$ALERT_LOG"

# 日志函数
log_alert() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $*" | tee -a "$ALERT_LOG"
}

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $*"
}

# 检查日志文件大小
check_log_sizes() {
    log_info "Checking log file sizes..."
    
    local large_files=$(find "$LOG_DIR" -name "*.log" -type f -size +$MAX_LOG_SIZE)
    
    if [ -n "$large_files" ]; then
        log_alert "Found log files larger than $MAX_LOG_SIZE:"
        echo "$large_files" | while read file; do
            local size=$(du -h "$file" | cut -f1)
            log_alert "  $file: $size"
        done
    else
        log_info "All log files are within size limit ($MAX_LOG_SIZE)"
    fi
}

# 检查日志文件数量
check_log_count() {
    log_info "Checking log file count..."
    
    local count=$(find "$LOG_DIR" -name "*.log" -type f | wc -l)
    
    if [ "$count" -gt "$MAX_LOG_COUNT" ]; then
        log_alert "Too many log files: $count (limit: $MAX_LOG_COUNT)"
    else
        log_info "Log file count is normal: $count"
    fi
}

# 检查磁盘空间
check_disk_space() {
    log_info "Checking disk space..."
    
    local usage=$(df "$LOG_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -gt 80 ]; then
        log_alert "Disk usage is high: ${usage}%"
    elif [ "$usage" -gt 90 ]; then
        log_alert "CRITICAL: Disk usage is very high: ${usage}%"
    else
        log_info "Disk usage is normal: ${usage}%"
    fi
}

# 检查最近的错误日志
check_recent_errors() {
    log_info "Checking recent error logs..."
    
    local error_files=$(find "$LOG_DIR" -name "*error*.log" -type f -mmin -60)
    
    if [ -n "$error_files" ]; then
        log_alert "Found recent error logs in the last hour:"
        for file in $error_files; do
            local error_count=$(grep -c "ERROR\|FATAL" "$file" 2>/dev/null || echo "0")
            if [ "$error_count" -gt 0 ]; then
                log_alert "  $file: $error_count errors in the last hour"
            fi
        done
    else
        log_info "No recent error logs found"
    fi
}

# 检查日志写入活动
check_log_activity() {
    log_info "Checking log write activity..."
    
    local modified_files=$(find "$LOG_DIR" -name "*.log" -type f -mmin -5)
    
    if [ -z "$modified_files" ]; then
        log_alert "No log files modified in the last 5 minutes"
    else
        log_info "Log files active: $(echo "$modified_files" | wc -l | tr -d ' ')"
    fi
}

# 检查日志轮转状态
check_rotation_status() {
    log_info "Checking log rotation status..."
    
    local rotated_dir="${LOG_DIR}/rotated"
    
    if [ -d "$rotated_dir" ]; then
        local rotated_count=$(find "$rotated_dir" -name "*.log*" -type f -mtime -1 | wc -l)
        log_info "Rotated logs in the last 24 hours: $rotated_count"
        
        # 检查是否有未压缩的旧日志文件
        local uncompressed=$(find "$rotated_dir" -name "*.log_*" -type f -mtime +1 ! -name "*.gz" | wc -l)
        if [ "$uncompressed" -gt 0 ]; then
            log_alert "Found $uncompressed uncompressed rotated logs older than 1 day"
        fi
    else
        log_info "No rotated logs directory found"
    fi
}

# 生成性能报告
generate_performance_report() {
    log_info "Generating performance report..."
    
    local report_file="${LOG_DIR}/performance-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=== Logging System Performance Report ==="
        echo "Generated: $(date)"
        echo ""
        
        echo "=== Disk Usage ==="
        df -h "$LOG_DIR"
        echo ""
        
        echo "=== Log File Statistics ==="
        echo "Total log files: $(find "$LOG_DIR" -name "*.log" -type f | wc -l)"
        echo "Total rotated files: $(find "$LOG_DIR/rotated" -name "*.log*" -type f 2>/dev/null | wc -l)"
        echo ""
        
        echo "=== Largest Log Files ==="
        find "$LOG_DIR" -name "*.log" -type f -exec ls -lh {} \; | sort -k5 -hr | head -10
        echo ""
        
        echo "=== Recent Log Activity ==="
        echo "Files modified in last hour: $(find "$LOG_DIR" -name "*.log" -type f -mmin -60 | wc -l)"
        echo "Files modified in last 5 minutes: $(find "$LOG_DIR" -name "*.log" -type f -mmin -5 | wc -l)"
        echo ""
        
        echo "=== Error Summary ==="
        for file in $(find "$LOG_DIR" -name "*error*.log" -type f); do
            echo "File: $file"
            echo "Total errors: $(grep -c "ERROR\|FATAL" "$file" 2>/dev/null || echo "0")"
            echo "Recent errors (last hour): $(find "$file" -type f -mmin -60 -exec grep -c "ERROR\|FATAL" {} \; 2>/dev/null || echo "0")"
            echo ""
        done
        
    } > "$report_file"
    
    log_info "Performance report generated: $report_file"
}

# 主监控函数
main() {
    log_info "Starting log monitoring..."
    
    # 检查PID文件，防止重复运行
    if [ -f "$PID_FILE" ]; then
        old_pid=$(cat "$PID_FILE")
        if ps -p "$old_pid" > /dev/null 2>&1; then
            log_info "Monitoring already running with PID $old_pid"
            exit 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    # 写入当前PID
    echo $$ > "$PID_FILE"
    
    # 执行检查
    check_log_sizes
    check_log_count
    check_disk_space
    check_recent_errors
    check_log_activity
    check_rotation_status
    generate_performance_report
    
    # 清理PID文件
    rm -f "$PID_FILE"
    
    log_info "Log monitoring completed"
}

# 执行主函数
main "$@"