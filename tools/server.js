/**
 * Phase Manager Server
 * 汎用ワークフロー監視ツール（フレームワーク対応版）
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const app = express();
const PORT = 3100;

// パス定義（.phase-manager/tools/ から2階層上がプロジェクトルート）
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PM_ROOT = path.resolve(__dirname, '..');
const BUILTIN_DIR = path.join(PM_ROOT, 'builtin');
const FRAMEWORK_DIR = path.join(PM_ROOT, 'framework');

// ファイルパス
const CONFIG_FILE = path.join(PROJECT_ROOT, 'project-config.yml');
const HISTORY_FILE = path.join(PROJECT_ROOT, '.phase-manager-history.yml');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// ファイル読み込み関数
// =====================================================

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return yaml.load(fs.readFileSync(CONFIG_FILE, 'utf8')) || {};
    }
  } catch (e) {
    console.error('Config file read error:', e);
  }
  return {};
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, 'utf8');
      if (!content.trim()) return [];
      const data = yaml.load(content);
      return Array.isArray(data) ? data : (data?.history || []);
    }
  } catch (e) {
    console.error('History file read error:', e);
  }
  return [];
}

function saveHistory(history) {
  const content = history.map(entry => {
    let yml = `- phase: "${entry.phase}"\n`;
    yml += `  status: "${entry.status}"\n`;
    if (entry.comment) yml += `  comment: "${entry.comment}"\n`;
    if (entry.target) yml += `  target: "${entry.target}"\n`;
    yml += `  timestamp: "${entry.timestamp}"`;
    return yml;
  }).join('\n');
  fs.writeFileSync(HISTORY_FILE, content + '\n', 'utf8');
}

function loadBuiltinPhases() {
  const phasesFile = path.join(BUILTIN_DIR, 'phases.yml');
  try {
    if (fs.existsSync(phasesFile)) {
      const data = yaml.load(fs.readFileSync(phasesFile, 'utf8'));
      return data?.phases || [];
    }
  } catch (e) {
    console.error('Builtin phases read error:', e);
  }
  return [];
}

function loadFrameworkManifest() {
  const manifestFile = path.join(FRAMEWORK_DIR, 'framework.yml');
  try {
    if (fs.existsSync(manifestFile)) {
      return yaml.load(fs.readFileSync(manifestFile, 'utf8')) || {};
    }
  } catch (e) {
    console.error('Framework manifest read error:', e);
  }
  return null;
}

function loadFrameworksList() {
  const frameworksFile = path.join(BUILTIN_DIR, 'frameworks.yml');
  try {
    if (fs.existsSync(frameworksFile)) {
      const data = yaml.load(fs.readFileSync(frameworksFile, 'utf8'));
      return data?.frameworks || [];
    }
  } catch (e) {
    console.error('Frameworks list read error:', e);
  }
  return [];
}

// =====================================================
// 検証ロジック
// =====================================================

function validateState() {
  const historyExists = fs.existsSync(HISTORY_FILE);
  const configExists = fs.existsSync(CONFIG_FILE);
  const frameworkExists = fs.existsSync(FRAMEWORK_DIR) &&
                          fs.existsSync(path.join(FRAMEWORK_DIR, 'framework.yml'));

  const config = loadConfig();
  const frameworkIdInConfig = config?.framework?.id;

  let frameworkIdMatch = false;
  if (frameworkExists && frameworkIdInConfig) {
    const manifest = loadFrameworkManifest();
    frameworkIdMatch = manifest?.meta?.id === frameworkIdInConfig;
  }

  return {
    historyExists,
    configExists,
    frameworkExists,
    frameworkIdInConfig,
    frameworkIdMatch,
    config
  };
}

function determineMode() {
  const state = validateState();

  // 履歴なし → フレームワークイニシャライズ
  if (!state.historyExists) {
    return { mode: 'builtin', phase: '00-framework-init', error: null };
  }

  // 履歴あり & config なし → エラー
  if (!state.configExists) {
    return { mode: 'error', phase: null, error: 'config_missing' };
  }

  // 履歴あり & config あり & framework.id なし → フレームワークイニシャライズ
  if (!state.frameworkIdInConfig) {
    return { mode: 'builtin', phase: '00-framework-init', error: null };
  }

  // 履歴あり & config あり & framework.id あり & framework/ なし → フレームワークセットアップ
  if (!state.frameworkExists) {
    return { mode: 'builtin', phase: '00-framework-setup', error: null };
  }

  // 履歴あり & config あり & framework.id あり & framework/ あり & 不一致 → エラー
  if (!state.frameworkIdMatch) {
    return { mode: 'error', phase: null, error: 'framework_mismatch' };
  }

  // フレームワーク固有フェーズ
  return { mode: 'framework', phase: null, error: null };
}

// =====================================================
// フェーズ管理
// =====================================================

function getPhases() {
  const modeInfo = determineMode();

  if (modeInfo.mode === 'builtin') {
    return loadBuiltinPhases();
  } else if (modeInfo.mode === 'framework') {
    const manifest = loadFrameworkManifest();
    return manifest?.phases || [];
  }

  return [];
}

function deriveStateFromHistory() {
  const history = loadHistory();
  const phases = getPhases();
  const modeInfo = determineMode();

  // 履歴が空の場合
  if (history.length === 0) {
    if (modeInfo.mode === 'builtin') {
      return {
        current_phase: modeInfo.phase,
        completed: [],
        frozen: false
      };
    }
    // フレームワークモードで履歴が空 → 最初のフレームワークフェーズ
    const firstPhase = phases[0]?.id || null;
    return {
      current_phase: firstPhase,
      completed: [],
      frozen: false
    };
  }

  const latest = history[history.length - 1];
  let current_phase;

  if (latest.status === 'complete') {
    const phase = phases.find(p => p.id === latest.phase);
    current_phase = phase?.next?.[0] || latest.phase;
  } else if (latest.status === 'reject') {
    current_phase = latest.target || latest.phase;
  } else {
    current_phase = latest.phase;
  }

  const completed = [...new Set(
    history
      .filter(h => h.status === 'complete')
      .map(h => h.phase)
  )];

  const frozen = history.some(
    h => h.phase === '09-design-freeze' && h.status === 'complete'
  );

  return { current_phase, completed, frozen };
}

// =====================================================
// プロンプト読み込み・変数展開
// =====================================================

function loadPrompt(phaseId) {
  const modeInfo = determineMode();
  let promptPath;

  if (modeInfo.mode === 'builtin') {
    promptPath = path.join(BUILTIN_DIR, 'prompts', `${phaseId}.md`);
  } else {
    const manifest = loadFrameworkManifest();
    const phase = manifest?.phases?.find(p => p.id === phaseId);
    if (phase?.prompt) {
      promptPath = path.join(FRAMEWORK_DIR, phase.prompt);
    }
  }

  if (promptPath && fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, 'utf8');
  }

  return null;
}

function expandVariables(content, config, manifest) {
  let result = content;

  // フレームワーク定義の変数を展開
  if (manifest?.variables) {
    for (const [varName, configPath] of Object.entries(manifest.variables)) {
      const value = getNestedValue(config, configPath);
      if (value) {
        const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
        result = result.replace(regex, value);
      }
    }
  }

  // PM内蔵変数を展開
  const frameworksList = loadFrameworksList();
  const frameworksListText = frameworksList.map(f =>
    `- **${f.name}** (${f.id})\n  ${f.description}\n  タグ: ${f.tags.join(', ')}`
  ).join('\n\n');
  result = result.replace(/\{\{FRAMEWORKS_LIST\}\}/g, frameworksListText);

  // フレームワーク情報変数
  if (config?.framework) {
    result = result.replace(/\{\{FRAMEWORK_NAME\}\}/g, config.framework.id || '');
    result = result.replace(/\{\{FRAMEWORK_REPO_URL\}\}/g, config.framework.repo_url || '');
  }

  return result;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// =====================================================
// API エンドポイント
// =====================================================

// API: 状態取得
app.get('/api/state', (req, res) => {
  const modeInfo = determineMode();

  if (modeInfo.error) {
    return res.json({
      error: modeInfo.error,
      phases: [],
      current_phase: null,
      mode: 'error'
    });
  }

  const derivedState = deriveStateFromHistory();
  const config = loadConfig();
  const phases = getPhases();
  const manifest = loadFrameworkManifest();

  const phasesWithStatus = phases.map(phase => ({
    ...phase,
    completed: derivedState.completed.includes(phase.id),
    current: derivedState.current_phase === phase.id
  }));

  res.json({
    phases: phasesWithStatus,
    current_phase: derivedState.current_phase,
    frozen: derivedState.frozen,
    mode: modeInfo.mode,
    framework: manifest?.meta || null,
    last_updated: new Date().toISOString(),
    config
  });
});

// API: プロンプト取得
app.get('/api/prompt/:phaseId', (req, res) => {
  const { phaseId } = req.params;
  const config = loadConfig();
  const manifest = loadFrameworkManifest();

  let content = loadPrompt(phaseId);
  if (!content) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  content = expandVariables(content, config, manifest);
  res.json({ content });
});

// API: 履歴取得
app.get('/api/history', (req, res) => {
  const history = loadHistory();
  const phases = getPhases();
  const enriched = history.map(entry => {
    const phase = phases.find(p => p.id === entry.phase);
    return { ...entry, phaseName: phase?.name || entry.phase };
  });
  res.json({ history: enriched });
});

// API: ポーリング
app.get('/api/poll', (req, res) => {
  const lastKnown = req.query.since;
  const history = loadHistory();

  // 検証も毎回実行
  const modeInfo = determineMode();
  if (modeInfo.error) {
    return res.json({ updated: true, error: modeInfo.error });
  }

  if (history.length === 0) {
    return res.json({ updated: !lastKnown, latestTimestamp: null });
  }

  const latest = history[history.length - 1];
  const hasUpdate = !lastKnown || latest.timestamp > lastKnown;

  res.json({
    updated: hasUpdate,
    latestTimestamp: latest?.timestamp || null
  });
});

// API: 緊急介入
app.post('/api/intervene', (req, res) => {
  const { phase, status, comment, target } = req.body;

  if (!phase || !status) {
    return res.status(400).json({ error: 'phase and status are required' });
  }

  const history = loadHistory();
  const entry = {
    phase,
    status,
    comment: comment ? `[手動介入] ${comment}` : '[手動介入]',
    timestamp: new Date().toISOString()
  };

  if (status === 'reject' && target) {
    entry.target = target;
  }

  history.push(entry);
  saveHistory(history);
  res.json({ success: true });
});

// API: リセット
app.post('/api/reset', (req, res) => {
  saveHistory([]);
  res.json({ success: true });
});

// API: サーバー停止
app.post('/api/shutdown', (req, res) => {
  res.json({ success: true, message: 'Server shutting down...' });
  console.log('\nShutting down server...');
  setTimeout(() => {
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  }, 500);
});

// =====================================================
// サーバー起動
// =====================================================

const server = app.listen(PORT, async () => {
  const modeInfo = determineMode();
  const modeText = modeInfo.mode === 'framework' ?
    `Framework: ${loadFrameworkManifest()?.meta?.name || 'Unknown'}` :
    modeInfo.mode === 'builtin' ? 'Built-in (Setup)' : `Error: ${modeInfo.error}`;

  console.log(`
╔════════════════════════════════════════════════╗
║        Phase Manager (Generic Monitor)         ║
║        http://localhost:${PORT}                    ║
╚════════════════════════════════════════════════╝

Project root: ${PROJECT_ROOT}
Mode: ${modeText}

Opening browser...
`);

  try {
    const { default: open } = await import('open');
    await open(`http://localhost:${PORT}`);
  } catch (e) {
    console.log('Could not open browser automatically. Please open manually.');
  }
});
