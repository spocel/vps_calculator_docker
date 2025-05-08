# 剩余价值计算器 v3

剩余价值计算器是一个网页应用程序，旨在帮助用户计算域名、主机或其他周期性服务的剩余价值。它考虑了多种因素，如续费金额、汇率、续费周期和剩余天数，为用户提供准确的剩余价值估算。

演示地址：https://jsq.888656.xyz/

![1746662340625.webp](https://img.888656.xyz/i/2025/05/08/681bf3bd515f6.webp)

## 功能特点

- 支持多种货币的汇率转换
- 获取最新汇率数据
- 灵活的续费周期选择（月付到五年付）
- 精确的日期选择和验证
- 自动计算剩余天数
- 清晰直观的结果展示
- 响应式设计，适配各种设备


## 较原版改进

- 改为Docker容器化部署方式
- 优化用户界面，提升交互体验
- 修改汇率更新机制为实时获取 ([代码参考](https://linux.do/t/topic/227730/26))
- 增加一键截图上传复制功能，支持自定义图床链接
- 新增暗色模式/亮色模式切换功能


## 部署
```
docker run -d --name=jsq -p 8089:80 bobby567/calculator:latest
```

## 开发信息

本项目Fork自：https://github.com/Tomzhao1016/vps_surplus_value
最后更新：2024年10月

## 许可协议
本项目遵循原项目的许可协议。

## 致谢
- [er.aiuuo.com](https://er.aiuuo.com) - 提供实时汇率数据
- [Dooongの公益图床](https://www.nodeseek.com/post-43196-1) - 提供公益图床
- https://linux.do/t/topic/227730/27
- [NodeSeek 编辑器增强脚本](https://www.nodeseek.com/post-74493-1) - 提供图床上传代码参考
- 感谢claude 感谢mjj 感谢大鸡腿
