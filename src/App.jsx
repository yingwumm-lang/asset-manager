import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Home, CreditCard, PieChart as PieChartIcon, Plus, DollarSign, 
  TrendingUp, Landmark, Smartphone, Briefcase, X, Wallet, Edit2, 
  LineChart, TrendingDown, AlertTriangle, FileSpreadsheet, Download, 
  Upload, Copy, CheckCircle2, Coins, Sparkles, Loader2, RefreshCw, Feather, Settings, Calendar
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

// 时间维度定义
const TIME_RANGES = [
  { label: '1个月', value: '1M', days: 30 },
  { label: '3个月', value: '3M', days: 90 },
  { label: '半年', value: '6M', days: 180 },
  { label: '1年', value: '1Y', days: 365 },
  { label: '3年', value: '3Y', days: 1095 },
  { label: '全部', value: 'ALL', days: Infinity },
];

const formatCurrency = (value) => {
  return '¥' + new Intl.NumberFormat('zh-CN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value);
};

// 【升级】：生成过去 3 年的历史数据
const generateMockHistory = () => {
  const history = [];
  const today = new Date();
  let baseTotal = 150000; // 3年前的初始资金
  
  const totalDays = 1095; 
  for (let i = totalDays; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // 模拟长线增长趋势 + 随机波动
    const longTermGrowth = (totalDays - i) * 120; // 每天平均涨一点
    const randomFluctuation = (Math.random() - 0.45) * 4000;
    const currentTotal = baseTotal + longTermGrowth + randomFluctuation;
    
    history.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      total: Math.round(currentTotal > 0 ? currentTotal : 0),
      fullDate: date.toISOString().split('T')[0]
    });
  }
  return history;
};

const DEFAULT_ACCOUNTS = [
  { id: '1', name: '招商银行储蓄卡', type: 'BANK', balance: 45000 },
  { id: '3', name: '支付宝余额宝', type: 'DIGITAL', balance: 21500 },
  { id: '4', name: '微信零钱通', type: 'DIGITAL', balance: 8500 },
];

const DEFAULT_INVESTMENTS = [
  { id: 'i1', name: '易方达蓝筹精选混合', type: 'FUND', principal: 50000, currentValue: 42500 },
  { id: 'i2', name: '招商中证白酒指数', type: 'FUND', principal: 20000, currentValue: 24800 },
  { id: 'i3', name: '贵州茅台 (600519)', type: 'STOCK', principal: 85000, currentValue: 92000 },
  { id: 'i4', name: '银行一年期大额存单', type: 'DEPOSIT', principal: 100000, currentValue: 102500, targetRate: 2.5 },
  { id: 'i5', name: '工商银行如意金条 50g', type: 'GOLD', principal: 25000, currentValue: 29800 },
];

