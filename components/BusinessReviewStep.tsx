import React, { useEffect, useRef, useState } from 'react';
import { JBPData, JBPIssue, JBPOpportunity } from '../types';

import { Map as MapIcon, MapPin, TrendingUp, AlertCircle, ShoppingBag, ArrowUpRight, Loader2, RefreshCw, Lightbulb, Target, Edit2, Check, X, FileJson, Upload, FileSpreadsheet, CheckCircle2, Globe, BarChart3, Users, Zap, Plus, Trash2, Save, Wallet, CupSoda, Info, ChevronLeft, ChevronRight, Maximize2, Minimize2, BarChart, Database, Coins, PieChart, Activity, Store, Table, LineChart, Warehouse, Truck, Briefcase, Layers, Eye, Calculator, Minus, ChevronDown } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
  BarChart as RBarChart
} from 'recharts';

// 高德地图类型声明
declare var AMap: any;

declare global {
  interface Window {
    AMap?: any;
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

// --- Coordinate Conversion Utils (GCJ-02 to WGS-84) ---
const PI = 3.1415926535897932384626;
const a = 6378245.0;
const ee = 0.00669342162296594323;

function transformLat(x: number, y: number) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformLon(x: number, y: number) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
}

function outOfChina(lng: number, lat: number) {
    return (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271);
}

function gcj02towgs84(lng: number, lat: number) {
    if (outOfChina(lng, lat)) {
        return [lng, lat];
    }
    let dlat = transformLat(lng - 105.0, lat - 35.0);
    let dlng = transformLon(lng - 105.0, lat - 35.0);
    let radlat = lat / 180.0 * PI;
    let magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    let sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
    return [lng - dlng, lat - dlat];
}

interface BusinessReviewStepProps {
  data: JBPData;
  updateData: (updates: Partial<JBPData>) => void;
  onNext: () => void;
  onBack: () => void;
  readOnly?: boolean;
}

const DEFAULT_MARKERS = [
  { pos: { lat: 39.923015, lng: 116.473168 }, title: '经销商本部 (Main Office)', type: 'office', owner: '王总' },
  { pos: { lat: 39.930, lng: 116.450 }, title: '核心KA门店 (Key Account)', type: 'store', owner: '张三' },
  { pos: { lat: 39.900, lng: 116.500 }, title: '批发市场 (Wholesale)', type: 'market', owner: '李四' }
];

const BusinessReviewStep: React.FC<BusinessReviewStepProps> = ({ data, updateData, onNext, onBack, readOnly }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const mapInstanceRef = useRef<any>(null);
  const polygonInstanceRef = useRef<any>(null);
  const markerInstancesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const territoryConfirmMapRef = useRef<HTMLDivElement>(null);
  const territoryConfirmMapInstanceRef = useRef<any>(null);
  const territoryConfirmPolygonsRef = useRef<any[]>([]);

  const [markers, setMarkers] = useState<any[]>(DEFAULT_MARKERS);
  const [showInput, setShowInput] = useState(false);
  const [coordInput, setCoordInput] = useState('');
  const [activePath, setActivePath] = useState<any[]>([]);
  const [inputError, setInputError] = useState<string>('');

  const [showOutletInput, setShowOutletInput] = useState(false);
  const [outletInput, setOutletInput] = useState('');
  const [outletError, setOutletError] = useState('');
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isGaode, setIsGaode] = useState(true);
  
  // 验证状态
  const [validationError, setValidationError] = useState<string | null>(null);

  // UI States for editing mode (kept local)
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [isEditingOperations, setIsEditingOperations] = useState(false);
  const [isEditingTrends, setIsEditingTrends] = useState(false);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [isEditingCustomerAnalysis, setIsEditingCustomerAnalysis] = useState(false);
  const [isEditingChannelAnalysis, setIsEditingChannelAnalysis] = useState(false);
  const [isEditingTeamAnalysis, setIsEditingTeamAnalysis] = useState(false);
  const [customerScopeTab, setCustomerScopeTab] = useState(0);
  const [channelScopeTab, setChannelScopeTab] = useState(0);
  const [teamScopeTab, setTeamScopeTab] = useState(0);
  const [isIntelligenceCollapsed, setIsIntelligenceCollapsed] = useState(false);
  const [showMarketDataInput, setShowMarketDataInput] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<'A' | 'B' | 'C' | null>(null);

  // Helper to update product categories
  const updateCategoryData = (index: number, field: string, value: string) => {
      const newData = [...data.productCategories];
      newData[index] = { ...newData[index], [field]: Number(value) || 0 };
      updateData({ productCategories: newData });
  };

  // Helper to update team analysis
  const updateTeamData = (index: number, field: string, value: string) => {
      const newData = [...(data.teamAnalysis || [])];
      if (field === 'status') {
          newData[index] = { ...newData[index], status: value as 'active' | 'resigned' };
      } else if (field === 'name') {
          newData[index] = { ...newData[index], name: value };
      } else {
          newData[index] = { ...newData[index], [field]: Number(value) || 0 };
      }
      updateData({ teamAnalysis: newData });
  };

  // Helper to update channel analysis
  const updateChannelData = (index: number, field: string, value: string) => {
      const newData = [...(data.channelAnalysis || [])];
      newData[index] = { ...newData[index], [field]: Number(value) || 0 };
      updateData({ channelAnalysis: newData });
  };

  // Helper to update operations data
  const updateOperationsData = (field: string, value: any) => {
      updateData({ operations: { ...data.operations, [field]: value } });
  };

  // Helper to update customer segments
  const updateCustomerSegment = (index: number, field: string, value: string) => {
      const newSegments = [...data.customerAnalysis.segments];
      newSegments[index] = { ...newSegments[index], [field]: field === 'label' || field === 'criteria' ? value : (Number(value) || 0) };
      updateData({ customerAnalysis: { ...data.customerAnalysis, segments: newSegments } });
  };

  // Helper to update customer insights
  const updateCustomerInsight = (index: number, field: string, value: string) => {
      const newInsights = [...data.customerAnalysis.insights];
      newInsights[index] = { ...newInsights[index], [field]: value };
      updateData({ customerAnalysis: { ...data.customerAnalysis, insights: newInsights } });
  };



  // Issues State - Handled via global data
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDesc, setNewIssueDesc] = useState('');

  // Opportunities State - Handled via global data
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [isAddingOpportunity, setIsAddingOpportunity] = useState(false);
  const [newOpportunityTitle, setNewOpportunityTitle] = useState('');
  const [newOpportunityDesc, setNewOpportunityDesc] = useState('');
  const [newOpportunityTag, setNewOpportunityTag] = useState('新渠道');

  // --- Profit Detail Modal State ---
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [profitBreakdown, setProfitBreakdown] = useState({
      sellOutIncome: '1250',
      otherIncome: '30',
      cogs: '880',
      expenses: {
          commission: '50',
          personnel: '80',
          office: '15',
          vehicle: '35',
          warehouse: '20',
          marketing: '15',
          special: '5'
      }
  });

  // Helper: safe parse string to number for calculations
  const toNum = (s: string | undefined): number => {
    if (!s) return 0;
    const n = Number(s);
    return isNaN(n) ? 0 : Math.max(0, n);
  };
  const [expandedSections, setExpandedSections] = useState({
      income: true,
      expense: true,
      operating: true
  });

  // Calculate totals for Profit Modal
  const calculatedProfit = React.useMemo(() => {
      const incomeTotal = toNum(profitBreakdown.sellOutIncome) + toNum(profitBreakdown.otherIncome);
      const opExpenses = (Object.values(profitBreakdown.expenses) as string[]).reduce<number>((acc, val) => acc + toNum(val), 0);
      const expenseTotal = toNum(profitBreakdown.cogs) + opExpenses;
      const grossProfit = toNum(profitBreakdown.sellOutIncome) - toNum(profitBreakdown.cogs);
      const netProfit = incomeTotal - expenseTotal;
      
      return { incomeTotal, expenseTotal, opExpenses, grossProfit, netProfit };
  }, [profitBreakdown]);

  // Helper to update operations array
  const updateOpArray = (type: 'vehicles' | 'personnel' | 'capital', id: string, field: string, value: string) => {
      const updatedList = data.operations[type].map((item: any) => item.id === id ? { ...item, [field]: value } : item);
      updateData({
          operations: { ...data.operations, [type]: updatedList }
      });
  };

  const addOpArrayItem = (type: 'vehicles' | 'personnel' | 'capital') => {
      const newItem = type === 'capital' 
        ? { id: Date.now().toString(), name: '', amount: '' }
        : { id: Date.now().toString(), name: '', count: '' };
        
      const updatedList = [...data.operations[type], newItem];
      updateData({
          operations: { ...data.operations, [type]: updatedList }
      });
  };

  const removeOpArrayItem = (type: 'vehicles' | 'personnel' | 'capital', id: string) => {
      const updatedList = data.operations[type].filter((item: any) => item.id !== id);
      updateData({
          operations: { ...data.operations, [type]: updatedList }
      });
  };

  // Helper to update performance metrics
  const updatePerformance = (field: string, value: string) => {
      updateData({
          performance: { ...data.performance, [field]: value }
      });
  };

  // 非负两位小数输入过滤
  const filterDecimal = (raw: string, maxDecimals: number = 2): string => {
    let filtered = raw.replace(/[^\d.]/g, '');
    const parts = filtered.split('.');
    if (parts.length > 1) filtered = parts[0] + '.' + parts.slice(1).join('');
    if (filtered.includes('.')) {
      const [int, dec] = filtered.split('.');
      filtered = int + '.' + dec.slice(0, maxDecimals);
    }
    return filtered;
  };

  // Helper to update operations single fields
  const updateOperationField = (field: string, value: string) => {
      updateData({
          operations: { ...data.operations, [field]: value }
      });
  };

  // Helper to update market stats
  const updateMarketStat = (field: string, value: string) => {
      updateData({
          marketStats: { ...data.marketStats, [field]: value }
      });
  };

  // Helper to update trends
  const updateTrendData = (index: number, field: string, value: string) => {
      const newData = [...data.trends];
      newData[index] = { ...newData[index], [field]: Number(value) || 0 };
      updateData({ trends: newData });
  };

  // Helper to update competitors
  const addCompetitor = () => {
    const newComp = { id: `c_${Date.now()}`, name: '', abbr: '', target: '', achievement: 0, outlets: 0 };
    updateData({ competitors: [...data.competitors, newComp] });
  };

  // Helper for competitor input: filter to non-negative 2-decimal, return as string
  const filterCompetitorDecimal = (val: string): string => filterDecimal(val);

  const removeCompetitor = (id: string) => {
    updateData({ competitors: data.competitors.filter(c => c.id !== id) });
  };

  const updateCompetitor = (id: string, updates: any) => {
    updateData({ competitors: data.competitors.map(c => c.id === id ? { ...c, ...updates } : c) });
  };

  const saveProfitData = () => {
      updateData({
          performance: {
              ...data.performance,
              profit: calculatedProfit.netProfit.toString()
          }
      });
      setShowProfitModal(false);
  };

  // 验证待解决问题和待挖掘机会是否已填写
  const validateBeforeNext = (): boolean => {
      if (!data.issues || data.issues.length === 0) {
          setValidationError('请至少添加一个待解决问题');
          setTimeout(() => setValidationError(null), 5000);
          return false;
      }

      if (!data.opportunities || data.opportunities.length === 0) {
          setValidationError('请至少添加一个待挖掘机会');
          setTimeout(() => setValidationError(null), 5000);
          return false;
      }

      setValidationError(null);
      return true;
  };

  // 检查待解决问题和待挖掘机会是否都有内容
  const checkIssuesAndOpportunitiesFilled = (): boolean => {
      return (data.issues && data.issues.length > 0) && 
             (data.opportunities && data.opportunities.length > 0);
  };

  // 处理下一步点击
  const handleNextClick = () => {
      if (validateBeforeNext()) {
          onNext();
      }
  };



  // ... (Map logic remains same) ...
  const processImportedData = (parsed: any[]) => {
      try {
        if (!Array.isArray(parsed)) throw new Error("数据格式必须为数组 (Array)");
        if (parsed.length === 0) throw new Error("数据为空");

        const newMarkers: any[] = [];
        let detectedLatKey = '';
        let detectedLngKey = '';
        let detectedOwnerKey = '';
        
        if (typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
            const keys = Object.keys(parsed[0]);
            detectedLatKey = keys.find(k => /客户纬度|门店纬度|纬度|lat/i.test(k)) || '';
            detectedLngKey = keys.find(k => /客户经度|门店经度|经度|lng|lon/i.test(k)) || '';
            
            if (detectedLatKey && detectedLngKey) {
                const sampleRow = parsed.find(row => row[detectedLatKey] && row[detectedLngKey]);
                if (sampleRow) {
                    const latVal = Number(sampleRow[detectedLatKey]);
                    const lngVal = Number(sampleRow[detectedLngKey]);
                    if (!isNaN(latVal) && !isNaN(lngVal)) {
                        if (Math.abs(latVal) > 90 && Math.abs(lngVal) <= 90) {
                            const temp = detectedLatKey;
                            detectedLatKey = detectedLngKey;
                            detectedLngKey = temp;
                        }
                    }
                }
            }

            if (!detectedLatKey || !detectedLngKey) {
                // Heuristic detection logic...
                const checkValues = (key: string, min: number, max: number) => {
                    let validCount = 0;
                    let checkCount = 0;
                    for (let i = 0; i < Math.min(parsed.length, 10); i++) {
                        const val = parsed[i][key];
                        if (val === undefined || val === null || val === '') continue;
                        const num = Number(val);
                        checkCount++;
                        if (!isNaN(num) && num >= min && num <= max && Math.abs(num) > 0.1) {
                            validCount++;
                        }
                    }
                    return checkCount > 0 && (validCount / checkCount) > 0.8;
                };

                const latPatterns = [/^(lat|latitude|客户纬度|门店纬度|纬度)$/i, /纬/];
                const lngPatterns = [/^(lng|lon|longitude|客户经度|门店经度|经度)$/i, /经/];
                const ownerPatterns = [/^(归属人|负责人|业务员|客户经理|salesrep|owner)$/i, /归属|负责|业务/];

                const scoreKey = (key: string, patterns: RegExp[]) => {
                    const cleanK = key.replace(/\s+/g, '').toLowerCase();
                    for (let i = 0; i < patterns.length; i++) {
                        if (patterns[i].test(cleanK)) return 10 - i; 
                    }
                    return 0;
                };

                let bestLatScore = 0;
                let bestLngScore = 0;
                let bestOwnerScore = 0;

                keys.forEach(key => {
                    const latScore = scoreKey(key, latPatterns);
                    if (latScore > 0 && checkValues(key, -90, 90)) {
                        if (latScore > bestLatScore) {
                            detectedLatKey = key;
                            bestLatScore = latScore;
                        }
                    }
                    const lngScore = scoreKey(key, lngPatterns);
                    if (lngScore > 0 && checkValues(key, -180, 180)) {
                        if (lngScore > bestLngScore) {
                            detectedLngKey = key;
                            bestLngScore = lngScore;
                        }
                    }
                    const ownerScore = scoreKey(key, ownerPatterns);
                    if (ownerScore > bestOwnerScore) {
                        detectedOwnerKey = key;
                        bestOwnerScore = ownerScore;
                    }
                });
            }
        }

        parsed.forEach((item: any, idx: number) => {
            let lat: any = undefined;
            let lng: any = undefined;
            let title: any = undefined;
            let owner: any = undefined;

            if (Array.isArray(item)) {
                 const nums = item.filter((x:any) => typeof x === 'number' || (typeof x === 'string' && !isNaN(Number(x)))).map(Number);
                 if (nums.length >= 2) {
                     const v1 = nums[0];
                     const v2 = nums[1];
                     if (v1 > 70 && v2 < 60) { lng = v1; lat = v2; }
                     else if (v2 > 70 && v1 < 60) { lat = v1; lng = v2; }
                     else { lng = v1; lat = v2; }
                 }
                 if (item.length > 2 && typeof item[2] === 'string') title = item[2];
            } 
            else if (typeof item === 'object' && item !== null) {
                if (detectedLatKey) lat = item[detectedLatKey];
                if (detectedLngKey) lng = item[detectedLngKey];
                if (detectedOwnerKey) owner = item[detectedOwnerKey];
                const keys = Object.keys(item);
                const titleKey = keys.find(k => /^(name|title|store|label|店名|名称|网点|门店|客户名称|网点名称|门店名称)$/i.test(k.replace(/\s+/g, '').toLowerCase())) 
                                 || keys.find(k => /名|店|客/.test(k));
                if (titleKey) title = item[titleKey];
            }

            let nLat = Number(lat);
            let nLng = Number(lng);
            if (isNaN(nLat) || nLng === 0 || Math.abs(nLat) < 0.1 || Math.abs(nLng) < 0.1) return;
            if (isGaode) {
               const [convLng, convLat] = gcj02towgs84(nLng, nLat);
               nLng = convLng; nLat = convLat;
            }

            newMarkers.push({
                pos: { lat: nLat, lng: nLng },
                title: title ? String(title) : `Outlet ${idx + 1}`,
                type: item.type || 'store',
                owner: owner ? String(owner) : undefined
            });
        });

        if (newMarkers.length === 0) throw new Error("未能识别到有效的坐标数据。请确保文件包含【经度】和【纬度】列，且数值不为0。");

        setMarkers(newMarkers);
        setShowOutletInput(false);
        setOutletInput('');
        setOutletError('');
        let msg = `成功加载 ${newMarkers.length} 个网点`;
        if (detectedLatKey && detectedLngKey) msg += ` (已识别: ${detectedLngKey}, ${detectedLatKey})`;
        setImportSuccess(msg);
        setTimeout(() => setImportSuccess(null), 5000);
      } catch (e: any) {
        setOutletError('解析错误: ' + e.message);
      }
  };

  const handleUpdateOutlets = () => {
     try {
        if (!outletInput.trim()) { setOutletError('请输入JSON数据'); return; }
        const parsed = JSON.parse(outletInput);
        processImportedData(parsed);
     } catch (e: any) {
        setOutletError('JSON 格式错误: ' + e.message);
     }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'array' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
            processImportedData(data);
        } catch (error: any) {
            setOutletError('Excel 解析失败: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const handleUpdatePolygon = () => {
    try {
      if (!coordInput.trim()) { setInputError('请输入坐标数据'); return; }
      const parsed = JSON.parse(coordInput);
      let coordsArray = parsed;
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) coordsArray = parsed[0];
      if (!Array.isArray(coordsArray)) throw new Error("Invalid format");
      const newPath = coordsArray.map((pt: any) => {
         if (!Array.isArray(pt) || pt.length < 2) throw new Error("Invalid coordinate pair");
         return { lat: pt[1], lng: pt[0] };
      });
      if (newPath.length < 3) throw new Error("Polygon must have at least 3 points");
      setActivePath(newPath);
      setShowInput(false);
      setInputError('');
      setCoordInput('');
    } catch (e: any) {
      setInputError('格式错误: 请确保输入合法的 JSON 坐标数组 [[lng,lat],...]');
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setMapError(false);
    setErrorMessage('');
    
    const initMap = async () => {
      try {
        // 高德地图 API 配置
        const AMAP_KEY = "09706e6d3502770b99148345f3b1dc47";
        const AMAP_SECURITY_CODE = "5dcb0e9a91f058b3e3d40d73200d5f89";
        
        // 设置安全密钥
        window._AMapSecurityConfig = {
          securityJsCode: AMAP_SECURITY_CODE
        };
        
        // ✅ 加载 ditu.md 范围数据到经营回顾地图
        const loadDituAndRender = async (map: any) => {
          try {
            const res = await fetch(`/ditu.md?t=${Date.now()}`);
            const wktText = await res.text();
            
            const match = wktText.match(/POLYGON \(\((.*)\)\)/i);
            if (match) {
              const coordsText = match[1];
              // ✅ 多边形 path 格式：[[lng, lat], [lng, lat], ...]
              const path = coordsText.split(',').map((point: string) => {
                const [lng, lat] = point.trim().split(' ').map(Number);
                return [lng, lat];
              });
              
              // 同时设置 activePath 给其他功能用（转成 {lat, lng} 格式）
              setActivePath(path.map(([lng, lat]) => ({ lat, lng })));
              
              // 渲染多边形
              const polygon = new AMap.Polygon({
                path: path,
                strokeColor: '#0ea5e9',
                strokeWeight: 3,
                strokeOpacity: 0.9,
                fillColor: '#06b6d4',
                fillOpacity: 0.25,
              });
              
              polygon.setMap(map);
              polygonInstanceRef.current = polygon;
              
              // 调整地图视野到多边形范围
              map.setFitView([polygon], false, [50, 50, 50, 50]);
            }
          } catch (e) {
            console.warn('加载 ditu.md 失败', e);
            setActivePath([]);
          }
        };

        // 如果高德地图已经加载
        if (window.AMap) {
          const map = new AMap.Map(mapContainerRef.current, {
            center: [116.46, 39.92],
            zoom: 11,
            viewMode: '2D',
            showIndoorMap: false,
          });
          mapInstanceRef.current = map;
          setIsLoading(false);
          loadDituAndRender(map);
          return;
        }
        
        // 动态加载高德地图 JS SDK
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
        script.onload = () => {
          if (!isMounted || !mapContainerRef.current) return;
          const map = new AMap.Map(mapContainerRef.current, {
            center: [116.46, 39.92],
            zoom: 11,
            viewMode: '2D',
            showIndoorMap: false,
          });
          mapInstanceRef.current = map;
          setIsLoading(false);
          loadDituAndRender(map);
        };
        script.onerror = () => {
          if (isMounted) {
            setMapError(true);
            setErrorMessage("高德地图加载失败");
            setIsLoading(false);
          }
        };
        document.head.appendChild(script);
      } catch (error: any) {
        if (isMounted) {
          setMapError(true);
          setErrorMessage(error?.message || "高德地图加载失败");
          setIsLoading(false);
        }
      }
    };
    
    initMap();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
     if (!mapInstanceRef.current || !window.AMap) return;
     
     // 清除现有标记点
     markerInstancesRef.current.forEach(m => m.setMap(null));
     markerInstancesRef.current = [];
     
     if (markers.length === 0) return;
     
     // 高德地图需要手动计算 bounds 的西南角和东北角
     let minLng = Infinity, minLat = Infinity;
     let maxLng = -Infinity, maxLat = -Infinity;
     let hasValidMarkers = false;
     
     markers.forEach((m) => {
          if (m.pos == null || typeof m.pos !== 'object') {
            console.warn('标记点缺少 pos 属性:', m);
            return;
          }
          const lngNum = Number(m.pos.lng);
          const latNum = Number(m.pos.lat);
          if (isNaN(lngNum) || isNaN(latNum) || !isFinite(lngNum) || !isFinite(latNum) || lngNum < -180 || lngNum > 180 || latNum < -90 || latNum > 90) {
            console.warn('标记点坐标无效:', m.title, m.pos);
            return;
          }
          
          // 更新边界
          minLng = Math.min(minLng, lngNum);
          maxLng = Math.max(maxLng, lngNum);
          minLat = Math.min(minLat, latNum);
          maxLat = Math.max(maxLat, latNum);

          const position = [lngNum, latNum];
          
          // 判断是否在多边形内（简化处理）
          let isInside = true;
          if (activePath.length >= 3) {
            // 高德地图的点在多边形内判断 - 只使用有效坐标
            const validRing = activePath.filter(p => {
              const plng = p?.lng;
              const plat = p?.lat;
              if (plng == null || plat == null) return false;
              const lngVal = Number(plng);
              const latVal = Number(plat);
              return !isNaN(lngVal) && !isNaN(latVal) && isFinite(lngVal) && isFinite(latVal) && lngVal >= -180 && lngVal <= 180 && latVal >= -90 && latVal <= 90;
            }).map(p => [Number(p.lng), Number(p.lat)]);
            if (validRing.length >= 3) {
              isInside = AMap.GeometryUtil.isPointInRing(position, validRing);
            }
          }
          
          const strokeColor = !isInside ? '#ef4444' : (m.type === 'office' ? '#fff' : (m.type === 'market' ? '#fff' : '#0ea5e9'));
          const strokeWeight = !isInside ? 3 : 2;
          
          // 创建高德地图标记点
          const marker = new AMap.Marker({
            position: position,
            title: m.title + (!isInside ? ' (区域外)' : ''),
            content: `<div style="
              width: ${m.type === 'office' ? '20px' : '12px'};
              height: ${m.type === 'office' ? '20px' : '12px'};
              background-color: ${m.type === 'office' ? '#0284c7' : (m.type === 'market' ? '#f59e0b' : '#fff')};
              border: ${strokeWeight}px solid ${strokeColor};
              border-radius: 50%;
              opacity: 1;
            "></div>`,
          });
          
          // 点击事件
          marker.on('click', () => {
            const typeLabel = m.type === 'office' ? '经销商本部' : (m.type === 'market' ? '批发市场' : '终端网点');
            const statusHtml = !isInside ? '<span style="color: #ef4444; font-weight: bold; font-size: 10px; border: 1px solid #ef4444; border-radius: 4px; padding: 1px 4px; margin-left: 6px;">区域外</span>' : '<span style="color: #10b981; font-weight: bold; font-size: 10px; border: 1px solid #10b981; border-radius: 4px; padding: 1px 4px; margin-left: 6px;">区域内</span>';
            const ownerHtml = m.owner ? `<div style="display: flex; align-items: center; color: #64748b; margin-top: 2px;"><span style="font-weight: 600; min-width: 40px;">归属:</span><span>${m.owner}</span></div>` : '';
            const contentString = `<div style="padding: 8px; color: #334155; font-family: sans-serif;"><h3 style="font-weight: bold; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center;">${m.title}${statusHtml}</h3><div style="font-size: 12px; line-height: 1.6;"><div style="display: flex; align-items: center; color: #64748b;"><span style="font-weight: 600; min-width: 40px;">类型:</span><span>${typeLabel}</span></div>${ownerHtml}<div style="display: flex; align-items: center; color: #64748b;"><span style="font-weight: 600; min-width: 40px;">坐标:</span><span style="font-family: monospace;">${m.pos.lng.toFixed(5)}, ${m.pos.lat.toFixed(5)}</span></div></div></div>`;
            
            const infoWindow = new AMap.InfoWindow({
              content: contentString,
              offset: new AMap.Pixel(0, -20)
            });
            infoWindow.open(mapInstanceRef.current, position);
          });
          
          marker.setMap(mapInstanceRef.current);
          markerInstancesRef.current.push(marker);
          hasValidMarkers = true;
     });
     
     // 确保有足够的有效标记点来计算边界
     // 注意：必须确保所有边界值都是有效数字，不能是 Infinity 或 NaN
     const validMinLng = isFinite(minLng) && !isNaN(minLng) && minLng !== Infinity && minLng !== -Infinity ? minLng : null;
     const validMinLat = isFinite(minLat) && !isNaN(minLat) && minLat !== Infinity && minLat !== -Infinity ? minLat : null;
     const validMaxLng = isFinite(maxLng) && !isNaN(maxLng) && maxLng !== Infinity && maxLng !== -Infinity ? maxLng : null;
     const validMaxLat = isFinite(maxLat) && !isNaN(maxLat) && maxLat !== Infinity && maxLat !== -Infinity ? maxLat : null;
     
     if (hasValidMarkers && validMinLng !== null && validMinLat !== null && validMaxLng !== null && validMaxLat !== null) {
        const finalMinLng = Number(validMinLng);
        const finalMinLat = Number(validMinLat);
        const finalMaxLng = Number(validMaxLng);
        const finalMaxLat = Number(validMaxLat);

        if (isFinite(finalMinLng) && isFinite(finalMinLat) && isFinite(finalMaxLng) && isFinite(finalMaxLat) &&
            finalMinLng < finalMaxLng && finalMinLat < finalMaxLat &&
            finalMinLng >= -180 && finalMinLng <= 180 && finalMinLat >= -90 && finalMinLat <= 90 &&
            finalMaxLng >= -180 && finalMaxLng <= 180 && finalMaxLat >= -90 && finalMaxLat <= 90) {
          console.log('准备设置地图视野:', { minLng: finalMinLng, minLat: finalMinLat, maxLng: finalMaxLng, maxLat: finalMaxLat, markersCount: markers.length });
          try {
            // 使用 setFitView 而不是 setBounds，更安全
            const allOverlays = [...markerInstancesRef.current];
            if (polygonInstanceRef.current) {
              allOverlays.push(polygonInstanceRef.current);
            }
            if (allOverlays.length > 0) {
              mapInstanceRef.current.setFitView(allOverlays, false, [50, 50, 50, 50]);
              if (mapInstanceRef.current.getZoom() > 16) {
                mapInstanceRef.current.setZoom(16);
              }
            }
          } catch (e) {
            console.error('设置地图视野失败:', e);
          }
        } else {
          console.warn('跳过设置边界-坐标无效:', { finalMinLng, finalMinLat, finalMaxLng, finalMaxLat });
        }
     } else {
        console.log('跳过设置边界:', { hasValidMarkers, minLng, minLat, maxLng, maxLat });
     }
  }, [markers, isLoading, activePath]);



  const handleRetry = () => window.location.reload(); 
  const toggleOutletInput = () => { setShowOutletInput(!showOutletInput); if (showInput) setShowInput(false); if (showMarketDataInput) setShowMarketDataInput(false); }
  const togglePolygonInput = () => { setShowInput(!showInput); if (showOutletInput) setShowOutletInput(false); if (showMarketDataInput) setShowMarketDataInput(false); }
  const toggleMarketDataInput = () => { setShowMarketDataInput(!showMarketDataInput); if (showInput) setShowInput(false); if (showOutletInput) setShowOutletInput(false); }

  // Issue Handlers
  const addIssue = () => {
    if (!newIssueTitle.trim()) return;
    const newIssue: JBPIssue = { id: Date.now().toString(), title: newIssueTitle, description: newIssueDesc };
    updateData({ issues: [...data.issues, newIssue] });
    setNewIssueTitle(''); setNewIssueDesc(''); setIsAddingIssue(false);
  };

  const updateIssue = (id: string, updates: Partial<JBPIssue>) => {
    updateData({ issues: data.issues.map(i => i.id === id ? { ...i, ...updates } : i) });
  };

  const deleteIssue = (id: string) => {
    updateData({ issues: data.issues.filter(i => i.id !== id) });
  };

  // Opportunity Handlers
  const addOpportunity = () => {
    if (!newOpportunityTitle.trim()) return;
    const newOpp: JBPOpportunity = { 
        id: Date.now().toString(), 
        title: newOpportunityTitle, 
        description: newOpportunityDesc, 
        tag: newOpportunityTag 
    };
    updateData({ opportunities: [...data.opportunities, newOpp] });
    setNewOpportunityTitle(''); setNewOpportunityDesc(''); setNewOpportunityTag('新渠道'); setIsAddingOpportunity(false);
  };

  const updateOpportunity = (id: string, updates: Partial<JBPOpportunity>) => {
    updateData({ opportunities: data.opportunities.map(o => o.id === id ? { ...o, ...updates } : o) });
  };

  const deleteOpportunity = (id: string) => {
    updateData({ opportunities: data.opportunities.filter(o => o.id !== id) });
  };

  const OpportunityTagColor = (tag: string) => {
      switch(tag) {
          case '新渠道': return 'bg-blue-100 text-blue-700';
          case '新产品': return 'bg-emerald-100 text-emerald-700';
          case '效率优化': return 'bg-purple-100 text-purple-700';
          default: return 'bg-slate-100 text-slate-700';
      }
  };

  // ========== 授权地图范围确认 - 地图初始化 ==========
  useEffect(() => {
    let isMounted = true;
    const initMap = () => {
      if (territoryConfirmMapInstanceRef.current) return;
      if (!territoryConfirmMapRef.current) { setTimeout(initMap, 100); return; }

      const renderPolygons = async (map: any) => {
        let polygonList: any[] = [];
        if (data.authorizationPolygons && data.authorizationPolygons.length > 0) {
          polygonList = data.authorizationPolygons.map((p: any) => {
            if (p.coordinates) return p.coordinates[0];
            return p;
          });
        } else {
          try {
            const res = await fetch(`/ditu.md?t=${Date.now()}`);
            const wktText = await res.text();
            const match = wktText.match(/POLYGON \(\((.*)\)\)/i);
            if (match) {
              const path = match[1].split(',').map((p: string) => {
                const [lng, lat] = p.trim().split(' ').map(Number);
                return [lng, lat];
              });
              polygonList = [path];
            }
          } catch (e) { console.warn('加载默认地图范围失败'); }
        }
        if (polygonList.length === 0) return;
        territoryConfirmPolygonsRef.current.forEach((p: any) => p.setMap(null));
        territoryConfirmPolygonsRef.current = [];

        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        polygonList.forEach((path: number[][], i: number) => {
          const polygon = new (window as any).AMap.Polygon({
            path, strokeColor: '#3b82f6', strokeWeight: 2, strokeOpacity: 0.8,
            fillColor: '#3b82f6', fillOpacity: 0.12, zIndex: 100 + i,
          });
          polygon.setMap(map);
          territoryConfirmPolygonsRef.current.push(polygon);
          path.forEach(([lng, lat]) => { minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); });
        });
        if (minLng !== Infinity) {
          const maxSpan = Math.max(maxLng - minLng, maxLat - minLat);
          let zoom = 11; if (maxSpan > 2) zoom = 6; else if (maxSpan > 0.5) zoom = 9; else if (maxSpan > 0.1) zoom = 10;
          map.setCenter([(minLng + maxLng) / 2, (minLat + maxLat) / 2]);
          map.setZoom(zoom);
        }
      };

      try {
        if ((window as any).AMap) {
          const map = new (window as any).AMap.Map(territoryConfirmMapRef.current, { center: [118.5, 40.8], zoom: 5, viewMode: '2D', showIndoorMap: false });
          territoryConfirmMapInstanceRef.current = map;
          renderPolygons(map);
        } else {
          const script = document.createElement('script');
          script.src = `https://webapi.amap.com/maps?v=2.0&key=09706e6d3502770b99148345f3b1dc47`;
          script.onload = () => { if (!isMounted) return; const map = new (window as any).AMap.Map(territoryConfirmMapRef.current, { center: [118.5, 40.8], zoom: 5, viewMode: '2D', showIndoorMap: false }); territoryConfirmMapInstanceRef.current = map; renderPolygons(map); };
          document.head.appendChild(script);
        }
      } catch (e) { console.warn('地图初始化失败', e); }
    };
    setTimeout(initMap, 200);
    return () => { isMounted = false; };
  }, [data.authorizationPolygons]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12 relative">
      {/* 顶部居中的验证错误提示 */}
      {validationError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-amber-500 text-white rounded-xl shadow-lg flex items-center animate-fade-in">
              <AlertCircle size={20} className="mr-2" />
              <span className="font-medium">{validationError}</span>
          </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">经营回顾</h2>
        <p className="text-slate-500">在设定新目标前，让我们先回顾一下今年授权区域覆盖情况与明年规划授权区域的经营表现。</p>
      </div>

      <div className="space-y-8">
        
        {/* ========== 🏢 商维度 ========== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6 border-b border-slate-200 pb-3">
                <h2 className="text-xl font-bold text-slate-800 flex items-center">
                    <Layers size={22} className="mr-2 text-indigo-600" />
                    商维度
                </h2>
            </div>

            <div className="mb-4 pb-4">
                <h3 className="font-bold text-slate-800 flex items-center">
                    <Layers size={20} className="mr-2 text-slate-500" />
                    运营资源投入 (Operational Resources)
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Warehouse */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 font-medium mb-2">仓库面积 (Warehouse)</div>
                    {isEditingOperations ? (
                        <div className="flex items-center">
                            <input 
                                type="text" 
                                value={data.operations.warehouse} 
                                onChange={(e) => updateOperationsData('warehouse', e.target.value)}
                                className="w-full text-lg font-bold text-slate-800 bg-white border border-brand-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-100"
                            />
                            <span className="ml-2 text-slate-400">㎡</span>
                        </div>
                    ) : (
                        <div>
                            <div className="text-2xl font-bold text-slate-800 mb-2">{data.operations.warehouse} <span className="text-sm font-normal text-slate-400">㎡</span></div>
                            <div className="text-xs text-slate-500">
                                占用面积
                            </div>
                        </div>
                    )}
                </div>

                {/* Vehicles */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 font-medium mb-2">车辆数量</div>
                    {isEditingOperations ? (
                        <div className="space-y-2">
                            {data.operations.vehicles.map((v, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={v.name}
                                        onChange={(e) => {
                                            const newVehicles = [...data.operations.vehicles];
                                            newVehicles[idx] = { ...v, name: e.target.value };
                                            updateOperationsData('vehicles', newVehicles);
                                        }}
                                        className="w-2/3 text-sm border rounded px-1"
                                        placeholder="名称"
                                    />
                                    <input
                                        value={v.count}
                                        onChange={(e) => {
                                            const newVehicles = [...data.operations.vehicles];
                                            newVehicles[idx] = { ...v, count: e.target.value };
                                            updateOperationsData('vehicles', newVehicles);
                                        }}
                                        className="w-1/3 text-sm border rounded px-1"
                                        placeholder="数量"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div className="text-2xl font-bold text-slate-800 mb-2">
                                {data.operations.vehicles.reduce((acc, v) => acc + (Number(v.count) || 0), 0)} <span className="text-sm font-normal text-slate-400">辆</span>
                            </div>
                            <div className="space-y-1">
                                {data.operations.vehicles.map((v, idx) => (
                                    <div key={idx} className="flex justify-between text-xs text-slate-500">
                                        <span>{v.name}</span>
                                        <span className="font-medium text-slate-700">{v.count} 辆</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Personnel */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 font-medium mb-2">人员团队 (Team)</div>
                    {isEditingOperations ? (
                        <div className="space-y-2">
                            {data.operations.personnel.map((p, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input 
                                        value={p.name} 
                                        onChange={(e) => {
                                            const newPersonnel = [...data.operations.personnel];
                                            newPersonnel[idx] = { ...p, name: e.target.value };
                                            updateOperationsData('personnel', newPersonnel);
                                        }}
                                        className="w-2/3 text-sm border rounded px-1"
                                        placeholder="岗位"
                                    />
                                    <input 
                                        value={p.count} 
                                        onChange={(e) => {
                                            const newPersonnel = [...data.operations.personnel];
                                            newPersonnel[idx] = { ...p, count: e.target.value };
                                            updateOperationsData('personnel', newPersonnel);
                                        }}
                                        className="w-1/3 text-sm border rounded px-1"
                                        placeholder="人数"
                                    />
                                </div>
                            ))}
                            <button 
                                onClick={() => updateOperationsData('personnel', [...data.operations.personnel, { id: Date.now().toString(), name: '', count: '' }])}
                                className="text-xs text-brand-600 flex items-center mt-1"
                            >
                                <Plus size={12} className="mr-1"/> 添加人员
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="text-2xl font-bold text-slate-800 mb-2">
                                {data.operations.personnel.reduce((acc, p) => acc + (Number(p.count) || 0), 0)} <span className="text-sm font-normal text-slate-400">人</span>
                            </div>
                            <div className="space-y-1">
                                {data.operations.personnel.map((p, idx) => (
                                    <div key={idx} className="flex justify-between text-xs text-slate-500">
                                        <span>{p.name}</span>
                                        <span className="font-medium text-slate-700">{p.count} 人</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Capital */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 font-medium mb-2">资金投入 (Capital)</div>
                    {isEditingOperations ? (
                        <div>
                            <input
                                value={data.operations.capital.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)}
                                onChange={(e) => {
                                    const total = Number(e.target.value) || 0;
                                    updateOperationsData('capital', [{ id: 'c_total', name: '资金投入', amount: total }]);
                                }}
                                className="w-full text-lg font-bold text-slate-800 bg-white border border-brand-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </div>
                    ) : (
                        <div>
                            <div className="text-2xl font-bold text-slate-800 mb-2">
                                {data.operations.capital.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)} <span className="text-sm font-normal text-slate-400">万</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6 pb-4">
                    <h3 className="font-bold text-slate-800 flex items-center">
                    <TrendingUp size={20} className="mr-2 text-indigo-600" />
                    经营数据概览 (Performance Overview)
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                    <div className="flex justify-between items-start mb-2"><div className="text-sm text-slate-500 font-medium">年度进货额 (Sell-in)</div></div>
                    {isEditingMetrics ? (
                        <input value={data.performance.sellIn} onChange={(e) => updatePerformance('sellIn', e.target.value)} className="w-full text-2xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-100" />
                    ) : (
                        <div className="text-2xl font-bold text-slate-800 mb-1">¥ {data.performance.sellIn} <span className="text-sm text-slate-400 font-normal ml-1">万</span></div>
                    )}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '95%' }}></div></div>
                    <div className="text-xs text-slate-400 mt-1">目标达成率 95%</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                     <div className="flex justify-between items-start mb-2"><div className="text-sm text-slate-500 font-medium">年度卖货额 (Sell-out)</div></div>
                    {isEditingMetrics ? (
                        <input value={data.performance.sellOut} onChange={(e) => updatePerformance('sellOut', e.target.value)} className="w-full text-2xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-100" />
                    ) : (
                        <div className="text-2xl font-bold text-slate-800 mb-1">¥ {data.performance.sellOut} <span className="text-sm text-slate-400 font-normal ml-1">万</span></div>
                    )}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '92%' }}></div></div>
                    <div className="text-xs text-slate-400 mt-1">目标达成率 92%</div>
                </div>
                {/* Metric: Operational Investment */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-slate-500 font-medium flex items-center"><Wallet size={14} className="mr-1 text-rose-500"/> 运营总投入</div>
                    </div>
                    {isEditingMetrics ? (
                        <div className="flex gap-2">
                            <input value={data.performance.investment} onChange={(e) => updatePerformance('investment', e.target.value)} className="w-1/2 text-xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-1 py-1 outline-none focus:ring-2 focus:ring-brand-100" placeholder="投入" />
                            <input value={data.performance.roi} onChange={(e) => updatePerformance('roi', e.target.value)} className="w-1/2 text-xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-1 py-1 outline-none focus:ring-2 focus:ring-brand-100" placeholder="ROI" />
                        </div>
                    ) : (
                        <div className="text-2xl font-bold text-slate-800 mb-1">¥ {data.performance.investment} <span className="text-sm text-slate-400 font-normal ml-1">万</span></div>
                    )}
                    <div className="text-xs text-slate-400 mt-2">含物料/促销/人员费用</div>
                </div>
                {/* Metric: Profit */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors relative">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-slate-500 font-medium flex items-center"><Coins size={14} className="mr-1 text-amber-500"/> 利润额 (Net Profit)</div>
                        {/* Detail Button Trigger */}
                        <button 
                            onClick={() => setShowProfitModal(true)}
                            className="text-xs font-medium text-amber-600 flex items-center hover:bg-amber-50 px-2 py-0.5 rounded transition-colors"
                        >
                            详情 <Eye size={12} className="ml-1"/>
                        </button>
                    </div>
                    {isEditingMetrics ? (
                        <div className="flex gap-2">
                            <input type="text" inputMode="decimal" value={data.performance.profit || ''} onChange={(e) => updatePerformance('profit', filterDecimal(e.target.value))} className="w-1/2 text-xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-1 py-1 outline-none focus:ring-2 focus:ring-brand-100" placeholder="利润" />
                            <input type="text" inputMode="decimal" value={data.performance.profitMargin || ''} onChange={(e) => updatePerformance('profitMargin', filterDecimal(e.target.value))} className="w-1/2 text-xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-1 py-1 outline-none focus:ring-2 focus:ring-brand-100" placeholder="%" />
                        </div>
                    ) : (
                        <div className="text-2xl font-bold text-slate-800 mb-1">¥ {data.performance.profit} <span className="text-sm text-slate-400 font-normal ml-1">万</span></div>
                    )}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${data.performance.profitMargin}%` }}></div></div>
                    <div className="text-xs text-slate-400 mt-1">利润率 {data.performance.profitMargin}%</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                     <div className="flex justify-between items-start mb-2"><div className="text-sm text-slate-500 font-medium">网点覆盖数</div></div>
                    {isEditingMetrics ? (
                        <input value={data.performance.coverage} onChange={(e) => updatePerformance('coverage', e.target.value)} className="w-full text-2xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-100" />
                    ) : (
                        <div className="text-2xl font-bold text-slate-800 mb-1">{data.performance.coverage}<span className="text-sm text-slate-400 font-normal ml-1">家</span></div>
                    )}
                    <div className="text-xs text-slate-400 mt-2">区域覆盖率: 68%</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                     <div className="flex justify-between items-start mb-2"><div className="text-sm text-slate-500 font-medium">铺市率</div></div>
                    {isEditingMetrics ? (
                        <input value={data.performance.distribution} onChange={(e) => updatePerformance('distribution', e.target.value)} className="w-full text-2xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-100" />
                    ) : (
                        <div className="text-2xl font-bold text-slate-800 mb-2">{data.performance.distribution}%</div>
                    )}
                    <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${data.performance.distribution}%` }}></div></div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                     <div className="flex justify-between items-start mb-2"><div className="text-sm text-slate-500 font-medium">冰柜投放数</div></div>
                    {isEditingMetrics ? (
                        <input value={data.performance.coolers} onChange={(e) => updatePerformance('coolers', e.target.value)} className="w-full text-2xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-100" />
                    ) : (
                        <div className="text-2xl font-bold text-slate-800 mb-1">{data.performance.coolers} <span className="text-sm text-slate-400 font-normal ml-1">台</span></div>
                    )}
                    <div className="text-xs text-slate-400 mt-2">冰柜渗透率: 50%</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                     <div className="flex justify-between items-start mb-2"><div className="text-sm text-slate-500 font-medium">vpo</div></div>
                    {isEditingMetrics ? (
                        <input value={data.performance.efficiency} onChange={(e) => updatePerformance('efficiency', e.target.value)} className="w-full text-2xl font-bold text-slate-800 mb-1 bg-white border border-brand-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-100" />
                    ) : (
                        <div className="text-2xl font-bold text-slate-800 mb-1">{data.performance.efficiency} <span className="text-sm text-slate-400 font-normal ml-1">元/店</span></div>
                    )}
                    <div className="text-xs text-slate-400 mt-2">高于区域平均水平</div>
                </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-800 flex items-center"><BarChart3 size={20} className="mr-2 text-indigo-600" />经营趋势分析 (Business Trends)</h4>
                </div>
                
                <div className="h-[400px] w-full">
                    {isEditingTrends ? (
                        <div className="w-full h-full overflow-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-r border-slate-200 w-20 bg-slate-50">月份</th>
                                        <th className="px-4 py-3 border-b border-slate-200 bg-slate-50">库存 (箱)</th>
                                        <th className="px-4 py-3 border-b border-slate-200 bg-slate-50">周转天数</th>
                                        <th className="px-4 py-3 border-b border-slate-200 bg-slate-50">进货达成%</th>
                                        <th className="px-4 py-3 border-b border-slate-200 bg-slate-50">卖货达成%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.trends.map((row, index) => (
                                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-2 font-bold border-r border-slate-100 bg-slate-50/50">{row.month}</td>
                                            <td className="px-4 py-2"><input type="number" value={row.inventory} onChange={(e) => updateTrendData(index, 'inventory', e.target.value)} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"/></td>
                                            <td className="px-4 py-2"><input type="number" value={row.days} onChange={(e) => updateTrendData(index, 'days', e.target.value)} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"/></td>
                                            <td className="px-4 py-2"><input type="number" value={row.sellIn} onChange={(e) => updateTrendData(index, 'sellIn', e.target.value)} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"/></td>
                                            <td className="px-4 py-2"><input type="number" value={row.sellOut} onChange={(e) => updateTrendData(index, 'sellOut', e.target.value)} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"/></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.trends} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} label={{ value: '库存数量 (箱)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} label={{ value: '比率(%) / 天数', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontSize: '12px' }} labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar yAxisId="left" dataKey="inventory" name="库存数量" barSize={32} fill="#a78bfa" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="days" name="周转天数" stroke="#f59e0b" strokeWidth={2} dot={{r: 4, strokeWidth: 0, fill: '#f59e0b'}} />
                                <Line yAxisId="right" type="monotone" dataKey="sellIn" name="进货达成率(%)" stroke="#0ea5e9" strokeWidth={2} dot={{r: 4, strokeWidth: 0, fill: '#0ea5e9'}} />
                                <Line yAxisId="right" type="monotone" dataKey="sellOut" name="卖货达成率(%)" stroke="#10b981" strokeWidth={2} dot={{r: 4, strokeWidth: 0, fill: '#10b981'}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6 pb-4">
                    <h3 className="font-bold text-slate-800 flex items-center">
                    <PieChart size={20} className="mr-2 text-indigo-600" />
                    经营品类分析 (Category Analysis)
                </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart Section */}
                <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                            <Pie
                                data={data.productCategories}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="sales"
                                nameKey="name"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {data.productCategories.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][index % 5]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </RPieChart>
                    </ResponsiveContainer>
                </div>

                {/* Data Table Section */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 border-b border-slate-200">品类名称</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right">销售额 (万)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.productCategories.map((item, index) => (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {isEditingCategories ? (
                                            <input
                                                value={item.name}
                                                onChange={(e) => {
                                                    const newData = [...data.productCategories];
                                                    newData[index] = { ...newData[index], name: e.target.value };
                                                    updateData({ productCategories: newData });
                                                }}
                                                className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"
                                            />
                                        ) : item.name}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isEditingCategories ? (
                                            <input
                                                type="number"
                                                value={item.sales}
                                                onChange={(e) => updateCategoryData(index, 'sales', e.target.value)}
                                                className="w-20 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"
                                            />
                                        ) : item.sales}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </div>

        <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center mr-3"><MapPin size={18} className="mr-2 text-brand-600" />授权经营区域 (Authorized Territory)</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">若需调整授权区域，请返回第一个节点基本信息去编辑。</p>
                    </div>
                    <div className="flex items-center space-x-2" style={{ display: readOnly ? 'none' : 'flex' }}>
                        <button onClick={handleRetry} className="text-xs flex items-center font-medium px-3 py-1.5 rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"><RefreshCw size={14} className="mr-1"/>刷新</button>
                        <button onClick={toggleMarketDataInput} className={`text-xs flex items-center font-medium px-3 py-1.5 rounded-lg border ${showMarketDataInput ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'}`}>{showMarketDataInput ? <X size={14} className="mr-1"/> : <Database size={14} className="mr-1"/>}{showMarketDataInput ? '取消' : '录入数据'}</button>
                    </div>
                </div>
                {showMarketDataInput && (
                    <div className="p-6 bg-slate-50 border-b border-slate-200 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Column 1: Market Stats */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center"><Info size={16} className="mr-2 text-amber-500"/> 1. 基础市场指标</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">常驻人口</label>
                                        <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-brand-500">
                                            <Users size={14} className="text-slate-400 mr-2"/>
                                            <input type="text" inputMode="decimal" value={data.marketStats.population} onChange={(e) => updateMarketStat('population', filterDecimal(e.target.value))} className="w-full text-sm outline-none" placeholder="例如: 245" />
                                            <span className="text-xs text-slate-400 ml-1 whitespace-nowrap">万</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">区域 GDP</label>
                                        <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-brand-500">
                                            <Wallet size={14} className="text-slate-400 mr-2"/>
                                            <input type="text" inputMode="decimal" value={data.marketStats.gdp} onChange={(e) => updateMarketStat('gdp', filterDecimal(e.target.value))} className="w-full text-sm outline-none" placeholder="例如: 380.2" />
                                            <span className="text-xs text-slate-400 ml-1 whitespace-nowrap">亿</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">人均饮用量</label>
                                        <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-brand-500">
                                            <CupSoda size={14} className="text-slate-400 mr-2"/>
                                            <input type="text" inputMode="decimal" value={data.marketStats.perCapitaConsumption} onChange={(e) => updateMarketStat('perCapitaConsumption', filterDecimal(e.target.value))} className="w-full text-sm outline-none" placeholder="例如: 42.5" />
                                            <span className="text-xs text-slate-400 ml-1 whitespace-nowrap">升/年</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Competitors */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-slate-700 flex items-center"><BarChart size={16} className="mr-2 text-brand-500"/> 2. 竞品数据</h4>
                                    {!readOnly && <button onClick={addCompetitor} className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100 transition-colors flex items-center"><Plus size={12} className="mr-1"/>添加竞品</button>}
                                </div>
                                <div className="mb-2 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2">
                                    <span className="col-span-3">竞品品牌</span>
                                    <span className="col-span-2">今年业绩</span>
                                    <span className="col-span-2">网点数</span>
                                    <span className="col-span-2">达成率</span>
                                    <span className="col-span-1"></span>
                                </div>
                                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                    {data.competitors.map((comp) => (
                                        <div key={comp.id} className="grid grid-cols-12 gap-1.5 bg-white p-2 rounded-lg border border-slate-200 items-center">
                                            <div className="col-span-3">
                                                <input disabled={readOnly} value={comp.name} maxLength={10}
                                                    onChange={(e) => { const v = e.target.value.slice(0, 10); updateCompetitor(comp.id, {name: v}); }}
                                                    className="w-full text-xs font-medium bg-slate-50 border-none rounded px-2 py-1" placeholder="品牌名" />
                                            </div>
                                            <div className="col-span-2">
                                                <div className="flex items-center bg-slate-50 rounded px-2 py-1">
                                                    <input type="text" inputMode="decimal" disabled={readOnly}
                                                        value={comp.target} onChange={(e) => updateCompetitor(comp.id, {target: filterDecimal(e.target.value)})}
                                                        className="w-10 text-xs border-none bg-transparent outline-none text-right" placeholder="0" />
                                                    <span className="text-[10px] text-slate-400 ml-0.5">万</span>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="flex items-center bg-slate-50 rounded px-2 py-1">
                                                    <input type="text" inputMode="numeric" disabled={readOnly}
                                                        value={comp.outlets} onChange={(e) => { const v = filterDecimal(e.target.value).replace(/\.\d*$/, ''); updateCompetitor(comp.id, {outlets: parseInt(v) || 0}); }}
                                                        className="w-full text-xs border-none bg-transparent outline-none" placeholder="0" />
                                                    <span className="text-[10px] text-slate-400 ml-0.5">家</span>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="flex items-center bg-slate-50 rounded px-2 py-1">
                                                    <input type="text" inputMode="decimal" disabled={readOnly}
                                                        value={comp.achievement.toString()} onChange={(e) => {
                                                            const v = filterDecimal(e.target.value);
                                                            const n = parseFloat(v) || 0;
                                                            updateCompetitor(comp.id, {achievement: Math.min(100, n)});
                                                        }}
                                                        className="w-8 text-xs border-none bg-transparent outline-none text-right" placeholder="0" />
                                                    <span className="text-[10px] text-slate-400 ml-0.5">%</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                {!readOnly && <button onClick={() => removeCompetitor(comp.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            {!readOnly && <button onClick={() => setShowMarketDataInput(false)} className="bg-brand-600 text-white text-xs font-bold px-6 py-2 rounded-lg flex items-center shadow-lg shadow-brand-200"><Save size={14} className="mr-1"/> 保存并同步</button>}
                        </div>
                    </div>
                )}
                
                <div className="relative h-[400px] w-full bg-slate-100 group">
                    <div ref={mapContainerRef} className="w-full h-full z-0 outline-none"></div>
                    
                    {/* Market Intelligence Panel - Left Aligned */}
                    {!isLoading && !mapError && (
                        <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none animate-slide-in-left">
                             <div className={`bg-white/90 backdrop-blur-md border border-white/50 shadow-xl rounded-xl transition-all duration-300 pointer-events-auto overflow-hidden ${isIntelligenceCollapsed ? 'w-10 h-10' : 'w-64'}`}>
                                {/* Header Toggle */}
                                <div 
                                    className={`flex items-center justify-between px-3 h-10 cursor-pointer hover:bg-slate-50/50 transition-colors ${!isIntelligenceCollapsed ? 'border-b border-slate-100' : ''}`}
                                    onClick={() => setIsIntelligenceCollapsed(!isIntelligenceCollapsed)}
                                >
                                    {!isIntelligenceCollapsed ? (
                                        <>
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                                <Info size={10} className="mr-1"/> 市场潜力与竞品分析
                                            </h4>
                                            <Minimize2 size={12} className="text-slate-400" />
                                        </>
                                    ) : (
                                        <Maximize2 size={16} className="text-brand-600 mx-auto" />
                                    )}
                                </div>
                                
                                {/* Stats Content */}
                                {!isIntelligenceCollapsed && (
                                    <div className="p-3 space-y-4 animate-fade-in">
                                        {/* Market Demographics */}
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="bg-blue-50 p-1.5 rounded-lg mr-2.5">
                                                        <Users size={13} className="text-blue-600"/>
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-medium">常驻人口</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-800 font-mono">{data.marketStats.population}<span className="text-[10px] text-slate-400 ml-0.5">万</span></span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="bg-amber-50 p-1.5 rounded-lg mr-2.5">
                                                        <Wallet size={13} className="text-amber-600"/>
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-medium">区域 GDP</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-800 font-mono">{data.marketStats.gdp}<span className="text-[10px] text-slate-400 ml-0.5">亿</span></span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="bg-emerald-50 p-1.5 rounded-lg mr-2.5">
                                                        <CupSoda size={13} className="text-emerald-600"/>
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-medium">人均饮用量</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-800 font-mono">{data.marketStats.perCapitaConsumption}<span className="text-[10px] text-slate-400 ml-0.5">升/年</span></span>
                                            </div>
                                        </div>

                                        {/* Competitor Analysis Section */}
                                        <div className="pt-3 border-t border-slate-100">
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center">
                                                <BarChart size={10} className="mr-1"/> 竞品业绩达成 (Targets)
                                            </h5>
                                            <div className="space-y-2.5">
                                                {data.competitors.length === 0 ? (
                                                    <p className="text-[10px] text-slate-400 italic text-center py-2">暂无竞品数据</p>
                                                ) : (
                                                    data.competitors.map((comp) => (
                                                        <div key={comp.id} className="flex flex-col gap-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center">
                                                                    <span className="text-[10px] font-extrabold bg-slate-800 text-white px-1.5 py-0.5 rounded-md min-w-[28px] text-center mr-2 font-mono">
                                                                        {comp.name || comp.abbr || '??'}
                                                                    </span>
                                                                    <div className="flex flex-col ml-1">
                                                                        <span className="text-[11px] text-slate-600 font-semibold leading-tight">{comp.target || '-'}</span>
                                                                        {comp.outlets && (
                                                                            <span className="text-[9px] text-slate-400 flex items-center mt-0.5">
                                                                                <Store size={8} className="mr-0.5"/> {comp.outlets}家
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className={`text-[10px] font-bold ${comp.achievement >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                    达成 {comp.achievement}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${comp.achievement >= 90 ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                                                                    style={{ width: `${Math.min(comp.achievement, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 text-[8px] text-slate-400 text-center uppercase tracking-tighter">
                                            更新于: 2024-11-20
                                        </div>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}

                    {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10 bg-opacity-80"><div className="flex flex-col items-center text-slate-400"><Loader2 size={32} className="animate-spin mb-2 text-brand-500" /><span>地图资源加载中...</span></div></div>}
                    {mapError && !isLoading && <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400 text-sm z-10 text-center p-6"><AlertCircle className="mx-auto mb-3 text-amber-500" size={32} /><p className="font-bold text-slate-700 mb-1">地图加载失败</p><button onClick={handleRetry} className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs font-medium hover:text-brand-600"><RefreshCw size={14} className="mr-2" />重试加载</button></div>}
                </div>
            </div>
        </div>

        {/* ========== 🏪 终端维度 ========== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6 border-b border-slate-200 pb-3">
                <h2 className="text-xl font-bold text-slate-800 flex items-center">
                    <Users size={22} className="mr-2 text-emerald-600" />
                    终端维度
                </h2>
            </div>

            <div className="mb-4 pb-4">
                <h3 className="font-bold text-slate-800 flex items-center">
                    <Users size={20} className="mr-2 text-slate-500" />
                    客户分级分析 (Customer Segmentation Analysis)
                </h3>
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
                        {['今年地图范围', '新地图范围'].map((label, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCustomerScopeTab(idx)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${customerScopeTab === idx ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 flex items-center mb-4">
                        <Layers size={16} className="mr-2 text-brand-500"/> 客户分级金字塔 (点击查看明细)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {(customerScopeTab === 0
                          ? data.customerAnalysis.segments
                          : data.customerAnalysis.segments.map((seg, i) => ({
                              ...seg,
                              count: Math.round(seg.count * (0.8 + i * 0.1)),
                              salesShare: parseFloat((seg.salesShare * (0.85 + i * 0.05)).toFixed(1)),
                              profitShare: parseFloat((seg.profitShare * (0.85 + i * 0.05)).toFixed(1)),
                            }))
                        ).map((segment, index) => {
                            const oldSeg = data.customerAnalysis.segments[index];
                            const countDelta = oldSeg ? parseFloat(((segment.count - oldSeg.count) / oldSeg.count * 100).toFixed(1)) : 0;
                            return (
                            <div
                                key={segment.type}
                                className={`relative group h-full cursor-pointer transition-all duration-200 ${selectedSegment === segment.type ? 'ring-2 ring-brand-500 transform scale-[1.02]' : 'hover:shadow-md'}`}
                                onClick={() => setSelectedSegment(selectedSegment === segment.type ? null : segment.type)}
                            >
                                <div className={`p-4 rounded-xl border h-full flex flex-col justify-between ${segment.type === 'S' ? 'bg-rose-50 border-rose-200' : segment.type === 'A' ? 'bg-indigo-50 border-indigo-200' : segment.type === 'B' ? 'bg-blue-50 border-blue-200' : segment.type === 'C' ? 'bg-slate-50 border-slate-200' : segment.type === 'other' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${segment.type === 'S' ? 'bg-rose-600 text-white' : segment.type === 'A' ? 'bg-indigo-600 text-white' : segment.type === 'B' ? 'bg-blue-500 text-white' : segment.type === 'C' ? 'bg-slate-500 text-white' : segment.type === 'other' ? 'bg-amber-500 text-white' : 'bg-gray-400 text-white'}`}>
                                                {segment.type === 'other' ? '其他' : segment.type === 'empty' ? '空' : `Class ${segment.type}`}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            {isEditingCustomerAnalysis ? (
                                                <div className="flex items-center justify-end">
                                                    <input
                                                        type="number"
                                                        value={segment.count}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            updateCustomerSegment(index, 'count', e.target.value);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xl font-bold text-slate-800 bg-white border border-slate-300 rounded px-1 w-16 text-right"
                                                    />
                                                    <span className="text-xs text-slate-400 ml-1">家</span>
                                                </div>
                                            ) : (
                                                <div className="text-xl font-bold text-slate-800">{segment.count} <span className="text-xs font-normal text-slate-400">家</span></div>
                                            )}
                                            {customerScopeTab === 1 && countDelta !== 0 && (
                                                <div className={`text-xs font-medium mt-0.5 ${countDelta >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {countDelta >= 0 ? '+' : ''}{countDelta}%
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-200/50">
                                        <div>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">销量贡献</span>
                                            {isEditingCustomerAnalysis ? (
                                                <div className="flex items-center">
                                                    <input
                                                        type="number"
                                                        value={segment.salesShare}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            updateCustomerSegment(index, 'salesShare', e.target.value);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded px-1 w-12"
                                                    />
                                                    <span className="text-xs text-slate-500 ml-1">%</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <div className="flex-grow h-1.5 bg-slate-200 rounded-full mr-2 overflow-hidden">
                                                        <div className={`h-full rounded-full ${segment.type === 'S' ? 'bg-rose-500' : segment.type === 'A' ? 'bg-indigo-500' : segment.type === 'B' ? 'bg-blue-500' : segment.type === 'C' ? 'bg-slate-400' : segment.type === 'other' ? 'bg-amber-400' : 'bg-gray-300'}`} style={{width: `${segment.salesShare}%`}}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">{segment.salesShare}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                          );
                        })}
                    </div>
                </div>

                {/* Customer List Section */}
                {selectedSegment && (
                    <div className="mt-6 border-t border-slate-100 pt-6 animate-fade-in">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center mb-4">
                            <Users size={16} className="mr-2 text-brand-500"/>
                            Class {selectedSegment} - 客户明细
                        </h4>
                        <div className="overflow-x-auto bg-slate-50 rounded-xl border border-slate-200">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">客户名称</th>
                                        <th className="px-4 py-3 font-semibold text-right">销售额</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.customerAnalysis.segments.find(s => s.type === selectedSegment)?.customers?.map((customer) => (
                                        <tr key={customer.id} className="border-b border-slate-200 last:border-0 hover:bg-white transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-800">{customer.name}</td>
                                            <td className="px-4 py-3 text-right font-mono">{customer.sales.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {(!data.customerAnalysis.segments.find(s => s.type === selectedSegment)?.customers || data.customerAnalysis.segments.find(s => s.type === selectedSegment)?.customers?.length === 0) && (
                                        <tr>
                                            <td colSpan={2} className="px-4 py-8 text-center text-slate-400">
                                                暂无该分类客户数据
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>


            <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6 pb-4">
                    <h3 className="font-bold text-slate-800 flex items-center">
                    <Store size={20} className="mr-2 text-indigo-600" />
                    渠道表现分析 (Channel Analysis)
                </h3>
            </div>

                <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
                    {['今年地图范围', '新地图范围'].map((label, idx) => (
                        <button
                            key={idx}
                            onClick={() => setChannelScopeTab(idx)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${channelScopeTab === idx ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart Section */}
                <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={channelScopeTab === 0 ? (data.channelAnalysis || []) : (data.channelAnalysis || []).map((ch, i) => ({...ch, sales: Math.round(ch.sales * (0.85 + i * 0.1)), profitMargin: parseFloat((ch.profitMargin * (0.9 + i * 0.07)).toFixed(1)), contribution: parseFloat((ch.contribution * (0.9 + i * 0.07)).toFixed(1))}))} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="sales" name="销售额" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                            <Line yAxisId="right" type="monotone" dataKey="profitMargin" name="利润率" stroke="#f59e0b" strokeWidth={2} dot={{r: 4, strokeWidth: 0, fill: '#f59e0b'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Data Table Section */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 border-b border-slate-200">渠道名称</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right">销售额</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right">贡献度 (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.channelAnalysis || []).map((item, index) => (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {isEditingChannelAnalysis ? (
                                            <input 
                                                value={item.name} 
                                                onChange={(e) => {
                                                    const newData = [...data.channelAnalysis];
                                                    newData[index] = { ...newData[index], name: e.target.value };
                                                    updateData({ channelAnalysis: newData });
                                                }}
                                                className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"
                                            />
                                        ) : item.name}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isEditingChannelAnalysis ? (
                                            <input
                                                type="number"
                                                value={item.sales}
                                                onChange={(e) => updateChannelData(index, 'sales', e.target.value)}
                                                className="w-20 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"
                                            />
                                        ) : <>{item.sales.toLocaleString()}{channelScopeTab === 1 && (() => { const old = (data.channelAnalysis || [])[index]; const d = old && old.sales ? parseFloat(((item.sales - old.sales) / old.sales * 100).toFixed(1)) : 0; return <span className={`text-xs font-bold ml-1.5 ${d >= 0 ? 'text-red-500' : 'text-green-500'}`}>{d >= 0 ? '+' : ''}{d}%</span>; })()}</>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isEditingChannelAnalysis ? (
                                            <input
                                                type="number"
                                                value={item.contribution}
                                                onChange={(e) => updateChannelData(index, 'contribution', e.target.value)}
                                                className="w-16 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-end">
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full mr-2 overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{width: `${item.contribution}%`}}></div>
                                                </div>
                                                <span className="text-xs text-slate-500">{item.contribution}%</span>
                                            </div>
                                        )}{channelScopeTab === 1 && (() => { const old = (data.channelAnalysis || [])[index]; const d = old && old.contribution ? parseFloat(((item.contribution - old.contribution) / old.contribution * 100).toFixed(1)) : 0; return <span className={`text-xs font-bold ml-1.5 ${d >= 0 ? 'text-red-500' : 'text-green-500'}`}>{d >= 0 ? '+' : ''}{d}%</span>; })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6 pb-4">
                    <h3 className="font-bold text-slate-800 flex items-center">
                    <Users size={20} className="mr-2 text-indigo-600" />
                    团队业绩分析 (Team Performance)
                </h3>
            </div>

                <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
                    {['今年地图范围', '新地图范围'].map((label, idx) => (
                        <button
                            key={idx}
                            onClick={() => setTeamScopeTab(idx)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${teamScopeTab === idx ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart Section */}
                <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RBarChart data={teamScopeTab === 0 ? (data.teamAnalysis || []) : (data.teamAnalysis || []).map((tm, i) => ({...tm, sales: Math.round(tm.sales * (0.85 + i * 0.1)), profitMargin: parseFloat((tm.profitMargin * (0.9 + i * 0.07)).toFixed(1)), contribution: parseFloat((tm.contribution * (0.9 + i * 0.07)).toFixed(1))}))} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={60} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
                                                <p className="font-bold mb-1">{data.name} ({data.status === 'active' ? '在职' : '离职'})</p>
                                                <p className="text-slate-500">销售额: {data.sales.toLocaleString()}</p>
                                                <p className="text-slate-500">利润率: {data.profitMargin}%</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend />
                            <Bar dataKey="sales" name="销售额" radius={[0, 4, 4, 0]} barSize={20}>
                                { (data.teamAnalysis || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.status === 'active' ? '#6366f1' : '#94a3b8'} />
                                ))}
                            </Bar>
                        </RBarChart>
                    </ResponsiveContainer>
                </div>

                {/* Data Table Section */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 border-b border-slate-200">姓名</th>
                                <th className="px-4 py-3 border-b border-slate-200">状态</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right">销售额</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right">贡献度 (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.teamAnalysis || []).map((item, index) => (
                                <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 ${item.status === 'resigned' ? 'bg-slate-50/50' : ''}`}>
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {isEditingTeamAnalysis ? (
                                            <input 
                                                value={item.name} 
                                                onChange={(e) => updateTeamData(index, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"
                                            />
                                        ) : item.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isEditingTeamAnalysis ? (
                                            <select 
                                                value={item.status} 
                                                onChange={(e) => updateTeamData(index, 'status', e.target.value)}
                                                className="bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none text-xs"
                                            >
                                                <option value="active">在职</option>
                                                <option value="resigned">离职</option>
                                            </select>
                                        ) : (
                                            <span className={`text-xs px-2 py-0.5 rounded ${item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                                {item.status === 'active' ? '在职' : '离职'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isEditingTeamAnalysis ? (
                                            <input
                                                type="number"
                                                value={item.sales}
                                                onChange={(e) => updateTeamData(index, 'sales', e.target.value)}
                                                className="w-20 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"
                                            />
                                        ) : <>{item.sales.toLocaleString()}{teamScopeTab === 1 && (() => { const old = (data.teamAnalysis || [])[index]; const d = old && old.sales ? parseFloat(((item.sales - old.sales) / old.sales * 100).toFixed(1)) : 0; return <span className={`text-xs font-bold ml-1.5 ${d >= 0 ? 'text-red-500' : 'text-green-500'}`}>{d >= 0 ? '+' : ''}{d}%</span>; })()}</>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isEditingTeamAnalysis ? (
                                            <input
                                                type="number"
                                                value={item.contribution}
                                                onChange={(e) => updateTeamData(index, 'contribution', e.target.value)}
                                                className="w-16 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-end">
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full mr-2 overflow-hidden">
                                                    <div className={`h-full rounded-full ${item.status === 'active' ? 'bg-indigo-500' : 'bg-slate-400'}`} style={{width: `${item.contribution}%`}}></div>
                                                </div>
                                                <span className="text-xs text-slate-500">{item.contribution}%</span>
                                            </div>
                                        )}{teamScopeTab === 1 && (() => { const old = (data.teamAnalysis || [])[index]; const d = old && old.contribution ? parseFloat(((item.contribution - old.contribution) / old.contribution * 100).toFixed(1)) : 0; return <span className={`text-xs font-bold ml-1.5 ${d >= 0 ? 'text-red-500' : 'text-green-500'}`}>{d >= 0 ? '+' : ''}{d}%</span>; })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </div>


        {/* Row 4: Issues (Critical Issues) with CRUD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center">
                    <ShoppingBag size={18} className="mr-2 text-rose-500" />
                    待解决问题 (Critical Issues)
                </h3>
                <button 
                  onClick={() => setIsAddingIssue(true)}
                  className="text-xs flex items-center font-bold px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors"
                  style={{ display: readOnly ? 'none' : 'flex' }}
                >
                    <Plus size={14} className="mr-1" />
                    添加问题
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAddingIssue && (
                  <div className="flex flex-col bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm animate-fade-in col-span-1 md:col-span-2">
                      <div className="mb-3">
                          <input 
                              type="text" 
                              value={newIssueTitle}
                              onChange={(e) => setNewIssueTitle(e.target.value)}
                              placeholder="输入问题标题..."
                              className="w-full text-sm font-bold bg-white border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                          />
                      </div>
                      <div className="mb-3">
                          <textarea 
                              value={newIssueDesc}
                              onChange={(e) => setNewIssueDesc(e.target.value)}
                              placeholder="详细描述问题及其影响..."
                              className="w-full text-sm bg-white border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none h-20 resize-none"
                          />
                      </div>
                      <div className="flex justify-end gap-2">
                          <button onClick={() => setIsAddingIssue(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">取消</button>
                          <button onClick={addIssue} className="text-xs bg-rose-600 text-white font-bold px-4 py-1.5 rounded-lg hover:bg-rose-700 transition-colors flex items-center">
                              <Check size={14} className="mr-1" />
                              确认添加
                          </button>
                      </div>
                  </div>
                )}

                {data.issues.map((issue) => (
                  <div key={issue.id} className="relative flex flex-col items-start text-sm bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-rose-200 transition-all group">
                      {editingIssueId === issue.id ? (
                        <div className="w-full animate-fade-in">
                            <input 
                              type="text" 
                              value={issue.title}
                              onChange={(e) => updateIssue(issue.id, { title: e.target.value })}
                              className="w-full text-sm font-bold bg-white border border-slate-200 rounded px-2 py-1 mb-2 focus:ring-1 focus:ring-brand-500 outline-none"
                            />
                            <textarea 
                              value={issue.description}
                              onChange={(e) => updateIssue(issue.id, { description: e.target.value })}
                              className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 mb-2 h-20 resize-none focus:ring-1 focus:ring-brand-500 outline-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingIssueId(null)} className="text-[10px] text-slate-500 px-2 py-1">取消</button>
                                <button onClick={() => setEditingIssueId(null)} className="text-[10px] bg-brand-600 text-white px-2 py-1 rounded flex items-center">
                                    <Save size={10} className="mr-1" /> 保存
                                </button>
                            </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between w-full items-start mb-1">
                              <span className="font-bold text-slate-700 flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 mr-2 flex-shrink-0"></span>
                                  {issue.title}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!readOnly && (
                                  <button onClick={() => setEditingIssueId(issue.id)} className="p-1 text-slate-400 hover:text-brand-600 hover:bg-white rounded transition-colors"><Edit2 size={12}/></button>
                                )}
                                  {!readOnly && (
                                  <button onClick={() => deleteIssue(issue.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors"><Trash2 size={12}/></button>
                                  )}
                              </div>
                          </div>
                          <span className="text-slate-600 leading-relaxed text-xs">{issue.description}</span>
                        </>
                      )}
                  </div>
                ))}
                
                {data.issues.length === 0 && !isAddingIssue && (
                    <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                        暂无记录。请手动添加。
                    </div>
                )}
            </div>
        </div>

        {/* Row 5: Opportunities (Growth Opportunities) with CRUD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center">
                    <Lightbulb size={18} className="mr-2 text-amber-500" />
                    待挖掘机会 (Growth Opportunities)
                </h3>
                <button 
                  onClick={() => setIsAddingOpportunity(true)}
                  className="text-xs flex items-center font-bold px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors"
                  style={{ display: readOnly ? 'none' : 'flex' }}
                >
                    <Plus size={14} className="mr-1" />
                    添加机会
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isAddingOpportunity && (
                  <div className="flex flex-col bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm animate-fade-in col-span-1 md:col-span-2 lg:col-span-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div className="md:col-span-2">
                              <input 
                                  type="text" 
                                  value={newOpportunityTitle}
                                  onChange={(e) => setNewOpportunityTitle(e.target.value)}
                                  placeholder="输入机会标题..."
                                  className="w-full text-sm font-bold bg-white border border-amber-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                              />
                          </div>
                          <div>
                              <select 
                                  value={newOpportunityTag}
                                  onChange={(e) => setNewOpportunityTag(e.target.value)}
                                  className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                              >
                                  <option value="新渠道">新渠道</option>
                                  <option value="新产品">新产品</option>
                                  <option value="效率优化">效率优化</option>
                                  <option value="其他">其他</option>
                              </select>
                          </div>
                      </div>
                      <div className="mb-3">
                          <textarea 
                              value={newOpportunityDesc}
                              onChange={(e) => setNewOpportunityDesc(e.target.value)}
                              placeholder="详细描述机会点..."
                              className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none h-20 resize-none"
                          />
                      </div>
                      <div className="flex justify-end gap-2">
                          <button onClick={() => setIsAddingOpportunity(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">取消</button>
                          <button onClick={addOpportunity} className="text-xs bg-amber-600 text-white font-bold px-4 py-1.5 rounded-lg hover:bg-amber-700 transition-colors flex items-center">
                              <Check size={14} className="mr-1" />
                              确认添加
                          </button>
                      </div>
                  </div>
                )}

                {data.opportunities.map((opp) => (
                  <div key={opp.id} className="relative flex flex-col bg-slate-50/50 p-4 rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all group">
                      {editingOpportunityId === opp.id ? (
                        <div className="w-full animate-fade-in space-y-2">
                            <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={opp.title}
                                  onChange={(e) => updateOpportunity(opp.id, { title: e.target.value })}
                                  className="flex-grow text-sm font-bold bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-brand-500 outline-none"
                                />
                                <select 
                                  value={opp.tag}
                                  onChange={(e) => updateOpportunity(opp.id, { tag: e.target.value })}
                                  className="text-[10px] bg-white border border-slate-200 rounded px-1 outline-none"
                                >
                                    <option value="新渠道">新渠道</option>
                                    <option value="新产品">新产品</option>
                                    <option value="效率优化">效率优化</option>
                                </select>
                            </div>
                            <textarea 
                              value={opp.description}
                              onChange={(e) => updateOpportunity(opp.id, { description: e.target.value })}
                              className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 h-20 resize-none focus:ring-1 focus:ring-brand-500 outline-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingOpportunityId(null)} className="text-[10px] text-slate-500 px-2 py-1">取消</button>
                                <button onClick={() => setEditingOpportunityId(null)} className="text-[10px] bg-brand-600 text-white px-2 py-1 rounded flex items-center">
                                    <Save size={10} className="mr-1" /> 保存
                                </button>
                            </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${OpportunityTagColor(opp.tag)}`}>
                                  {opp.tag}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!readOnly && (
                                  <button onClick={() => setEditingOpportunityId(opp.id)} className="p-1 text-slate-400 hover:text-brand-600 hover:bg-white rounded transition-colors"><Edit2 size={12}/></button>
                                )}
                                  {!readOnly && (
                                  <button onClick={() => deleteOpportunity(opp.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors"><Trash2 size={12}/></button>
                                  )}
                              </div>
                          </div>
                          <h4 className="font-bold text-slate-800 mb-1">{opp.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{opp.description}</p>
                        </>
                      )}
                  </div>
                ))}
                
                {data.opportunities.length === 0 && !isAddingOpportunity && (
                    <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                        暂无记录。请手动添加。
                    </div>
                )}
            </div>
        </div>

      </div>

      {!readOnly && (
      <div className="flex justify-between pt-6 border-t border-slate-100">
        <button onClick={onBack} className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">上一步</button>
        <button
          onClick={handleNextClick}
          className={`px-8 py-2.5 text-white rounded-xl font-medium shadow-lg transition-colors ${
            checkIssuesAndOpportunitiesFilled()
              ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-200'
              : 'bg-slate-400 hover:bg-slate-500 shadow-slate-200'
          }`}
        >
          下一步：设定目标
        </button>
      </div>
      )}

      {/* PROFIT DETAIL MODAL */}
      {showProfitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center">
                          <Calculator size={18} className="mr-2 text-amber-500"/> 经营利润详情
                      </h3>
                      <button onClick={() => setShowProfitModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Income Section */}
                      <div className="border rounded-lg border-slate-200 overflow-hidden">
                          <div 
                              className="bg-slate-50 p-3 flex items-center justify-between cursor-pointer select-none"
                              onClick={() => setExpandedSections({...expandedSections, income: !expandedSections.income})}
                          >
                              <div className="flex items-center text-sm font-bold text-slate-700">
                                  {expandedSections.income ? <Minus size={14} className="mr-2 text-slate-400"/> : <Plus size={14} className="mr-2 text-slate-400"/>}
                                  收入合计
                              </div>
                              <span className="font-mono font-bold text-slate-800">{calculatedProfit.incomeTotal}</span>
                          </div>
                          {expandedSections.income && (
                              <div className="p-3 bg-white space-y-3 border-t border-slate-100">
                                  <div className="flex items-center justify-between pl-6 text-sm">
                                      <span className="text-slate-500 flex items-center"><Plus size={12} className="mr-1 text-slate-300"/> 卖货收入</span>
                                      <input
                                          disabled={readOnly}
                                          type="text" inputMode="decimal"
                                          value={profitBreakdown.sellOutIncome}
                                          onChange={(e) => setProfitBreakdown({...profitBreakdown, sellOutIncome: filterDecimal(e.target.value)})}
                                          className="w-20 text-right bg-slate-50 border-b border-slate-200 focus:border-brand-500 outline-none"
                                      />
                                  </div>
                                  <div className="flex items-center justify-between pl-6 text-sm">
                                      <span className="text-slate-500 flex items-center"><Plus size={12} className="mr-1 text-slate-300"/> 其他收入</span>
                                      <input
                                          disabled={readOnly}
                                          type="text" inputMode="decimal"
                                          value={profitBreakdown.otherIncome}
                                          onChange={(e) => setProfitBreakdown({...profitBreakdown, otherIncome: filterDecimal(e.target.value)})}
                                          className="w-20 text-right bg-slate-50 border-b border-slate-200 focus:border-brand-500 outline-none"
                                      />
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Expense Section */}
                      <div className="border rounded-lg border-slate-200 overflow-hidden">
                          <div 
                              className="bg-slate-50 p-3 flex items-center justify-between cursor-pointer select-none"
                              onClick={() => setExpandedSections({...expandedSections, expense: !expandedSections.expense})}
                          >
                              <div className="flex items-center text-sm font-bold text-slate-700">
                                  {expandedSections.expense ? <Minus size={14} className="mr-2 text-slate-400"/> : <Plus size={14} className="mr-2 text-slate-400"/>}
                                  支出合计
                              </div>
                              <span className="font-mono font-bold text-slate-800">{calculatedProfit.expenseTotal}</span>
                          </div>
                          {expandedSections.expense && (
                              <div className="p-3 bg-white space-y-3 border-t border-slate-100">
                                  <div className="flex items-center justify-between pl-6 text-sm">
                                      <span className="text-slate-500 flex items-center"><Plus size={12} className="mr-1 text-slate-300"/> 进货成本</span>
                                      <input
                                          disabled={readOnly}
                                          type="text" inputMode="decimal"
                                          value={profitBreakdown.cogs}
                                          onChange={(e) => setProfitBreakdown({...profitBreakdown, cogs: filterDecimal(e.target.value)})}
                                          className="w-20 text-right bg-slate-50 border-b border-slate-200 focus:border-brand-500 outline-none"
                                      />
                                  </div>
                                  
                                  {/* Nested Operating Expenses */}
                                  <div className="pl-6 pt-2">
                                      <div 
                                          className="flex items-center justify-between text-sm cursor-pointer select-none mb-2"
                                          onClick={() => setExpandedSections({...expandedSections, operating: !expandedSections.operating})}
                                      >
                                          <span className="text-slate-600 font-medium flex items-center">
                                              {expandedSections.operating ? <Minus size={10} className="mr-1.5"/> : <Plus size={10} className="mr-1.5"/>}
                                              运营费用
                                          </span>
                                          <span className="text-slate-600">{calculatedProfit.opExpenses}</span>
                                      </div>
                                      
                                      {expandedSections.operating && (
                                          <div className="space-y-2 pl-4 border-l-2 border-slate-100 ml-1">
                                              {[
                                                  { k: 'commission', l: '业代提成' },
                                                  { k: 'personnel', l: '人员费用' },
                                                  { k: 'office', l: '办公费用' },
                                                  { k: 'vehicle', l: '车辆费用' },
                                                  { k: 'warehouse', l: '仓储装配费用' },
                                                  { k: 'marketing', l: '营销费用' },
                                                  { k: 'special', l: '特殊运营费用' },
                                              ].map((item) => (
                                                  <div key={item.k} className="flex items-center justify-between text-xs">
                                                      <span className="text-slate-400">{item.l}</span>
                                                      <input
                                                          disabled={readOnly}
                                                          type="text" inputMode="decimal"
                                                          value={profitBreakdown.expenses[item.k as keyof typeof profitBreakdown.expenses]}
                                                          onChange={(e) => setProfitBreakdown({
                                                              ...profitBreakdown,
                                                              expenses: { ...profitBreakdown.expenses, [item.k]: filterDecimal(e.target.value) }
                                                          })}
                                                          className="w-16 text-right text-xs bg-slate-50 border-b border-slate-200 focus:border-brand-500 outline-none"
                                                      />
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Summary Section */}
                      <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-dashed border-slate-200">
                              <span className="text-sm font-medium text-slate-600">卖货毛利</span>
                              <span className="text-sm font-bold text-slate-800">{calculatedProfit.grossProfit}</span>
                          </div>
                          <div className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg">
                              <span className="text-sm font-bold text-amber-700">经营利润</span>
                              <span className="text-lg font-bold text-amber-600">¥ {calculatedProfit.netProfit} <span className="text-xs font-normal text-amber-500">万</span></span>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      {!readOnly && <button 
                          onClick={saveProfitData}
                          className="px-6 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-brand-700 transition-colors"
                      >
                          确认并更新
                      </button>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default BusinessReviewStep;