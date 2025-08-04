# 变更日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/) 规范。

## [Unreleased]

### Added
- 完整的增强日志系统实现
- 请求生命周期跟踪功能
- 多流输出管理（控制台、文件、网络）
- 高级错误处理和统计分析
- 性能监控和基准测试
- 自动日志轮转和压缩
- 向后兼容性支持
- 完整的单元测试和集成测试
- 性能优化和分析工具
- Docker 和 Kubernetes 部署配置
- 全面的文档和使用指南
- API 参考文档
- 故障排除指南
- 版本发布指南

## [1.0.33] - 2024-01-04

### Added
- 增强日志系统基础架构
- Pino 9.x 集成
- 配置管理系统
- 请求跟踪功能
- 错误日志增强
- 性能基准测试框架
- Docker 容器化支持
- Kubernetes 部署配置
- 完整的文档体系
- API 参考文档
- 部署指南
- 故障排除指南
- 性能优化指南
- 版本发布指南
- 变更日志管理

### Changed
- 升级到 TypeScript 5.x
- 更新依赖项
- 改进构建流程
- 优化内存使用
- 增强错误处理机制
- 改进配置管理系统
- 优化日志轮转策略
- 改进请求跟踪能力

### Changed
- 重构日志系统架构，基于 Pino 9.x
- 改进错误处理机制，使用 Result 模式
- 优化内存使用和性能
- 增强配置管理系统
- 改进请求跟踪能力

### Fixed
- 修复类型定义问题
- 修复模块导入问题
- 修复配置文件路径问题
- 修复日志级别验证问题
- 修复内存泄漏问题
- 修复并发写入问题
- 修复环境变量加载问题
- 修复流管理问题
- 修复性能瓶颈
- 修复安全漏洞
- 修复配置验证错误
- 修复导入路径问题

## [1.0.33] - 2024-01-04

### Added
- 增强日志系统基础架构
- Pino 9.x 集成
- 配置管理系统
- 请求跟踪功能
- 错误日志增强

### Changed
- 升级到 TypeScript 5.x
- 更新依赖项
- 改进构建流程

### Fixed
- 修复类型定义问题
- 修复模块导入问题
- 修复配置文件路径问题

## [1.0.32] - 2024-01-03

### Added
- Claude Code 路由功能
- 基础日志记录
- 配置文件支持
- 命令行接口

### Changed
- 初始项目结构
- 基础架构设计

### Fixed
- 初始版本发布修复

---

## 变更日志格式说明

### 版本类型

- **[Unreleased]**: 未发布的变更
- **[x.y.z]**: 已发布的版本号

### 变更类型

- **Added**: 新功能
- **Changed**: 已有功能的变更
- **Deprecated**: 已弃用但尚未移除的功能
- **Removed**: 已移除的功能
- **Fixed**: 错误修复
- **Security**: 安全相关的修复

### 变更描述规范

每个变更条目应该：

1. **清晰明确**: 使用简洁的语言描述变更
2. **具体详细**: 避免模糊的描述
3. **用户导向**: 从用户角度描述变更影响
4. **格式统一**: 使用一致的描述格式

#### 好的变更描述示例：

```markdown
### Added
- 添加请求生命周期跟踪功能，支持完整的请求监控
- 实现自动日志轮转，支持按大小和时间轮转
- 新增性能监控 API，提供实时性能指标

### Changed
- 将日志系统从 Winston 迁移到 Pino 9.x，提升性能
- 重构配置管理系统，支持动态配置更新
- 优化内存使用，减少 50% 内存占用

### Fixed
- 修复配置验证中 'silent' 级别被拒绝的问题
- 解决高并发下的日志文件写入冲突
- 修复请求跟踪器内存泄漏问题
```

#### 不好的变更描述示例：

```markdown
### Added
- 添加一些功能
- 修复一些问题
- 改进了性能

### Changed
- 更新了代码
- 修改了配置
- 优化了系统
```

## 发布说明

### 版本号规则

