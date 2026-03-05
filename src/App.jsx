import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Home, CreditCard, PieChart as PieChartIcon, Plus, DollarSign, 
  TrendingUp, Landmark, Smartphone, Briefcase, X, Wallet, Edit2, 
  LineChart, TrendingDown, AlertTriangle, FileSpreadsheet, Download, 
  Upload, Copy, CheckCircle2, Coins, Sparkles, Loader2, RefreshCw, Feather, Settings
} from 'lucide-react';

// --- 常量与配置 ---
const ACCOUNT_TYPES = {
  BANK: { id: 'BANK', name: '银行账户', icon: Landmark, color: '#3b82f6' },
  BROKERAGE: { id: 'BROKERAGE', name: '券商账户', icon: Briefcase, color: '#8b5cf6' },
  DIGITAL: { id: 'DIGITAL', name: '数字钱包', icon: Smartphone, color: '#10b981' },
  OTHER: { id: 'OTHER', name: '其他资产', icon: Wallet, color: '#64748b' },
};

const INVEST_TYPES = {
  FUND: { id: 'FUND', name: '公募基金', color: '#f43f5e' }, 
  STOCK: { id: 'STOCK', name: '股票持仓', color: '#8b5cf6' }, 
  DEPOSIT: { id: 'DEPOSIT', name: '定期理财', color: '#0ea5e9' }, 
  GOLD: { id: 'GOLD', name: '黄金/贵金属', color: '#eab308' }, 
};

// 格式化货币 (手动拼接人民币符号，防止浏览器翻译插件误翻为日元)
const formatCurrency = (value) => {
  return '¥' + new Intl.NumberFormat('zh-CN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value);
};

// 生成过去30天的模拟历史数据
const generateMockHistory = () => {
  const history = [];
  const today = new Date();
  let baseTotal = 280000; 
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const randomFluctuation = (Math.random() - 0.3) * 3500;
    baseTotal += randomFluctuation;
    history.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      total: Math.round(baseTotal),
      fullDate: date.toISOString().split('T')[0]
    });
  }
  return history;
};

// 默认基础账户
const DEFAULT_ACCOUNTS = [
  { id: '1', name: '招商银行储蓄卡', type: 'BANK', balance: 45000 },
  { id: '3', name: '支付宝余额宝', type: 'DIGITAL', balance: 21500 },
  { id: '4', name: '微信零钱通', type: 'DIGITAL', balance: 8500 },
];

// 默认理财产品
const DEFAULT_INVESTMENTS = [
  { id: 'i1', name: '易方达蓝筹精选混合', type: 'FUND', principal: 50000, currentValue: 42500 },
  { id: 'i2', name: '招商中证白酒指数', type: 'FUND', principal: 20000, currentValue: 24800 },
  { id: 'i3', name: '贵州茅台 (600519)', type: 'STOCK', principal: 85000, currentValue: 92000 },
  { id: 'i4', name: '银行一年期大额存单', type: 'DEPOSIT', principal: 100000, currentValue: 102500, targetRate: 2.5 },
  { id: 'i5', name: '工商银行如意金条 50g', type: 'GOLD', principal: 25000, currentValue: 29800 },
];

// 生成微透明背景水印的 URL
const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350"><text x="50%" y="50%" transform="rotate(-30 175 175)" fill="rgba(100, 116, 139, 0.06)" font-size="22" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle" letter-spacing="2">@鹦鹉的梦境</text></svg>`;
const watermarkBgUrl = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(watermarkSvg)}")`;