const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350"><text x="50%" y="50%" transform="rotate(-30 175 175)" fill="rgba(100, 116, 139, 0.06)" font-size="22" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle" letter-spacing="2">@鹦鹉的梦境</text></svg>`;
const watermarkBgUrl = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(watermarkSvg)}")`;


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeRange, setTimeRange] = useState('1M'); // 当前选中的时间维度
  
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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [tempApiKey, setTempApiKey] = useState('');

  // --- 派生数据 ---
  const totalAccountBalance = useMemo(() => accounts.reduce((sum, acc) => sum + Number(acc.balance), 0), [accounts]);
  
  const investSummary = useMemo(() => investments.reduce((acc, inv) => {
      acc.totalPrincipal += Number(inv.principal || 0);
      acc.totalValue += Number(inv.currentValue || 0);
      return acc;
    }, { totalPrincipal: 0, totalValue: 0 }), [investments]);
    
  const totalAssets = totalAccountBalance + investSummary.totalValue;
  const totalInvestProfit = investSummary.totalValue - investSummary.totalPrincipal;
  const totalInvestYield = investSummary.totalPrincipal > 0 ? (totalInvestProfit / investSummary.totalPrincipal) * 100 : 0;

  // 【升级】：根据选择的时间范围过滤历史数据并计算变化
  const rangeData = useMemo(() => {
    const rangeConfig = TIME_RANGES.find(r => r.value === timeRange);
    const days = rangeConfig.days;
    
    let filtered = history;
    if (days !== Infinity) {
      filtered = history.slice(-days);
    }
    
    const startPoint = filtered[0]?.total || 0;
    const changeAmount = totalAssets - startPoint;
    const changePercent = startPoint > 0 ? (changeAmount / startPoint) * 100 : 0;
    
    return {
      filteredHistory: filtered,
      changeAmount,
      changePercent,
      label: rangeConfig.label
    };
  }, [history, timeRange, totalAssets]);

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
    return result.length > 0 ? result : [{ name: '暂无资产', value: 1, color: '#e2e8f0' }];
  }, [totalAccountBalance, investments]);

  useEffect(() => {
    setHistory(prev => {
      if (!prev || prev.length === 0) return prev;
      const newHistory = [...prev];
      const todayString = new Date().toISOString().split('T')[0];
      const lastEntry = newHistory[newHistory.length - 1];
      
      if (lastEntry && lastEntry.fullDate === todayString) {
        newHistory[newHistory.length - 1] = { ...lastEntry, total: totalAssets };
      } else {
        newHistory.push({ 
          date: `${new Date().getMonth() + 1}/${new Date().getDate()}`, 
          total: totalAssets, 
          fullDate: todayString,
          yearMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
        });
      }
      return newHistory;
    });
  }, [totalAssets]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const generateAiReport = async () => {
    if (!apiKey) {
      showToast('请先配置 Gemini API Key', 'error');
      setIsSettingsModalOpen(true);
      return;
    }
    setIsAIModalOpen(true);
    if (aiReport && !isAiLoading) return;
    setIsAiLoading(true);
    setAiReport('');
    const contextData = {
      totalAssets,
      rangePerformance: `${rangeData.label}涨跌: ${formatCurrency(rangeData.changeAmount)} (${rangeData.changePercent.toFixed(2)}%)`,
      distribution: assetsDistribution.map(d => `${d.name}: ${((d.value/totalAssets)*100).toFixed(1)}%`)
    };
    const promptText = `用户资产数据：总值${contextData.totalAssets}。${contextData.rangePerformance}。资产构成：${contextData.distribution.join('，')}。请提供简短理财分析建议。`;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      const result = await response.json();
      setAiReport(result.candidates[0].content.parts[0].text);
    } catch (e) {
      setAiReport("❌ AI 诊断失败，请检查网络或 API Key。");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    setAccounts([...accounts, { id: Date.now().toString(), name: newAccount.name, type: newAccount.type, balance: Number(newAccount.balance) }]);
    setNewAccount({ name: '', type: 'BANK', balance: '' });
    setIsAddAccountModalOpen(false);
    showToast('账户添加成功');
  };

  const handleUpdateAccount = (e) => {
    e.preventDefault();
    setAccounts(accounts.map(acc => acc.id === selectedAccount.id ? { ...acc, balance: Number(updateAmount) } : acc));
    setIsUpdateAccountModalOpen(false);
    showToast('余额更新成功');
  };

  const handleAddInvestment = (e) => {
    e.preventDefault();
    setInvestments([...investments, { id: `inv_${Date.now()}`, ...newInvest, principal: Number(newInvest.principal), currentValue: Number(newInvest.currentValue) }]);
    setIsAddInvestModalOpen(false);
    showToast('记录添加成功');
  };

  const handleUpdateInvestment = (e) => {
    e.preventDefault();
    setInvestments(investments.map(inv => inv.id === selectedInvest.id ? { ...inv, currentValue: Number(updateInvestValue) } : inv));
    setIsUpdateInvestModalOpen(false);
    showToast('市值更新成功');
  };

  const executeDelete = () => {
    if (deleteConfirm.type === 'ACCOUNT') setAccounts(accounts.filter(acc => acc.id !== deleteConfirm.id));
    else setInvestments(investments.filter(inv => inv.id !== deleteConfirm.id));
    setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
  };

  const handleExportCSV = () => {
    let content = "类型,名称,分类,本金,市值\n";
    accounts.forEach(a => content += `基础,${a.name},${ACCOUNT_TYPES[a.type].name},${a.balance},${a.balance}\n`);
    investments.forEach(i => content += `理财,${i.name},${INVEST_TYPES[i.type].name},${i.principal},${i.currentValue}\n`);
    const blob = new Blob(["\uFEFF" + content], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "资产备份.csv";
    link.click();
  };

  const YieldBadge = ({ value, isPercent = false }) => {
    const isPos = value > 0;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${isPos ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
        {isPos ? '+' : ''}{isPercent ? value.toFixed(2) + '%' : formatCurrency(value).replace('¥', '')}
      </span>
    );
  };

  // --- 页面组件 ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      {/* 顶部筛选器 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-200/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${timeRange === range.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button onClick={generateAiReport} className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-200">
          <Sparkles size={16} className="mr-2" /> AI 资产诊断
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-md text-white flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 opacity-80">
            <h3 className="font-medium">当前总资产</h3>
            <span className="text-xl font-bold font-mono">¥</span>
          </div>
          <div>
            <div className="text-3xl font-bold">{formatCurrency(totalAssets)}</div>
            <div className="text-sm mt-2 flex items-center opacity-90">
              <span className="mr-2">较 {rangeData.label}前</span>
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${rangeData.changeAmount >= 0 ? 'bg-white/20' : 'bg-black/20'}`}>
                {rangeData.changeAmount >= 0 ? '+' : ''}{formatCurrency(rangeData.changeAmount)} ({rangeData.changeAmount >= 0 ? '+' : ''}{rangeData.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-500 font-medium">理财累计盈亏</h3>
            <LineChart size={20} className="text-rose-500" />
          </div>
          <div>
            <div className={`text-2xl font-bold ${totalInvestProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalInvestProfit > 0 ? '+' : ''}{formatCurrency(totalInvestProfit)}
            </div>
            <div className="text-sm mt-2 flex items-center text-slate-500">
              收益率: <span className={`ml-1 font-bold ${totalInvestProfit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{totalInvestYield > 0 ? '+' : ''}{totalInvestYield.toFixed(2)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
           <h3 className="text-slate-800 font-semibold mb-2 flex items-center text-sm"><PieChartIcon size={14} className="mr-2 text-slate-400" /> 资产大类分布</h3>
           <div className="flex h-24 items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={assetsDistribution} cx="50%" cy="50%" innerRadius={22} outerRadius={35} dataKey="value">{assetsDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1">
                {assetsDistribution.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 truncate">{item.name}</span>
                    <span className="font-bold">{totalAssets > 0 ? ((item.value / totalAssets) * 100).toFixed(0) : 0}%</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-slate-800 font-bold mb-6 flex items-center">
          <Calendar size={18} className="mr-2 text-blue-500" />
          {rangeData.label}资产净值走势
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rangeData.filteredHistory}>
              <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey={timeRange === 'ALL' || timeRange === '3Y' ? 'yearMonth' : 'date'} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} minTickGap={40}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${(v/10000).toFixed(0)}w`} width={35}/>
              <RechartsTooltip formatter={v => [formatCurrency(v), '总资产']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderInvestments = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">理财与收益</h2>
        <button onClick={() => setIsAddInvestModalOpen(true)} className="flex items-center px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium shadow-sm"><Plus size={16} className="mr-1" /> 添加记录</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">资产名称</th>
              <th className="px-6 py-4 text-right">本金</th>
              <th className="px-6 py-4 text-right">当前市值</th>
              <th className="px-6 py-4 text-right">盈亏</th>
              <th className="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {investments.map(inv => {
              const profit = inv.currentValue - inv.principal;
              return (
                <tr key={inv.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{inv.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{INVEST_TYPES[inv.type]?.name}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-500">{formatCurrency(inv.principal)}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold">{formatCurrency(inv.currentValue)}</td>
                  <td className="px-6 py-4 text-right"><YieldBadge value={profit} /></td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => {setSelectedInvest(inv); setUpdateInvestValue(inv.currentValue); setIsUpdateInvestModalOpen(true);}} className="text-blue-500 hover:text-blue-700 mx-2"><Edit2 size={14}/></button>
                    <button onClick={() => setDeleteConfirm({isOpen: true, type: 'INVESTMENT', id: inv.id, name: inv.name})} className="text-slate-300 hover:text-rose-500 mx-2"><X size={14}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAccounts = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">基础账户</h2>
        <button onClick={() => setIsAddAccountModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm"><Plus size={16} className="mr-1" /> 添加账户</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl bg-blue-50 text-blue-600`}>{React.createElement(ACCOUNT_TYPES[acc.type].icon, {size: 20})}</div>
              <button onClick={() => setDeleteConfirm({isOpen: true, type: 'ACCOUNT', id: acc.id, name: acc.name})} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500"><X size={16}/></button>
            </div>
            <h3 className="font-bold text-slate-800">{acc.name}</h3>
            <p className="text-2xl font-bold mt-2 font-mono">{formatCurrency(acc.balance)}</p>
            <button onClick={() => {setSelectedAccount(acc); setUpdateAmount(acc.balance); setIsUpdateAccountModalOpen(true);}} className="mt-4 w-full py-2 bg-slate-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">更新余额</button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: '#f8fafc', backgroundImage: watermarkBgUrl }}>
      {toast.show && (
        <div className="fixed top-4 right-4 z-[100] bg-white border shadow-lg rounded-xl px-4 py-3 flex items-center">
           <CheckCircle2 size={18} className="text-emerald-500 mr-2" />
           <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2"><Feather className="text-blue-600" /> <span className="font-bold text-lg">鹦鹉的梦境</span></div>
            <div className="hidden md:flex gap-1">
              {['dashboard', 'investments', 'accounts'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === t ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {t === 'dashboard' ? '总览' : t === 'investments' ? '理财' : '账户'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsDataModalOpen(true)} className="p-2 text-slate-400 hover:text-emerald-500"><FileSpreadsheet size={20}/></button>
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-slate-400 hover:text-blue-500"><Settings size={20}/></button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'investments' && renderInvestments()}
        {activeTab === 'accounts' && renderAccounts()}
      </main>

      <footer className="text-center py-10 opacity-30 text-xs font-bold tracking-widest uppercase">
        &copy; {new Date().getFullYear()} @鹦鹉的梦境
      </footer>

      {/* 弹窗部分保持精简逻辑... */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
            <div className="p-6 border-b flex justify-between items-center bg-violet-50/50">
              <h3 className="font-bold text-violet-800 flex items-center gap-2"><Sparkles size={20}/> AI 资产诊断报告</h3>
              <button onClick={() => setIsAIModalOpen(false)}><X/></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 prose prose-sm prose-slate">
              {isAiLoading ? <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="animate-spin text-violet-500" size={32}/><p className="font-bold text-violet-900">AI 正在深度分析中...</p></div> : <div className="whitespace-pre-wrap leading-relaxed">{aiReport}</div>}
            </div>
          </div>
        </div>
      )}

      {/* 快速设置 API Key */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg mb-4">系统设置</h3>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Gemini API Key</label>
            <input type="password" value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl mb-6 font-mono text-sm outline-none focus:border-blue-500" placeholder="AIza..." />
            <button onClick={() => {localStorage.setItem('gemini_api_key', tempApiKey); setApiKey(tempApiKey); setIsSettingsModalOpen(false); showToast('已保存');}} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">保存并生效</button>
          </div>
        </div>
      )}

      {/* 数据同步弹窗 */}
      {isDataModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><FileSpreadsheet/></div>
            <h3 className="font-bold text-lg mb-6">数据同步与导出</h3>
            <button onClick={handleExportCSV} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold mb-3">导出为 CSV 备份</button>
            <button onClick={() => setIsDataModalOpen(false)} className="w-full py-3 text-slate-400 font-bold">关闭</button>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-80 text-center">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={32}/>
            <p className="font-bold text-slate-800 mb-6">确认删除记录？</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm({isOpen:false})} className="flex-1 py-2 bg-slate-100 rounded-xl font-bold">取消</button>
              <button onClick={executeDelete} className="flex-1 py-2 bg-rose-500 text-white rounded-xl font-bold">确认</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
}