我们遵循 [Semantic Versioning 2.0.0](https://semver.org/) 规范：

- **主版本号 (Major)**: 不兼容的 API 更改
- **次版本号 (Minor)**: 向后兼容的功能新增
- **修订版本号 (Patch)**: 向后兼容的问题修复

### 发布周期

- **Patch 版本**: 每 1-2 周发布一次，包含错误修复和小的改进
- **Minor 版本**: 每 1-2 个月发布一次，包含新功能
- **Major 版本**: 每 6-12 个月发布一次，包含重大变更

### 紧急发布

对于需要立即修复的严重问题，我们会发布紧急修复版本：

```markdown
## [1.0.32-hotfix.1] - 2024-01-04

### Fixed
- 修复导致服务崩溃的内存泄漏问题
- 解决配置文件读取的安全漏洞
```

### 回滚版本

如果新版本出现严重问题，我们会发布回滚版本：

```markdown
## [1.0.31-rollback.1] - 2024-01-05

### Changed
- 回滚到 v1.0.31，移除导致问题的功能

### Fixed
- 回滚 v1.0.32 中引入的稳定性问题
```

## 升级指南

### 从 v1.0.32 升级到 v1.0.33

#### 主要变更

1. **配置文件格式变更**
   
   **旧格式 (v1.0.32):**
   ```json
   {
     "logLevel": "info",
     "enableLogging": true
   }
   ```
   
   **新格式 (v1.0.33):**
   ```json
   {
     "level": "info",
     "streams": [
       {
         "type": "console",
         "level": "info"
       }
     ],
     "requestTracking": {
       "enabled": true
     }
   }
   ```

2. **API 变更**
   
   **旧 API:**
   ```typescript
   logger.log('info', 'message');
   ```
   
   **新 API:**
   ```typescript
   logger.info('message');
   ```

#### 升级步骤

1. **备份当前配置**
   ```bash
   cp ~/.claude-code-router/config.json ~/.claude-code-router/config.json.backup
   ```

2. **更新配置文件格式**
   ```bash
   # 使用迁移脚本
   node scripts/migrate-config.js
   ```

3. **更新代码中的 API 调用**
   ```bash
   # 使用代码迁移工具
   npm run migrate:code
   ```

4. **验证升级**
   ```bash
   # 运行兼容性测试
   npm run test:compatibility
   
   # 验证功能
   npm run test:functional
   ```

5. **部署升级**
   ```bash
   # 更新依赖
   npm update
   
   # 重启服务
   ccr restart
   ```

### 从 v1.0.31 升级到 v1.0.32

#### 主要变更

1. **新增子代理路由支持**
2. **改进令牌计数传递**
3. **修复模型名称兼容性问题**

#### 升级步骤

1. **更新依赖**
   ```bash
   npm update
   ```

2. **验证配置**
   ```bash
   ccr status
   ```

3. **测试功能**
   ```bash
   ccr code "测试消息"
   ```

## 向后兼容性

### 支持期限

- **v1.0.x**: 支持 12 个月
- **v1.1.x**: 支持 18 个月
- **v2.0.x**: 支持 24 个月

### 弃用政策

- **功能弃用**: 提前 3 个月通知
- **API 弃用**: 提前 6 个月通知
- **配置弃用**: 提前 3 个月通知

### 弃用示例

```typescript
// 弃用警告示例
@deprecated('use Logger instead')
class LegacyLogger {
  log(message: string) {
    console.warn('LegacyLogger is deprecated. Use Logger instead.');
    // ...
  }
}

// 迁移指南
/**
 * @deprecated This method is deprecated since v1.0.33. 
 * Use the new request tracking system instead.
 * 
 * @see RequestTracker
 */
function trackLegacyRequest(requestId: string): LegacyTracker {
  console.warn('trackLegacyRequest is deprecated. Use RequestTracker instead.');
  return new RequestTracker(requestId);
}
```

## 贡献指南

### 报告问题

如果您发现错误或有改进建议，请：

1. 检查 [Issues](https://github.com/your-org/claude-code-router/issues) 页面
2. 搜索现有问题
3. 如果没有相关问题，创建新问题

### 提交变更

提交变更时，请：

1. 遵循变更日志格式
2. 包含测试用例
3. 更新相关文档
4. 通过所有测试

### 变更日志格式要求

提交 PR 时，请更新 `CHANGELOG.md` 文件：

```markdown
## [Unreleased]

### Added
- 您的新功能描述

### Changed
- 您的改进描述

### Fixed
- 您的修复描述
```

## 安全更新

### 安全漏洞报告

如果您发现安全漏洞，请：

1. 不要在公共 issue 中报告
2. 发送邮件到 security@your-org.com
3. 我们会及时响应并修复

### 安全更新说明

安全更新会以特殊格式标记：

```markdown
## [1.0.33] - 2024-01-04

### Security
- 修复配置文件读取的安全漏洞 (CVE-2024-XXXXX)
- 解决日志注入问题 (CVE-2024-XXXXY)
```

## 其他信息

### 时间戳格式

所有发布日期使用 ISO 8601 格式：
```
YYYY-MM-DD
```

### 链接规范

相关链接使用 Markdown 格式：
```markdown
- [查看文档](./docs/enhanced-logging-guide.md)
- [API 参考](./docs/api-reference.md)
- [GitHub Issues](https://github.com/your-org/claude-code-router/issues)
```

### 格式化工具

使用以下工具保持格式一致性：

```bash
# 格式化变更日志
npm run format:changelog

# 验证变更日志格式
npm run validate:changelog
```

这个变更日志提供了完整的版本历史记录和清晰的变更说明，帮助用户了解每个版本的变更内容并指导升级过程。