export default function App() {
  // --- 状态管理 ---
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [investments, setInvestments] = useState(DEFAULT_INVESTMENTS);
  const [history, setHistory] = useState(generateMockHistory());
  
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isUpdateAccountModalOpen, setIsUpdateAccountModalOpen] = useState(false);
  const [isAddInvestModalOpen, setIsAddInvestModalOpen] = useState(false);
  const [isUpdateInvestModalOpen, setIsUpdateInvestModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'BANK', balance: '' });
  const [updateAmount, setUpdateAmount] = useState('');
  const [selectedInvest, setSelectedInvest] = useState(null);
  const [newInvest, setNewInvest] = useState({ name: '', type: 'FUND', principal: '', currentValue: '', targetRate: '' });
  const [updateInvestValue, setUpdateInvestValue] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, id: null, name: '' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const fileInputRef = useRef(null);
  
  const [aiReport, setAiReport] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // 从浏览器本地存储读取 API Key，防止刷新丢失
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [tempApiKey, setTempApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('gemini_base_url') || 'https://generativelanguage.googleapis.com');
  const [tempApiBaseUrl, setTempApiBaseUrl] = useState('');

  // --- 派生数据 (增加安全校验) ---
  const totalAccountBalance = useMemo(() => accounts.reduce((sum, acc) => sum + Number(acc.balance), 0), [accounts]);
  
  const investSummary = useMemo(() => investments.reduce((acc, inv) => {
      acc.totalPrincipal += Number(inv.principal || 0);
      acc.totalValue += Number(inv.currentValue || 0);
      return acc;
    }, { totalPrincipal: 0, totalValue: 0 }), [investments]);
    
  const totalAssets = totalAccountBalance + investSummary.totalValue;
  const totalInvestProfit = investSummary.totalValue - investSummary.totalPrincipal;
  const totalInvestYield = investSummary.totalPrincipal > 0 ? (totalInvestProfit / investSummary.totalPrincipal) * 100 : 0;

  const assetsDistribution = useMemo(() => {
    const dist = [
      { name: '基础账户(活期)', value: totalAccountBalance, color: '#3b82f6' },
      { name: '公募基金', value: 0, color: INVEST_TYPES.FUND.color },
      { name: '股票持仓', value: 0, color: INVEST_TYPES.STOCK.color },
      { name: '定期理财', value: 0, color: INVEST_TYPES.DEPOSIT.color },
      { name: '黄金/贵金属', value: 0, color: INVEST_TYPES.GOLD.color }
    ];
    investments.forEach(inv => {
      const typeInfo = INVEST_TYPES[inv.type];
      const targetName = typeInfo ? typeInfo.name : '未知资产';
      const target = dist.find(d => d.name === targetName);
      if (target) target.value += Number(inv.currentValue || 0);
    });
    
    const result = dist.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
    // 【防崩溃修复】：如果所有资产都被删除，提供一个空的占位，防止饼图崩溃
    return result.length > 0 ? result : [{ name: '暂无资产', value: 1, color: '#e2e8f0' }];
  }, [totalAccountBalance, investments]);

  const dailyChange = useMemo(() => {
    if (!history || history.length < 2) return { amount: 0, percent: 0 };
    const yesterdayTotal = history[history.length - 2].total;
    const change = totalAssets - yesterdayTotal;
    const percent = yesterdayTotal > 0 ? (change / yesterdayTotal) * 100 : 0;
    return { amount: change, percent: percent.toFixed(2) };
  }, [history, totalAssets]);

  // --- 效果 (安全更新状态) ---
  useEffect(() => {
    setHistory(prev => {
      if (!prev || prev.length === 0) return prev;
      // 避免直接修改原数组中的对象，采用不可变数据更新方式防崩溃
      const newHistory = [...prev];
      const todayString = new Date().toISOString().split('T')[0];
      const lastEntry = newHistory[newHistory.length - 1];
      
      if (lastEntry && lastEntry.fullDate === todayString) {
        newHistory[newHistory.length - 1] = { ...lastEntry, total: totalAssets };
      } else {
        newHistory.push({ date: `${new Date().getMonth() + 1}/${new Date().getDate()}`, total: totalAssets, fullDate: todayString });
      }
      return newHistory;
    });
  }, [totalAssets]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- API: 生成 AI 分析报告 ---
  const generateAiReport = async () => {
    if (!apiKey) {
      showToast('请先配置 Gemini API Key', 'error');
      setTempApiKey('');
      setIsSettingsModalOpen(true);
      return;
    }

    setIsAIModalOpen(true);
    if (aiReport && !isAiLoading) return;

    setIsAiLoading(true);
    setAiReport('');

    const contextData = {
      totalAssets: totalAssets,
      totalInvestProfit: totalInvestProfit,
      yieldRate: totalInvestYield.toFixed(2) + '%',
      distribution: assetsDistribution.filter(d => d.name !== '暂无资产').map(d => ({
        type: d.name,
        amount: d.value,
        percentage: totalAssets > 0 ? ((d.value / totalAssets) * 100).toFixed(1) + '%' : '0%'
      })),
      topInvestments: [...investments].sort((a, b) => b.currentValue - a.currentValue).slice(0, 3).map(i => ({
        name: i.name,
        type: INVEST_TYPES[i.type]?.name || '未知',
        profit: i.currentValue - i.principal
      }))
    };

    const promptText = `
      你是一个专业的个人理财顾问。请根据以下用户的资产数据，提供一份简短、专业、富有洞察力的资产诊断报告。
      
      【用户当前资产数据】
      - 总资产: ¥${contextData.totalAssets}
      - 理财累计盈亏: ¥${contextData.totalInvestProfit} (总收益率: ${contextData.yieldRate})
      - 资产大类占比: ${contextData.distribution.map(d => `${d.type}(${d.percentage})`).join(', ')}
      - 核心持仓(前三): ${contextData.topInvestments.map(i => `${i.name}[盈亏:¥${i.profit}]`).join(', ')}

      【请按以下结构输出报告】（使用 Markdown 格式，保持在 300 字以内）
      1. **资产结构诊断**：评价当前的风险与流动性分布是否合理（例如：现金是否过多/过少，权益类资产比例等）。如果有黄金，评价其避险作用。
      2. **收益表现点评**：简评当前的盈亏状况及核心持仓表现。
      3. **下一步优化建议**：给出2-3条具体可行的调整建议。
      
      语气要专业、客观，鼓励用户。
    `;

    try {
      const baseUrl = apiBaseUrl.replace(/\/$/, ''); // 移除末尾斜杠
      const url = `${baseUrl}/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      let retries = 3;
      let delay = 1000;
      let result = null;

      while (retries > 0) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              systemInstruction: { parts: [{ text: "你是一个严肃且专业的AI财务顾问助手。" }] }
            })
          });
          if (!response.ok) throw new Error(`HTTP Error: ${response.status} - 请检查代理或模型名称`);
          result = await response.json();
          break; 
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }

      if (result && result.candidates && result.candidates[0]) {
        const text = result.candidates[0].content.parts[0].text;
        setAiReport(text);
      } else {
        throw new Error(result.error ? result.error.message : "接口返回数据格式异常");
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
      setAiReport(`❌ AI 诊断失败。\n\n**可能的原因：**\n1. **网络连接失败**：由于 Google 服务在国内被墙，请确保您已开启**全局代理(VPN)**，或者在右上方"设置"中配置有效的 API 代理地址。\n2. **密钥异常**：API Key 错误或没有配额。\n\n*详细报错：${error.message}*`);
    } finally {
      setIsAiLoading(false);
    }
  };


  // --- 处理函数 ---
  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccount.name || !newAccount.balance) return;
    setAccounts([...accounts, { id: Date.now().toString(), name: newAccount.name, type: newAccount.type, balance: Number(newAccount.balance) }]);
    setNewAccount({ name: '', type: 'BANK', balance: '' });
    setIsAddAccountModalOpen(false);
    showToast('账户添加成功');
  };

  const handleUpdateAccount = (e) => {
    e.preventDefault();
    if (!selectedAccount || updateAmount === '') return;
    setAccounts(accounts.map(acc => acc.id === selectedAccount.id ? { ...acc, balance: Number(updateAmount) } : acc));
    setIsUpdateAccountModalOpen(false);
    setSelectedAccount(null);
    showToast('余额更新成功');
  };

  const promptDeleteAccount = (id, name) => setDeleteConfirm({ isOpen: true, type: 'ACCOUNT', id, name });

  const handleAddInvestment = (e) => {
    e.preventDefault();
    if (!newInvest.name || !newInvest.principal || !newInvest.currentValue) return;
    const investment = {
      id: `inv_${Date.now()}`, name: newInvest.name, type: newInvest.type,
      principal: Number(newInvest.principal), currentValue: Number(newInvest.currentValue),
      targetRate: newInvest.type === 'DEPOSIT' ? Number(newInvest.targetRate || 0) : null
    };
    setInvestments([...investments, investment]);
    setNewInvest({ name: '', type: 'FUND', principal: '', currentValue: '', targetRate: '' });
    setIsAddInvestModalOpen(false);
    showToast('记录添加成功');
  };

  const handleUpdateInvestment = (e) => {
    e.preventDefault();
    if (!selectedInvest || updateInvestValue === '') return;
    setInvestments(investments.map(inv => inv.id === selectedInvest.id ? { ...inv, currentValue: Number(updateInvestValue) } : inv));
    setIsUpdateInvestModalOpen(false);
    setSelectedInvest(null);
    showToast('市值更新成功');
  };

  const promptDeleteInvestment = (id, name) => setDeleteConfirm({ isOpen: true, type: 'INVESTMENT', id, name });

  const executeDelete = () => {
    if (deleteConfirm.type === 'ACCOUNT') {
      setAccounts(accounts.filter(acc => acc.id !== deleteConfirm.id));
    } else if (deleteConfirm.type === 'INVESTMENT') {
      setInvestments(investments.filter(inv => inv.id !== deleteConfirm.id));
    }
    setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
    showToast('删除成功');
  };

  // --- 数据导入导出 ---
  const generateDataContent = (separator = ',') => {
    let content = `资产大类${separator}资产名称${separator}资产分类${separator}投入本金${separator}当前余额或市值\n`;
    accounts.forEach(acc => {
      content += `基础账户${separator}${acc.name}${separator}${ACCOUNT_TYPES[acc.type]?.name || acc.type}${separator}${acc.balance}${separator}${acc.balance}\n`;
    });
    investments.forEach(inv => {
      content += `理财产品${separator}${inv.name}${separator}${INVEST_TYPES[inv.type]?.name || inv.type}${separator}${inv.principal}${separator}${inv.currentValue}\n`;
    });
    return content;
  };

  const handleExportCSV = () => {
    const csvContent = "\uFEFF" + generateDataContent(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `鹦鹉的梦境_资产备份_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV 导出成功！');
  };

  const handleCopyToSheets = () => {
    const tsvContent = generateDataContent('\t');
    const textArea = document.createElement("textarea");
    textArea.value = tsvContent;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('数据已复制！请直接在 Google Sheets 中粘贴');
    } catch (err) {
      showToast('复制失败，请重试', 'error');
    }
    document.body.removeChild(textArea);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        
        let newAccounts = [];
        let newInvestments = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = lines[i].split(',').map(col => col.trim());
          if (cols.length < 5) continue;
          
          const category = cols[0].replace(/['"]/g, '');
          const name = cols[1].replace(/['"]/g, '');
          const typeName = cols[2].replace(/['"]/g, '');
          const principal = parseFloat(cols[3]);
          const currentValue = parseFloat(cols[4]);

          if (category.includes('基础账户')) {
            let typeId = 'BANK';
            if (typeName.includes('数字') || typeName.includes('钱包')) typeId = 'DIGITAL';
            else if (typeName.includes('券商')) typeId = 'BROKERAGE';
            newAccounts.push({ id: `imported_acc_${Date.now()}_${i}`, name, type: typeId, balance: currentValue });
          } else if (category.includes('理财')) {
            let typeId = 'FUND';
            if (typeName.includes('股票')) typeId = 'STOCK';
            else if (typeName.includes('定期') || typeName.includes('存款')) typeId = 'DEPOSIT';
            else if (typeName.includes('黄金') || typeName.includes('贵金属')) typeId = 'GOLD'; 
            newInvestments.push({ id: `imported_inv_${Date.now()}_${i}`, name, type: typeId, principal, currentValue });
          }
        }
        
        if (newAccounts.length > 0 || newInvestments.length > 0) {
          setAccounts([...accounts, ...newAccounts]);
          setInvestments([...investments, ...newInvestments]);
          setIsDataModalOpen(false);
          showToast(`成功导入 ${newAccounts.length} 个账户, ${newInvestments.length} 个理财记录`);
        } else {
          showToast('未能从文件中识别到有效数据', 'error');
        }
      } catch (err) {
        showToast('读取文件失败，请确保格式正确', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 辅助组件：收益率药丸标签
  const YieldBadge = ({ value, isPercent = false }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const colorClass = isPositive ? 'text-rose-600 bg-rose-50 border-rose-100' : 
                       isNegative ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 
                       'text-slate-600 bg-slate-50 border-slate-200';
    const sign = isPositive ? '+' : '';
    // 防崩溃保护
    const displayValue = isPercent ? `${sign}${(value || 0).toFixed(2)}%` : `${sign}${formatCurrency(value || 0).replace('¥', '')}`;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
        {isPositive && <TrendingUp size={12} className="mr-1" />}
        {isNegative && <TrendingDown size={12} className="mr-1" />}
        {!isPositive && !isNegative && <span className="mr-1">-</span>}
        {displayValue}
      </span>
    );
  };

  // --- 页面渲染组件 ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <button 
          onClick={generateAiReport}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-violet-200"
        >
          <Sparkles size={16} className="mr-2" />
          获取 AI 资产配置诊断
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-md text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-center mb-4 opacity-80 relative z-10">
            <h3 className="font-medium">总资产净值</h3>
            <span className="text-xl font-bold font-mono">¥</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(totalAssets)}</div>
            <div className="text-sm mt-2 flex items-center opacity-90">
              <span className="mr-2">较昨日</span>
              <span className={`flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${dailyChange.amount >= 0 ? 'bg-white/20' : 'bg-black/20'}`}>
                {dailyChange.amount >= 0 ? '+' : ''}{formatCurrency(dailyChange.amount)} ({dailyChange.amount >= 0 ? '+' : ''}{dailyChange.percent}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-500 font-medium">理财及黄金累计收益</h3>
            <div className={`p-2 rounded-lg ${totalInvestProfit >= 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
              <LineChart size={20} />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${totalInvestProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalInvestProfit > 0 ? '+' : ''}{formatCurrency(totalInvestProfit)}
            </div>
            <div className="text-sm mt-2 flex items-center text-slate-500">
              总投入: {formatCurrency(investSummary.totalPrincipal)}
              <span className="mx-2">|</span>
              总收益率: <span className={`ml-1 font-medium ${totalInvestProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{totalInvestYield > 0 ? '+' : ''}{totalInvestYield.toFixed(2)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
           <h3 className="text-slate-800 font-semibold mb-2 flex items-center">
            <PieChartIcon size={16} className="mr-2 text-slate-400" />
            资产分布
          </h3>
          <div className="flex h-24 items-center">
             <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetsDistribution} cx="50%" cy="50%" innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value">
                      {assetsDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="w-1/2 pl-2 flex flex-col justify-center space-y-1">
                {assetsDistribution.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center truncate max-w-[80px]">
                      <div className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                      <span className="text-slate-600 truncate" title={item.name}>{item.name}</span>
                    </div>
                    {/* 【防崩溃修复】：增加除以0判断保护 */}
                    <span className="font-medium text-slate-800 ml-1">
                      {totalAssets > 0 ? ((item.value / totalAssets) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-slate-800 font-semibold mb-6 flex items-center">
          <TrendingUp size={18} className="mr-2 text-slate-400" />
          近30天资产净值趋势
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} minTickGap={20}/>
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => `${(value/10000).toFixed(0)}w`}
                domain={['auto', 'auto']}
                width={40}
              />
              <RechartsTooltip 
                formatter={(value) => [formatCurrency(value), '总资产']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderInvestments = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">理财产品与收益计算</h2>
          <p className="text-sm text-slate-500 mt-1">记录本金与现值，包含基金、股票、<strong className="text-yellow-600">黄金</strong>等</p>
        </div>
        <button 
          onClick={() => setIsAddInvestModalOpen(true)}
          className="flex items-center px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} className="mr-1" /> 添加资产记录
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-6 items-center shadow-sm">
        <div>
          <p className="text-xs text-slate-500 mb-1">投资总市值</p>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(investSummary.totalValue)}</p>
        </div>
        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
        <div>
           <p className="text-xs text-slate-500 mb-1">投入总本金</p>
           <p className="text-lg font-semibold text-slate-600">{formatCurrency(investSummary.totalPrincipal)}</p>
        </div>
        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
        <div>
           <p className="text-xs text-slate-500 mb-1">累计总盈亏</p>
           <div className="flex items-center space-x-2">
             <span className={`text-lg font-bold ${totalInvestProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {totalInvestProfit > 0 ? '+' : ''}{formatCurrency(totalInvestProfit)}
             </span>
             <YieldBadge value={totalInvestYield} isPercent={true} />
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="px-6 py-4 font-medium whitespace-nowrap">资产名称</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">投入本金</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">当前市值/余额</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">累计盈亏</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">收益率</th>
                <th className="px-6 py-4 font-medium text-center whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investments.map(inv => {
                // 【防崩溃修复】确保即便除以 0 也不会崩溃 (0 本金的情况)
                const profit = (inv.currentValue || 0) - (inv.principal || 0);
                const yieldRate = inv.principal > 0 ? (profit / inv.principal) * 100 : 0;
                
                // 【防崩溃修复】容错未知的投资类型
                const typeInfo = INVEST_TYPES[inv.type] || { name: '未知资产', color: '#94a3b8' };
                const isGold = inv.type === 'GOLD';

                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {isGold ? (
                          <div className="w-5 h-5 rounded bg-yellow-100 text-yellow-600 flex items-center justify-center mr-2">
                            <Coins size={12} />
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full mr-3 ml-1" style={{ backgroundColor: typeInfo.color }}></div>
                        )}
                        <div>
                          <div className="font-medium text-slate-800">{inv.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {typeInfo.name} 
                            {inv.type === 'DEPOSIT' && inv.targetRate ? ` (年化预期 ${inv.targetRate}%)` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatCurrency(inv.principal)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                      {formatCurrency(inv.currentValue)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <YieldBadge value={profit} />
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                       <span className={`font-medium font-mono ${profit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                         {profit > 0 ? '+' : ''}{yieldRate.toFixed(2)}%
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setSelectedInvest(inv); setUpdateInvestValue(inv.currentValue.toString()); setIsUpdateInvestModalOpen(true); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                          <Edit2 size={14} className="mr-1"/> 更新
                        </button>
                        <button onClick={() => promptDeleteInvestment(inv.id, inv.name)} className="text-slate-400 hover:text-rose-600 text-sm">删除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {/* 【防崩溃修复】使用更加安全的三元表达式渲染空列表占位 */}
              {investments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <LineChart size={32} className="mx-auto text-slate-300 mb-3" />
                    暂无记录，点击右上角添加。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAccounts = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">基础账户管理</h2>
          <p className="text-sm text-slate-500 mt-1">用于日常消费、活期储蓄的基础资金</p>
        </div>
        <button 
          onClick={() => setIsAddAccountModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} className="mr-1" /> 添加账户
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {accounts.map(account => {
          const typeInfo = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES.OTHER;
          const Icon = typeInfo.icon;
          
          return (
            <div key={account.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="p-2.5 rounded-xl mr-3" style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 truncate max-w-[140px]" title={account.name}>{account.name}</h3>
                    <span className="text-xs text-slate-500">{typeInfo.name}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto">
                 <p className="text-xs text-slate-500 mb-1">当前余额</p>
                 <div className="font-bold text-2xl text-slate-800 font-mono tracking-tight">{formatCurrency(account.balance)}</div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => promptDeleteAccount(account.id, account.name)} className="text-sm text-slate-400 hover:text-rose-500 transition-colors">删除</button>
                <button onClick={() => { setSelectedAccount(account); setUpdateAmount(account.balance.toString()); setIsUpdateAccountModalOpen(true); }} className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">
                  <Edit2 size={14} className="mr-1" /> 更新金额
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div 
      className="min-h-screen font-sans text-slate-900 pb-12 flex flex-col"
      style={{ backgroundColor: '#f8fafc', backgroundImage: watermarkBgUrl, backgroundRepeat: 'repeat' }}
    >
      {/* Toast 提示组件 */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[100] animate-fade-in flex items-center bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3">
           {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500 mr-2" /> : <AlertTriangle size={18} className="text-rose-500 mr-2" />}
           <span className="text-slate-700 text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* 顶部导航 */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 min-w-max">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center pr-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                  <Feather size={18} className="text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-800">鹦鹉的梦境资产管理</span>
              </div>
              <div className="flex space-x-1">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}><Home size={18} className="mr-2" /> 总览</button>
                <button onClick={() => setActiveTab('investments')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === 'investments' ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}><LineChart size={18} className="mr-2" /> 理财与黄金</button>
                <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === 'accounts' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}><CreditCard size={18} className="mr-2" /> 基础账户</button>
              </div>
            </div>
            
            <div className="flex items-center">
              <button onClick={() => setIsDataModalOpen(true)} className="flex items-center px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg text-sm font-medium transition-colors">
                <FileSpreadsheet size={16} className="mr-1.5" />
                数据同步
              </button>
              <button onClick={() => { setTempApiKey(apiKey); setTempApiBaseUrl(apiBaseUrl); setIsSettingsModalOpen(true); }} className="flex items-center ml-2 px-3 py-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-sm font-medium transition-colors shadow-sm">
                <Settings size={16} className="mr-1.5" />
                设置
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主体内容 */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'investments' && renderInvestments()}
        {activeTab === 'accounts' && renderAccounts()}
      </main>

      {/* --- 底部专属版权水印 --- */}
      <footer className="w-full text-center py-6 mt-auto">
        <p className="text-slate-400 text-sm font-medium tracking-wider flex items-center justify-center">
          &copy; {new Date().getFullYear()} <Feather size={14} className="mx-1.5 opacity-60" /> @鹦鹉的梦境
        </p>
      </footer>

      {/* === 模态框集合 === */}

      {/* AI 诊断报告模态框 */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in border border-violet-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-violet-900 flex items-center">
                <Sparkles size={22} className="mr-2 text-fuchsia-500"/> AI 财务诊断报告
              </h3>
              <div className="flex items-center">
                {!isAiLoading && (
                  <button onClick={() => {setAiReport(''); generateAiReport();}} className="mr-4 text-violet-500 hover:text-violet-700 p-1 bg-white rounded-md shadow-sm border border-violet-100 flex items-center text-sm" title="重新生成">
                    <RefreshCw size={14} className="mr-1" /> 刷新
                  </button>
                )}
                <button onClick={() => setIsAIModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1"><X size={20} /></button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white relative">
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center overflow-hidden">
                <span className="text-9xl font-black -rotate-12 whitespace-nowrap text-slate-900">@鹦鹉的梦境</span>
              </div>
              
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4 relative z-10">
                   <Loader2 size={40} className="text-violet-500 animate-spin" />
                   <p className="text-violet-700 font-medium">鹦鹉的专属 AI 顾问正在为您分析资产配置...</p>
                   <p className="text-slate-400 text-sm">正在计算流动性比例与收益风险分布</p>
                </div>
              ) : (
                <div className="prose prose-violet max-w-none relative z-10">
                  {aiReport.split('\n').map((line, i) => {
                    if(line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-violet-900 mt-6 mb-3 border-b pb-2">{line.replace('## ', '')}</h2>;
                    if(line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) return <h3 key={i} className="text-lg font-bold text-slate-800 mt-5 mb-2 flex items-center"><span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-sm flex items-center justify-center mr-2">{line.substring(0,1)}</span>{line.substring(3).replace(/\*\*/g, '')}</h3>;
                    if(line.includes('**')) {
                       const parts = line.split('**');
                       return <p key={i} className="text-slate-600 leading-relaxed mb-3">
                         {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-slate-800 font-semibold">{part}</strong> : part)}
                       </p>
                    }
                    return line.trim() ? <p key={i} className="text-slate-600 leading-relaxed mb-3">{line}</p> : null;
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center relative z-10">
               基于 @鹦鹉的梦境 资产数据由 Gemini 智能生成，内容仅供参考，不构成专业投资建议。
            </div>
          </div>
        </div>
      )}

      {/* 数据同步管理模态框 */}
      {isDataModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center"><FileSpreadsheet size={20} className="mr-2 text-emerald-600"/> 数据联动</h3>
              <button onClick={() => setIsDataModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6 relative">
              <div className="bg-white border border-slate-200 rounded-xl p-5 relative z-10">
                <h4 className="font-semibold text-slate-800 flex items-center mb-2"><Download size={16} className="mr-2 text-blue-500"/> 导出数据</h4>
                <div className="flex space-x-3 mt-4">
                  <button onClick={handleExportCSV} className="flex-1 flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">下载 CSV</button>
                  <button onClick={handleCopyToSheets} className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium text-white shadow-sm"><Copy size={16} className="mr-2" /> 复制去粘贴 (推荐)</button>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative z-10">
                <h4 className="font-semibold text-slate-800 flex items-center mb-4"><Upload size={16} className="mr-2 text-purple-500"/> 导入 CSV 数据</h4>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" id="csv-upload"/>
                <label htmlFor="csv-upload" className="w-full flex items-center justify-center px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 cursor-pointer">选择文件...</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-600"><AlertTriangle size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除？</h3>
              <p className="text-slate-500 text-sm">你确定要删除 <span className="font-medium text-slate-700">"{deleteConfirm.name}"</span> 吗？</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' })} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">取消</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-sm font-medium shadow-sm">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加理财/黄金产品 */}
      {isAddInvestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center"><LineChart size={18} className="mr-2 text-rose-500"/> 添加资产记录</h3>
              <button onClick={() => setIsAddInvestModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddInvestment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品名称</label>
                <input type="text" required placeholder="如：工商大额存单、AU9999" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" value={newInvest.name} onChange={e => setNewInvest({...newInvest, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">投资类型</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(INVEST_TYPES).map(type => (
                    <div key={type.id} onClick={() => setNewInvest({...newInvest, type: type.id})} className={`cursor-pointer border rounded-lg py-2 px-1 text-center transition-all ${newInvest.type === type.id ? (type.id === 'GOLD' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                      <span className="text-sm font-medium flex items-center justify-center">
                        {type.id === 'GOLD' && <Coins size={14} className="mr-1"/>}
                        {type.name.replace('/贵金属', '')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">投入本金 (¥)</label>
                  <input type="number" step="0.01" required placeholder="买入成本" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-mono" value={newInvest.principal} onChange={e => setNewInvest({...newInvest, principal: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">当前市值</label>
                  <input type="number" step="0.01" required placeholder="最新价值" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-mono" value={newInvest.currentValue} onChange={e => setNewInvest({...newInvest, currentValue: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsAddInvestModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">取消</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 font-medium shadow-sm">保存记录</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 更新理财市值 */}
      {isUpdateInvestModalOpen && selectedInvest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">更新今日市值</h3>
              <button onClick={() => setIsUpdateInvestModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateInvestment} className="p-6">
              <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{selectedInvest.name}</p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">最新市值/余额 (¥)</label>
                <input type="number" step="0.01" required autoFocus className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-mono text-lg text-center" value={updateInvestValue} onChange={e => setUpdateInvestValue(e.target.value)} />
              </div>
              <button type="submit" className="w-full px-4 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 font-medium shadow-sm">保存更新</button>
            </form>
          </div>
        </div>
      )}

      {/* 添加基础账户 */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-800">添加基础账户</h3><button onClick={() => setIsAddAccountModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={handleAddAccount} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">账户名称</label><input type="text" required className="w-full px-3 py-2 border rounded-lg" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">账户类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {['BANK', 'DIGITAL'].map(id => (
                    <div key={id} onClick={() => setNewAccount({...newAccount, type: id})} className={`cursor-pointer border rounded-lg p-2 text-center text-sm ${newAccount.type === id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>{ACCOUNT_TYPES[id].name}</div>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">初始余额 (¥)</label><input type="number" required className="w-full px-3 py-2 border rounded-lg font-mono" value={newAccount.balance} onChange={e => setNewAccount({...newAccount, balance: e.target.value})} /></div>
              <button type="submit" className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">确认添加</button>
            </form>
          </div>
        </div>
      )}

      {/* 更新基础账户余额 */}
      {isUpdateAccountModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center"><h3 className="text-lg font-bold">更新余额</h3><button onClick={() => setIsUpdateAccountModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={handleUpdateAccount} className="p-6">
              <p className="mb-4 text-slate-600 font-semibold">{selectedAccount.name}</p>
              <input type="number" required autoFocus className="w-full px-4 py-3 border rounded-lg font-mono text-lg text-center mb-6" value={updateAmount} onChange={e => setUpdateAmount(e.target.value)} />
              <button type="submit" className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium">保存更新</button>
            </form>
          </div>
        </div>
      )}

      {/* API 设置模态框 */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center"><Settings size={18} className="mr-2 text-slate-600"/> 系统设置</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
                <input 
                  type="password" 
                  placeholder="请输入您的 AIzaSy..." 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" 
                  value={tempApiKey} 
                  onChange={e => setTempApiKey(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 mt-2">API 代理地址 (国内推荐设置)</label>
                <input 
                  type="text" 
                  placeholder="默认: https://generativelanguage.googleapis.com" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" 
                  value={tempApiBaseUrl} 
                  onChange={e => setTempApiBaseUrl(e.target.value)} 
                />
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  如果您在国内且未开启全局 VPN，直连会失败。您可以配置反向代理地址（例如某些开源直连代理）。<br/>
                  *以上信息将安全保存在浏览器本地，不会上传。*
                </p>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">取消</button>
                <button type="button" onClick={() => { 
                  localStorage.setItem('gemini_api_key', tempApiKey); 
                  localStorage.setItem('gemini_base_url', tempApiBaseUrl || 'https://generativelanguage.googleapis.com');
                  setApiKey(tempApiKey); 
                  setApiBaseUrl(tempApiBaseUrl || 'https://generativelanguage.googleapis.com');
                  setIsSettingsModalOpen(false); 
                  showToast('设置保存成功'); 
                }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
                  保存设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .prose-violet p strong { color: #4c1d95; }
      `}} />
    </div>
  );
}