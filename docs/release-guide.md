# 版本发布指南

本文档提供了 Claude Code Router 增强日志系统的版本发布流程和相关说明。

## 版本号规范

我们遵循 [Semantic Versioning (SemVer)](https://semver.org/) 规范：

- **主版本号 (Major)**: 当进行不兼容的 API 更改时递增
- **次版本号 (Minor)**: 当以向后兼容的方式添加功能时递增  
- **修订版本号 (Patch)**: 当进行向后兼容的问题修复时递增

### 版本号示例

- `1.0.0` - 初始版本
- `1.1.0` - 添加新功能，向后兼容
- `1.1.1` - 修复 bug，向后兼容
- `2.0.0` - 重大更新，可能包含破坏性更改

## 发布流程

### 1. 准备发布

#### 1.1 检查代码状态

```bash
# 检查工作目录是否干净
git status

# 检查当前分支
git branch

# 拉取最新更改
git pull origin main

# 运行测试
npm test

# 运行构建
npm run build

# 运行代码检查
npm run lint
```

#### 1.2 更新版本号

```bash
# 更新 package.json 中的版本号
npm version patch   # 修复版本
npm version minor   # 次要版本
npm version major   # 主要版本

# 或者手动编辑 package.json
```

#### 1.3 更新变更日志

根据 [`CHANGELOG.md`](./CHANGELOG.md) 模板更新变更日志：

```markdown
## [1.0.1] - 2024-01-15

### Added
- 新功能描述

### Changed
- 改进描述

### Fixed
- 修复描述
```

### 2. 发布流程

#### 2.1 自动化发布脚本

使用项目提供的发布脚本：

```bash
# 运行发布脚本
npm run release
```

发布脚本会自动执行以下步骤：
1. 运行所有测试
2. 构建项目
3. 更新版本号
4. 生成变更日志
5. 创建 git 标签
6. 推送到远程仓库
7. 发布到 npm（如果适用）

#### 2.2 手动发布流程

如果需要手动发布：

```bash
# 1. 运行测试
npm test

# 2. 构建项目
npm run build

# 3. 提交更改
git add .
git commit -m "release: v1.0.1"

# 4. 创建标签
git tag -a v1.0.1 -m "Release version 1.0.1"

# 5. 推送到远程
git push origin main
git push origin v1.0.1

# 6. 发布到 npm（如果需要）
npm publish
```

### 3. 发布后检查

#### 3.1 验证发布

```bash
# 检查标签是否正确创建
git tag -l

# 检查远程仓库
git ls-remote --tags origin

# 验证包版本（如果发布到 npm）
npm view claude-code-router versions
```

#### 3.2 功能验证

```bash
# 安装新版本
npm install claude-code-router@latest

# 运行基本功能测试
node -e "
const { LogManager } = require('claude-code-router');
const manager = new LogManager();
manager.initialize().then(() => {
  console.log('✅ 版本发布验证成功');
}).catch(err => {
  console.error('❌ 版本发布验证失败:', err);
});
"
```

## 分支策略

### Git 分支模型

我们使用 Git Flow 分支策略：

```
main           # 主分支，始终可发布
├── develop    # 开发分支
├── feature/*  # 功能分支
├── hotfix/*   # 紧急修复分支
└── release/*  # 发布准备分支
```

### 分支命名规范

#### 功能分支
```
feature/enhanced-logging
feature/request-tracking
feature/performance-optimization
```

#### 修复分支
```
hotfix/memory-leak
hotfix/log-rotation
hotfix/config-validation
```

#### 发布分支
```
release/v1.0.1
release/v1.1.0
release/v2.0.0
```

## 变更日志管理

### 变更日志格式

```markdown
# 变更日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/) 规范。

## [Unreleased]

### Added
- 新功能（待发布）

### Changed
- 改进（待发布）

### Fixed
- 修复（待发布）

## [1.0.0] - 2024-01-01

### Added
- 初始版本发布
- 增强日志系统
- 请求跟踪功能
- 性能优化
- 完整文档
```

### 变更日志维护

#### 1. 开发阶段

在开发过程中，及时更新 `Unreleased` 部分：

```markdown
## [Unreleased]

### Added
- 添加新的日志级别支持
- 实现自定义流处理器
```

#### 2. 发布前

发布前将 `Unreleased` 内容移到新版本：

```markdown
## [1.0.1] - 2024-01-15

### Added
- 添加新的日志级别支持
- 实现自定义流处理器

## [Unreleased]
```

#### 3. 发布后

清空 `Unreleased` 部分，为下一个版本做准备：

```markdown
## [Unreleased]
```

## 回滚策略

### 1. 快速回滚

如果发布后发现严重问题：

```bash
# 回滚到上一个版本
git checkout v1.0.0

# 创建回滚分支
git checkout -b hotfix/rollback-v1.0.1

# 修复问题后重新发布
git checkout main
git merge hotfix/rollback-v1.0.1
git tag v1.0.2
git push origin main v1.0.2
```

### 2. 紧急修复

对于需要立即修复的问题：

```bash
# 从上一个标签创建修复分支
git checkout -b hotfix/critical-bug v1.0.1

# 修复问题
# ... 修复代码 ...

# 提交修复
git commit -m "hotfix: 修复关键问题"

# 合并到主分支
git checkout main
git merge hotfix/critical-bug

# 创建新版本
git tag v1.0.2
git push origin main v1.0.2
```

## 测试策略

### 1. 发布前测试清单

#### 单元测试
```bash
# 运行所有单元测试
npm run test:unit

# 运行特定模块测试
npm run test:unit LogManager
npm run test:unit RequestTracker
npm run test:unit ErrorLogger
```

#### 集成测试
```bash
# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e
```

#### 性能测试
```bash
# 运行性能测试
npm run test:performance

# 生成性能报告
npm run test:performance:report
```

#### 兼容性测试
```bash
# 测试 Node.js 版本兼容性
npm run test:compatibility

# 测试向后兼容性
npm run test:backward-compatibility
```

### 2. 测试覆盖率要求

- **单元测试覆盖率**: 最低 80%
- **集成测试覆盖率**: 最低 70%
- **端到端测试**: 所有关键功能必须覆盖

```bash
# 检查测试覆盖率
npm run test:coverage

# 生成覆盖率报告
npm run test:coverage:report
```

## 文档更新

### 1. 文档检查清单

发布前确保以下文档已更新：

- [ ] `README.md` - 主要功能说明和配置
- [ ] `CHANGELOG.md` - 版本变更记录
- [ ] `docs/enhanced-logging-guide.md` - 使用指南
- [ ] `docs/api-reference.md` - API 参考
- [ ] `docs/performance-optimization.md` - 性能优化
- [ ] `docs/troubleshooting.md` - 故障排除
- [ ] `docs/deployment.md` - 部署指南

### 2. 文档生成脚本

```bash
# 生成 API 文档
npm run docs:generate

# 验证文档链接
npm run docs:check

# 构建文档网站
npm run docs:build
```

## 发布通知

### 1. 内部通知

发布完成后，通知团队成员：

```markdown
🎉 **新版本发布通知**

版本：v1.0.1
发布时间：2024-01-15

### 主要更新
- 功能1描述
- 功能2描述
- 修复1描述

### 升级指南
[升级指南链接](./docs/upgrade-guide.md)

### 注意事项
- 注意事项1
- 注意事项2

请及时升级并反馈问题。
```

### 2. 用户通知

如果项目有用户社区，发布公告：

```markdown
# Claude Code Router v1.0.1 发布

我们很高兴地宣布 Claude Code Router v1.0.1 已经发布！

## 新功能
- 🚀 功能1：描述
- 🚀 功能2：描述

## 改进
- ⚡ 改进1：描述
- ⚡ 改进2：描述

## 修复
- 🐛 修复1：描述
- 🐛 修复2：描述

## 升级方式
```bash
npm update claude-code-router
```

## 文档
[查看完整文档](https://docs.claude-code-router.com)

感谢您的支持！
```

## 监控和反馈

### 1. 发布后监控

发布后 72 小时内密切监控：

```bash
# 监控错误日志
tail -f ./logs/error.log

# 监控系统性能
top -p $(pgrep -f claude-code-router)

# 检查内存使用
ps aux | grep claude-code-router | awk '{print $4}'
```

### 2. 用户反馈收集

建立反馈收集机制：

```typescript
// 反馈收集示例
class FeedbackCollector {
  collect(feedback: UserFeedback) {
    // 存储反馈
    this.storeFeedback(feedback);
    
    // 分析反馈
    this.analyzeFeedback(feedback);
    
    // 必要时创建 issue
    if (feedback.severity === 'high') {
      this.createIssue(feedback);
    }
  }
}
```

## 版本兼容性

### 1. 向后兼容性承诺

- **Patch 版本**: 完全向后兼容
- **Minor 版本**: 向后兼容，可能添加新功能
- **Major 版本**: 可能包含破坏性更改

### 2. 弃用策略

对于需要弃用的功能：

```typescript
// 弃用警告示例
function deprecatedFunction() {
  console.warn('Warning: deprecatedFunction is deprecated and will be removed in v2.0.0. Use newFunction instead.');
  return newFunction();
}
```

### 3. 升级指南

为每个主要版本提供升级指南：

```markdown
# 升级到 v2.0.0

## 破坏性更改

### 1. 配置格式变更
**旧格式：**
```json
{
  "logLevel": "info"
}
```

**新格式：**
```json
{
  "level": "info"
}
```

### 2. API 变更
**旧 API：**
```typescript
logger.log('info', 'message');
```

**新 API：**
```typescript
logger.info('message');
```

## 升级步骤

1. 更新配置文件格式
2. 更新 API 调用
3. 运行兼容性测试
4. 部署到测试环境
5. 验证功能
6. 部署到生产环境
```

## 发布检查清单

### 发布前检查
- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 文档更新完成
- [ ] 变更日志更新
- [ ] 版本号更新
- [ ] 构建成功
- [ ] 安全检查通过

### 发布时检查
- [ ] 创建 git 标签
- [ ] 推送到远程仓库
- [ ] 发布到包管理器
- [ ] 发布通知发送
- [ ] 监控系统启用

### 发布后检查
- [ ] 功能验证完成
- [ ] 性能监控正常
- [ ] 错误率在正常范围
- [ ] 用户反馈收集
- [ ] 文档访问正常
- [ ] 回滚计划准备

这个版本发布指南提供了完整的发布流程、最佳实践和检查清单，确保每次发布都能顺利进行并及时发现和解决问题。