# Phase Manager

**汎用ワークフロー監視ツール / Generic Workflow Monitor**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)]()

---

## 概要 / Overview

Phase Managerは、AIと人間のコラボレーションによる開発ワークフローを監視・可視化するツールです。
フレームワークを差し替えることで、様々な開発スタイルに対応できます。

*Phase Manager is a tool for monitoring and visualizing development workflows through AI-human collaboration.
By swapping frameworks, it can adapt to various development styles.*

---

## 特徴 / Features

- **履歴駆動** - `.phase-manager-history.yml` をSingle Source of Truthとして状態を自動導出
  *History-Driven - Automatically derives state from `.phase-manager-history.yml` as Single Source of Truth*

- **フレームワーク分離** - ワークフロー定義を外部フレームワークとして分離
  *Framework Separation - Workflow definitions separated as external frameworks*

- **自動更新** - 3秒間隔のポーリングで状態を自動更新
  *Auto-Refresh - Automatically updates state with 3-second polling*

- **プロンプト表示** - 各フェーズのプロンプトをワンクリックで表示・コピー
  *Prompt Display - One-click display and copy of prompts for each phase*

---

## アーキテクチャ / Architecture

```
┌─────────────────────────────────────────┐
│         .phase-manager-history.yml      │
│         (Single Source of Truth)        │
└────────────────┬────────────────────────┘
                 │ ポーリング / Polling (3s)
                 ▼
┌─────────────────────────────────────────┐
│         Phase Manager (Monitor)         │
│  [自動更新 / Auto-Refresh]              │
│  [介入機能 / Intervention]              │
└─────────────────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     ▼                       ▼
┌──────────┐          ┌──────────────┐
│ builtin/ │          │ framework/   │
│ 内蔵     │          │ 外部FW       │
│ フェーズ │          │ (submodule)  │
└──────────┘          └──────────────┘
```

---

## ディレクトリ構成 / Directory Structure

```
phase-manager/
├── README.md
├── setup.ps1          # Windowsセットアップ / Windows setup
├── setup.sh           # Unix/Macセットアップ / Unix/Mac setup
├── builtin/           # 内蔵フェーズ / Built-in phases
│   ├── frameworks.yml # 利用可能フレームワーク一覧 / Available frameworks
│   ├── phases.yml     # 内蔵フェーズ定義 / Built-in phase definitions
│   └── prompts/       # 内蔵プロンプト / Built-in prompts
└── tools/             # サーバー・UI / Server & UI
    ├── package.json
    ├── server.js
    └── public/
        └── index.html
```

---

## セットアップ / Setup

### 新規プロジェクトへの導入 / New Project Installation

```powershell
# Windows
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/R1tzKrackers/phase-manager/main/setup.ps1" -OutFile "setup.ps1"
.\setup.ps1
```

```bash
# Unix/Mac
curl -fsSL https://raw.githubusercontent.com/R1tzKrackers/phase-manager/main/setup.sh | bash
```

### 手動セットアップ / Manual Setup

1. このリポジトリを `.phase-manager/` としてクローン
   *Clone this repository as `.phase-manager/`*

2. プロジェクトルートに `project-config.yml` を作成
   *Create `project-config.yml` at project root*

3. フレームワークを `.phase-manager/framework/` に配置（サブモジュール推奨）
   *Place framework in `.phase-manager/framework/` (submodule recommended)*

---

## 使用方法 / Usage

### 起動 / Start

```powershell
# Windows
.\phase-manager.ps1
```

```bash
# Unix/Mac
./phase-manager.sh
```

ブラウザが自動で開き、`http://localhost:3100` にアクセスします。
*Browser opens automatically and navigates to `http://localhost:3100`.*

### ワークフロー / Workflow

1. **フレームワーク選択** - 初回起動時にフレームワークを選択
   *Framework Selection - Select a framework on first launch*

2. **フレームワークセットアップ** - フレームワークをサブモジュールとして追加
   *Framework Setup - Add framework as a submodule*

3. **プロジェクト開発** - フレームワーク定義のワークフローに従って開発
   *Project Development - Develop following the framework-defined workflow*

---

## 対応フレームワーク / Supported Frameworks

| フレームワーク / Framework | 説明 / Description |
|---------------------------|---------------------|
| [ux-contract-dev](https://github.com/pritzcrkers/ux-contract-dev) | UX駆動開発 / UX-driven development |
| api-contract-dev | API駆動開発 / API-driven development (coming soon) |
| cli-contract-dev | CLI駆動開発 / CLI-driven development (coming soon) |

---

## 設定ファイル / Configuration Files

### project-config.yml

プロジェクト固有の設定を定義します。
*Defines project-specific configuration.*

```yaml
project:
  name: "my-project"
  description: "Project description"

directories:
  ux_spec: "docs/ux"
  detail_spec: "docs/detail"
  impl: "src"
  test: "tests"

roles:
  design: "Designer"
  impl: "Developer"

framework:
  id: "ux-contract-dev"
```

### .phase-manager-history.yml

ワークフローの履歴を記録します（自動管理）。
*Records workflow history (auto-managed).*

```yaml
history:
  - phase: "00-framework-init"
    status: "complete"
    comment: "Framework selected: ux-contract-dev"
    timestamp: "2026-02-01T00:00:00Z"
```

---

## 前提条件 / Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

---

## ライセンス / License

MIT License

---

## ドキュメント / Documentation

- [Framework Development Specification](docs/framework-spec.md) - カスタムフレームワーク開発ガイド / Custom framework development guide

---

## 関連 / Related

- [UX Contract Framework](https://github.com/R1tzKrackers/ux-contract-dev) - UX駆動開発フレームワーク / UX-driven development framework
