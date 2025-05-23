# 剩余价值计算器 v3

剩余价值计算器是一个网页应用程序，旨在帮助用户计算主机、域名或其他周期性服务的剩余价值。它考虑了多种因素，如续费金额、汇率、续费周期和剩余天数，为用户提供准确的剩余价值估算，方便用户进行二手交易。

演示地址：[netcup](https://jsq.666831.xyz/) |
备用地址: [cf page](https://vps-calculator-docker.pages.dev/)

![1747670394393.png](https://image.dooo.ng/c/2025/05/19/682b557c1843c.webp)

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
- 修改汇率更新机制为实时获取
- 增加一键截图上传复制功能，支持自定义图床链接
- 新增暗色模式/亮色模式切换功能


## 部署
### docker一键部署
```
docker run -d --name=jsq -p 8089:80 bobby567/calculator:latest
```

### Cloudflare Page / Github Page
自行部署

## 开发信息

本项目Fork自：https://github.com/Tomzhao1016/vps_surplus_value
最后更新：2024年10月

## 许可协议
本项目遵循原项目的许可协议。

## 致谢
- [pengzhile](https://linux.do/t/topic/227730/26) - 提供实时汇率代码
- [Dooongの公益图床](https://www.nodeseek.com/post-43196-1) - 提供公益图床
- [NodeSeek 编辑器增强脚本](https://www.nodeseek.com/post-74493-1) - 提供图床上传代码参考
- mjj - 提供鸡腿
