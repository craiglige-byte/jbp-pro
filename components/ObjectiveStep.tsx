import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as turf from '@turf/turf';
import { JBPData, JBPObjective, CHINA_PROVINCES } from '../types';
import { OBJECTIVE_TEMPLATES } from '../constants';
import { Plus, Trash2, Target, BarChart3, TrendingUp, Users, ShieldCheck, AlertCircle, MapPin, Check, X, ChevronDown, Map as MapIcon, RefreshCw, Layers, Merge, Scissors, Trash, Split, Edit3 } from 'lucide-react';

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

interface ObjectiveStepProps {
  data: JBPData;
  updateData: (updates: Partial<JBPData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ObjectiveStep: React.FC<ObjectiveStepProps> = ({ data, updateData, onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'growth' | 'efficiency' | 'relationship' | 'branding'>('all');
  const [validationError, setValidationError] = useState<string | null>(null);
  // 授权地图模块状态
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [regionSearchText, setRegionSearchText] = useState('');
  
  // 地图相关引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const districtPolygonsRef = useRef<any[]>([]);
  const districtSearchRef = useRef<any>(null);
  
  // Turf.js 多边形编辑状态
  const [selectedPolygons, setSelectedPolygons] = useState<number[]>([]);
  const polygonsRef = useRef<{ polygon: any; turfFeature: any; id: number }[]>([]);
  const polygonIdCounter = useRef(0);

  // ========== 编辑模式状态 ==========
  const [editMode, setEditMode] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const splitLinePointsRef = useRef<number[][]>([]);
  const splitMarkersRef = useRef<any[]>([]);
  const [displayPointCount, setDisplayPointCount] = useState(0);

  // ✅ 删除确认弹窗状态（避开原生 confirm 高德地图兼容 bug）
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const pendingDeleteRef = useRef<number[]>([]);

  // ✅ 通用消息弹窗 - 统一样式
  const [messagePopup, setMessagePopup] = useState<{
    show: boolean;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);



  // 显示消息弹窗工具函数
  const showMessage = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string = '') => {
    setMessagePopup({ show: true, type, title, message });
  };

  // 关闭消息弹窗
  const closeMessage = () => {
    setMessagePopup(null);
  };
  const splitLineRef = useRef<any>(null);
  const splitMouseListenerRef = useRef<any>(null);
  const dblclickHandlerRef = useRef<any>(null);

  // 转换高德多边形为 Turf Feature（确保多边形闭合: 第一个点 = 最后一个点）
  const convertAMapToTurf = (amapPath: any[]): any => {
    let coordinates = amapPath.map((lnglat: any) => [lnglat.lng || lnglat[0], lnglat.lat || lnglat[1]]);
    
    // GeoJSON 强制要求：多边形第一个点和最后一个点必须相同
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates = [...coordinates, [...first]];
    }
    
    return turf.polygon([coordinates]);
  };

  // 转换 Turf Feature 为高德多边形路径
  const convertTurfToAMap = (feature: any): number[][] => {
    const coords = feature.geometry.coordinates[0];
    return coords.map(([lng, lat]: number[]) => [lng, lat]);
  };

  // 高亮选中多边形
  const highlightPolygon = (polygon: any, isSelected: boolean) => {
    if (isSelected) {
      polygon.setOptions({
        strokeColor: '#2563eb',
        strokeWeight: 5,
        fillColor: '#3b82f6',
        fillOpacity: 0.45,
      });
    } else {
      polygon.setOptions({
        strokeColor: '#0ea5e9',
        strokeWeight: 3,
        strokeOpacity: 0.9,
        fillColor: '#06b6d4',
        fillOpacity: 0.25,
      });
    }
  };

  // 切换多边形选中状态
  const togglePolygonSelection = (id: number) => {
    // ========== 终极保险：切割中绝对禁止切换 ==========
    // 只看 ref，避免闭包问题！只要 handler 存在，就是还在切割
    if (splitMouseListenerRef.current) {
      return;
    }

    setSelectedPolygons(prev => {
      const newSelected = prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id];
      
      // 更新视觉样式
      polygonsRef.current.forEach(({ polygon, id: polyId }) => {
        highlightPolygon(polygon, newSelected.includes(polyId));
      });
      
      return newSelected;
    });
  };

  // 合并选中多边形
  const mergeSelectedPolygons = () => {
    if (selectedPolygons.length < 2) {
      showMessage('warning', '请至少选择 2 个多边形进行合并');
      return;
    }

    const selectedData = polygonsRef.current
      .filter(p => selectedPolygons.includes(p.id));
    
    const selectedFeatures = selectedData.map(p => p.turfFeature);

    try {
      // ========== 关键修复1：先缓冲再合并 ==========
      // 切割产生的多边形之间有1米缝隙，先各自扩大3米确保能连接
      const buffered = selectedFeatures.map(f => turf.buffer(f, 3, { units: 'meters' }));
      
      // 再合并扩大后的多边形
      const unioned = turf.union(turf.featureCollection(buffered));

      if (!unioned) {
        throw new Error('多边形无法合并');
      }

      // ========== 关键修复2：原子操作 - 先创建新的，成功了再删旧的 ==========
      // 1. 先创建新的合并多边形
      const newPath = convertTurfToAMap(unioned);
      const newPolygon = new AMap.Polygon({
        path: newPath,
        strokeColor: '#0ea5e9',
        strokeWeight: 3,
        strokeOpacity: 0.9,
        fillColor: '#06b6d4',
        fillOpacity: 0.25,
        cursor: 'pointer',
      });
      newPolygon.setMap(mapInstanceRef.current);

      // 2. 确认新多边形创建成功，才清除所有旧多边形
      selectedData.forEach(({ polygon }) => polygon.setMap(null));

      // 合并完成，直接绑定纯选中事件，避免任何闭包问题
      const newId = polygonIdCounter.current++;
      newPolygon.on('click', () => togglePolygonSelection(newId));

      // 更新多边形列表
      polygonsRef.current = [
        ...polygonsRef.current.filter(p => !selectedPolygons.includes(p.id)),
        { polygon: newPolygon, turfFeature: unioned, id: newId }
      ];

      setSelectedPolygons([]);
      setTimeout(() => showMessage('success', '合并成功', `${selectedPolygons.length} 块区域 → 1 块区域`), 100);
    } catch (e) {
      console.error('合并失败:', e);
      setTimeout(() => showMessage('error', '合并失败', '请确保多边形相邻或有重叠'), 100);
    }
  };

  // ✅ 真正执行删除
  const confirmDelete = () => {
    const toDeleteIds = pendingDeleteRef.current;

    // 从地图移除
    polygonsRef.current
      .filter(p => toDeleteIds.includes(p.id))
      .forEach(({ polygon }) => polygon.setMap(null));

    // 更新列表
    polygonsRef.current = polygonsRef.current.filter(p => !toDeleteIds.includes(p.id));
    setSelectedPolygons([]);
    setShowDeleteConfirm(false);
    pendingDeleteRef.current = [];
    
    setTimeout(() => showMessage('success', '删除成功', `已删除 ${toDeleteIds.length} 个区域`), 100);
  };

  // ✅ 取消删除
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    pendingDeleteRef.current = [];
  };

  // 删除选中多边形 - 只打开弹窗，不做任何地图操作
  const deleteSelectedPolygons = () => {
    if (selectedPolygons.length === 0) {
      showMessage('warning', '请先选择要删除的多边形');
      return;
    }

    // 只保存列表 + 显示 React 弹窗，完全不碰地图！
    pendingDeleteRef.current = [...selectedPolygons];
    setShowDeleteConfirm(true);
  };

  // ========== 线切割功能：选多边形 → 画线（单击加点，双击结束）→ 确认切割 ==========

  // 进入/退出切割模式
  const toggleSplitMode = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!splitMode) {
      // 进入切割模式前，必须先选中要切割的多边形
      if (selectedPolygons.length === 0) {
        showMessage('warning', '请先点击选择要切割的多边形！');
        return;
      }

      setSplitMode(true);
      splitLinePointsRef.current = [];
      splitMarkersRef.current = [];
      setDisplayPointCount(0);

      // 清除可能存在的旧分割线和标记点
      if (splitLineRef.current) {
        splitLineRef.current.setMap(null);
        splitLineRef.current = null;
      }
      splitMarkersRef.current.forEach(m => m.setMap(null));
      splitMarkersRef.current = [];

      // ========== 核心：统一的加点函数 ==========
      const addSplitPoint = (e: any) => {
        const newPoint = [e.lnglat.lng, e.lnglat.lat];
        splitLinePointsRef.current = [...splitLinePointsRef.current, newPoint];
        setDisplayPointCount(splitLinePointsRef.current.length);

        // 在点击位置创建可见的路径点标记
        const pointMarker = new AMap.CircleMarker({
          center: newPoint,
          radius: 6,
          strokeColor: '#f59e0b',
          strokeWeight: 2,
          fillColor: '#fff',
          fillOpacity: 1,
          zIndex: 150,
        });
        pointMarker.setMap(map);
        splitMarkersRef.current.push(pointMarker);

        // 更新/创建分割线
        if (splitLineRef.current) {
          splitLineRef.current.setPath(splitLinePointsRef.current);
        } else {
          splitLineRef.current = new AMap.Polyline({
            path: splitLinePointsRef.current,
            strokeColor: '#f59e0b',
            strokeWeight: 3,
            strokeOpacity: 1,
            lineJoin: 'round',
            zIndex: 100,
          });
          splitLineRef.current.setMap(map);
        }
      };

      // ========== 极简：只绑定地图空白处的点击 ==========
      // 多边形自己有智能点击事件，无需额外处理！
      splitMouseListenerRef.current = addSplitPoint;
      map.on('click', addSplitPoint);

      setIsDrawing(true);

      // 注册右键事件：结束绘制
      dblclickHandlerRef.current = (e: any) => {
        e.domEvent.preventDefault();
        if (splitLinePointsRef.current.length >= 2) {
          finishLineDrawing();
        }
      };
      map.on('rightclick', dblclickHandlerRef.current);
      
      // 改变鼠标样式
      map.getContainer().style.cursor = 'crosshair';
      setTimeout(() => showMessage('info', '开始绘制分割线', '• 左键单击：添加路径点\n• 右键单击：结束绘制\n• 或点击"结束画线"按钮'), 100);

    } else {
      // 退出切割模式
      exitSplitMode();
    }
  };

  // 结束画线（停止加点，但保留线）
  const finishLineDrawing = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 只移除地图点击事件
    if (splitMouseListenerRef.current) {
      map.off('click', splitMouseListenerRef.current);
      splitMouseListenerRef.current = null;
    }

    setIsDrawing(false);

    // 恢复鼠标样式
    map.getContainer().style.cursor = '';
  };

  // 退出切割模式
  const exitSplitMode = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setSplitMode(false);
    setIsDrawing(false);
    splitLinePointsRef.current = [];
    setDisplayPointCount(0);
    
    // 只移除地图点击事件，多边形事件内置判断无需处理
    if (splitMouseListenerRef.current) {
      map.off('click', splitMouseListenerRef.current);
      splitMouseListenerRef.current = null;
    }

    // 移除右键事件监听
    if (dblclickHandlerRef.current) {
      map.off('rightclick', dblclickHandlerRef.current);
      dblclickHandlerRef.current = null;
    }
    
    // 清除分割线
    if (splitLineRef.current) {
      splitLineRef.current.setMap(null);
      splitLineRef.current = null;
    }

    // 清除所有路径点标记
    splitMarkersRef.current.forEach(m => m.setMap(null));
    splitMarkersRef.current = [];
    
    // 恢复鼠标样式
    map.getContainer().style.cursor = '';
  };

  // ========== 核心算法：用极细缓冲区差值法实现线切割多边形 ==========
  const polygonSplitByLine = (polygon: any, line: any): any[] => {
    // 给分割线做缓冲区，像一把"刀"
    // 0.001 km = 1米，几乎看不见但确保切割成功
    const lineBuffer = turf.buffer(line, 0.001, { units: 'kilometers' });

    // 核心算法：多边形 减去 细线缓冲区 = 被切开！
    const differenceResult = turf.difference(
      turf.featureCollection([polygon, lineBuffer])
    );

    if (!differenceResult) return [];

    // 处理切割结果
    const pieces: any[] = [];
    
    if (differenceResult.geometry.type === 'Polygon') {
      // 只得到一个 Polygon = 没真正切开
      return [];
    } 
    else if (differenceResult.geometry.type === 'MultiPolygon') {
      // 切割成功！MultiPolygon 拆分为多个 Polygon
      differenceResult.geometry.coordinates.forEach((coords: any) => {
        pieces.push(turf.polygon(coords));
      });
    }

    return pieces;
  };

  // 执行线切割
  const executeLineSplit = () => {
    if (splitLinePointsRef.current.length < 2) {
      showMessage('warning', '分割线太短', '请至少单击 2 个点形成切割线');
      return;
    }

    if (selectedPolygons.length === 0) {
      showMessage('warning', '没有选中要切割的多边形！');
      exitSplitMode();
      return;
    }

    try {
      // 创建 Turf LineString 分割线
      const splitLine = turf.lineString(splitLinePointsRef.current);

      // 只对选中的多边形进行切割
      let totalNewPolygons = 0;
      const newPolygonsData: any[] = [];

      selectedPolygons.forEach(polyId => {
        const polyData = polygonsRef.current.find(p => p.id === polyId);
        if (!polyData) return;

        try {
          // ========== 使用正确的线切割算法 ==========
          const slicedPolygons = polygonSplitByLine(polyData.turfFeature, splitLine);

          if (slicedPolygons.length > 1) {
            // 切割成功：移除旧多边形
            polyData.polygon.setMap(null);

            // 创建切割后的新多边形（切割马上结束，直接绑定选中事件）
            slicedPolygons.forEach((feature: any) => {
              const newPath = convertTurfToAMap(feature);
              const newPolygon = new AMap.Polygon({
                path: newPath,
                strokeColor: '#0ea5e9',
                strokeWeight: 3,
                strokeOpacity: 0.9,
                fillColor: '#06b6d4',
                fillOpacity: 0.25,
                cursor: 'pointer',
                zIndex: 50,
              });
              newPolygon.setMap(mapInstanceRef.current);

              const newId = polygonIdCounter.current++;
              // 切割完成，直接绑定纯选中事件，避免任何闭包问题
              newPolygon.on('click', () => togglePolygonSelection(newId));
              
              newPolygonsData.push({ polygon: newPolygon, turfFeature: feature, id: newId });
              totalNewPolygons++;
            });

            // 标记需要删除的旧多边形
            polyData.polygon._toBeRemoved = true;
          }
        } catch (e: any) {
          console.log('多边形切割跳过:', e);
          setTimeout(() => showMessage('error', '切割失败', e.message), 100);
        }
      });

      // 移除被切割的旧多边形
      polygonsRef.current = polygonsRef.current.filter(p => !p.polygon._toBeRemoved);
      // 添加切割产生的新多边形
      polygonsRef.current = [...polygonsRef.current, ...newPolygonsData];

      if (totalNewPolygons > 0) {
        setTimeout(() => showMessage('success', '切割成功', `生成 ${totalNewPolygons} 个新区域\n💡 点击新区域可以继续操作！`), 100);
      } else {
        setTimeout(() => showMessage('warning', '无法切割', '💡 正确切割画法：\n1. 分割线要完全横穿多边形\n2. 线的起点和终点都在多边形外面\n3. 至少点击2个点形成一条直线\n\n❌ 错误：不要让线的两端落在多边形内部'), 100);
      }

      exitSplitMode();
      setSelectedPolygons([]);

    } catch (e) {
      console.error('切割失败:', e);
      setTimeout(() => showMessage('error', '切割失败', (e as Error).message), 100);
      exitSplitMode();
    }
  };

  // 过滤后的省份列表
  const filteredRegions = useMemo(() => {
    if (!regionSearchText.trim()) return CHINA_PROVINCES;
    const searchLower = regionSearchText.toLowerCase();
    return CHINA_PROVINCES.filter(r => 
      r.name.toLowerCase().includes(searchLower)
    );
  }, [regionSearchText]);

  // 切换区域选择
  const toggleRegion = (code: string) => {
    const newRegions = data.authorizedRegions.includes(code)
      ? data.authorizedRegions.filter(c => c !== code)
      : [...data.authorizedRegions, code];
    updateData({ authorizedRegions: newRegions });
  };

  // 全选/取消全选
  const toggleAllRegions = () => {
    if (data.authorizedRegions.length === CHINA_PROVINCES.length) {
      updateData({ authorizedRegions: [] });
    } else {
      updateData({ authorizedRegions: CHINA_PROVINCES.map(r => r.code) });
    }
  };

  // 获取选中的区域名称
  const getSelectedRegionNames = () => {
    return data.authorizedRegions
      .map(code => CHINA_PROVINCES.find(r => r.code === code)?.name)
      .filter(Boolean) as string[];
  };

  // 高德地图安全密钥 - 必须在SDK加载前全局设置
  const AMAP_KEY = "09706e6d3502770b99148345f3b1dc47";
  const AMAP_SECURITY_CODE = "5dcb0e9a91f058b3e3d40d73200d5f89";
  
  if (typeof window !== 'undefined') {
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_CODE
    };
  }

  // 高德地图初始化及省份边界渲染
  useEffect(() => {
    let isMounted = true;
    
    const initMap = () => {
      // 如果地图已创建则不再重复初始化
      if (mapInstanceRef.current) return;
      
      // 如果容器还不存在，延后执行
      if (!mapContainerRef.current) {
        setTimeout(initMap, 100);
        return;
      }
      
      try {
        // 从 ditu.md 加载 WKT 范围数据作为可编辑多边形
        const renderEditablePolygons = async (map: any) => {
          let polygonList: any[] = [];

          // ✅ 优先：从 data 中加载用户已保存的多边形数据
          if (data.authorizationPolygons && data.authorizationPolygons.length > 0) {
            // 兼容两种数据格式：直接路径数组 或 GeoJSON 格式
            polygonList = data.authorizationPolygons.map(p => {
              // GeoJSON 格式：{ coordinates: [[[lng, lat]]] }
              if (p.coordinates) {
                return p.coordinates[0];
              }
              // 直接路径数组格式：[[lng, lat], ...]
              return p;
            });
          } 
          // ✅ 其次：动态加载 ditu.md 默认范围（永远读最新）
          else {
            try {
              const res = await fetch(`/ditu.md?t=${Date.now()}`);
              const wktText = await res.text();
              
              const match = wktText.match(/POLYGON \(\((.*)\)\)/i);
              if (match) {
                const coordsText = match[1];
                const path = coordsText.split(',').map((point: string) => {
                  const [lng, lat] = point.trim().split(' ').map(Number);
                  return [lng, lat];
                });
                polygonList = [path];
              }
            } catch (e) {
              console.warn('加载 ditu.md 失败');
            }
          }

          // 渲染所有多边形
          const colors = [
            { stroke: '#f59e0b', fill: '#f59e0b' },  // 橙色 - ditu1
            { stroke: '#ef4444', fill: '#ef4444' }   // 红色 - ditu2
          ];
          
          // 手动计算所有点的总边界（彻底避免 getBounds 错误）
          let minLng = Infinity, maxLng = -Infinity;
          let minLat = Infinity, maxLat = -Infinity;
          
          polygonList.forEach((path, index) => {
            const color = colors[index % colors.length];
            const polygon = new AMap.Polygon({
              path: path,
              strokeColor: color.stroke,
              strokeWeight: 3,
              strokeOpacity: 1,
              fillColor: color.fill,
              fillOpacity: 0.15,
              cursor: 'pointer',
            });
            polygon.setMap(map);

            const polyId = polygonIdCounter.current++;
            const turfFeature = convertAMapToTurf(path);
            
            // 累加计算边界
            path.forEach(([lng, lat]: [number, number]) => {
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
            });
            
            // 统一直接绑定，由 togglePolygonSelection 入口统一判断
            polygon.on('click', () => togglePolygonSelection(polyId));
            // 额外绑定：切割模式下优先加点
            polygon.on('click', (e: any) => {
              if (splitMouseListenerRef.current) {
                splitMouseListenerRef.current(e);
              }
            });
            
            polygonsRef.current.push({ polygon, turfFeature, id: polyId });
          });

          // ✅ 手动计算并设置地图视野（不调用 setFitView）
          if (minLng !== Infinity) {
            const centerLng = (minLng + maxLng) / 2;
            const centerLat = (minLat + maxLat) / 2;
            const maxSpan = Math.max(maxLng - minLng, maxLat - minLat);
            
            let zoom = 11;
            if (maxSpan > 2) zoom = 6;
            else if (maxSpan > 0.5) zoom = 9;
            else if (maxSpan > 0.1) zoom = 10;
            
            map.setCenter([centerLng, centerLat]);
            map.setZoom(zoom);
          }

          // ✅ 在多边形区域中心（质心）添加经销商名称水印
          if (data.distributorName && polygonsRef.current.length > 0) {
            // 计算所有多边形的合并质心
            const features = polygonsRef.current.map(p => p.turfFeature);
            const fc = turf.featureCollection(features);
            const centroid = turf.centroid(fc);
            const polyCenter = [centroid.geometry.coordinates[0], centroid.geometry.coordinates[1]];
            
            // 创建立体文字标签
            const distributorText = new AMap.Text({
              text: data.distributorName,
              anchor: 'center',
              style: {
                'font-size': '24px',
                'font-weight': '600',
                'color': 'rgba(15, 23, 42, 0.18)',
                'border': 'none',
                'background': 'transparent',
                'transform': 'scale(1.5)',
                'pointer-events': 'none',
                'user-select': 'none',
                'letter-spacing': '2px'
              },
              zIndex: 1,
              position: polyCenter
            });
            distributorText.setMap(map);
          }
        };

        // 如果高德地图已经加载
        if (window.AMap) {
          const map = new AMap.Map(mapContainerRef.current, {
            center: [118.5, 40.8],
            zoom: 5,
            viewMode: '2D',
            showIndoorMap: false,
          });
          mapInstanceRef.current = map;
          
          // 渲染可编辑多边形（动态加载 ditu.md）
          (async () => {
            await renderEditablePolygons(map);
          })();
          
          // 加载 DistrictSearch 插件
          AMap.plugin('AMap.DistrictSearch', () => {
            if (!isMounted) return;
            districtSearchRef.current = new AMap.DistrictSearch({
              level: 'province',
              subdistrict: 0,
              extensions: 'all',
            });
          });
          return;
        }
        
        // 动态加载高德地图 JS SDK
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.DistrictSearch`;
        script.onload = () => {
          if (!isMounted || !mapContainerRef.current) return;
          
          const map = new AMap.Map(mapContainerRef.current, {
            center: [118.5, 40.8],
            zoom: 5,
            viewMode: '2D',
            showIndoorMap: false,
          });
          mapInstanceRef.current = map;
          
          // 渲染可编辑多边形（动态加载 ditu.md）
          (async () => {
            await renderEditablePolygons(map);
          })();
          
          // 加载 DistrictSearch 插件
          AMap.plugin('AMap.DistrictSearch', () => {
            if (!isMounted) return;
            districtSearchRef.current = new AMap.DistrictSearch({
              level: 'province',
              subdistrict: 0,
              extensions: 'all',
            });
          });
        };
        script.onerror = () => {
          console.error('高德地图加载失败');
        };
        document.head.appendChild(script);
      } catch (error: any) {
        console.error('地图初始化失败:', error);
      }
    };
    
    // 延迟执行，确保 DOM 已渲染
    const timer = setTimeout(initMap, 100);
    return () => { 
      isMounted = false; 
      clearTimeout(timer);
    };
  }, []);

  // Generate months based on period (shared logic)
  const months = useMemo(() => {
    const period = data.period;
    let startMonth = 1;
    let year = 2024;
    let count = 3;

    if (period.includes('2024')) year = 2024;
    if (period.includes('2025')) year = 2025;
    if (period.includes('2026')) year = 2026;
    if (period.includes('2027')) year = 2027;

    if (period.includes('Q3')) { startMonth = 7; count = 3; }
    else if (period.includes('Q4')) { startMonth = 10; count = 3; }
    else if (period.includes('Q1')) { startMonth = 1; count = 3; }
    else if (period.includes('FY')) { 
      startMonth = 12; 
      count = 12;
      year--; // FY starts from Dec of previous year
    }

    const ms = [];
    for (let i = 0; i < count; i++) {
      let m = startMonth + i;
      let y = year;
      if (m > 12) { m -= 12; y++; }
      ms.push({
        id: `${y}-${String(m).padStart(2, '0')}`,
        label: `${y}年${m}月`,
        shortLabel: `${m}月`
      });
    }
    return ms;
  }, [data.period]);

  const addObjective = (templateId: string) => {
    const template = OBJECTIVE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    // Mock Last Year Data (Randomized slightly for realism)
    const mockLastYearTargets: Record<string, number> = {};
    months.forEach(m => {
        // Base random value between 50 and 150
        const base = Math.floor(Math.random() * 100) + 50;
        mockLastYearTargets[m.id] = base;
    });

    const newObj: JBPObjective = {
      id: `obj_${Date.now()}`,
      title: template.label,
      metric: "KPI",
      targetValue: "",
      monthlyTargets: {},
      lastYearMonthlyTargets: mockLastYearTargets,
      breakdownItems: [], // Initialize empty
      channelBreakdownItems: [], // Initialize empty
      personnelBreakdownItems: [], // Initialize empty
      keyResults: [], // Initialize empty
      strategies: [] 
    };

    updateData({ objectives: [...data.objectives, newObj] });
  };

  const removeObjective = (id: string) => {
    updateData({ objectives: data.objectives.filter(o => o.id !== id) });
  };

  const updateObjectiveTarget = (id: string, val: string) => {
    updateData({
      objectives: data.objectives.map(o => o.id === id ? { ...o, targetValue: val } : o)
    });
  };

  // 验证授权地图和目标是否都完成
  const validateObjectives = (): boolean => {
    const objectiveNames = ['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'];
    
    for (let i = 0; i < objectiveNames.length; i++) {
      const objective = data.objectives.find(o => o.title === objectiveNames[i]);
      
      // 检查目标是否存在或targetValue为空
      if (!objective || !objective.targetValue || objective.targetValue.trim() === '') {
        setValidationError(`请填写"${objectiveNames[i]}"`);
        setTimeout(() => setValidationError(null), 5000);
        return false;
      }
      
      // 针对特定目标进行额外验证
      if (objectiveNames[i] === '守住库存健康') {
        // 检查是否包含有效的数字
        const match = objective.targetValue.match(/≤\s*(\d+)\s*天/);
        if (!match || !match[1]) {
          setValidationError(`请填写"${objectiveNames[i]}"的天数`);
          setTimeout(() => setValidationError(null), 5000);
          return false;
        }
      }
      
      if (objectiveNames[i] === '提升盈利能力') {
        // 检查是否包含有效的百分比数字
        const match = objective.targetValue.match(/提升至\s*(.*?)\s*%/);
        if (!match || !match[1] || match[1].trim() === '') {
          setValidationError(`请填写"${objectiveNames[i]}"的百分比`);
          setTimeout(() => setValidationError(null), 5000);
          return false;
        }
      }
      
      if (objectiveNames[i] === '实现销售目标') {
        // 检查是否包含有效的箱数
        const match = objective.targetValue.match(/销售目标\s*([\d,]+)\s*箱/);
        if (!match || !match[1] || match[1] === '0') {
          setValidationError(`请填写"${objectiveNames[i]}"的箱数`);
          setTimeout(() => setValidationError(null), 5000);
          return false;
        }
      }
    }
    
    setValidationError(null);
    return true;
  };

  // 检查四个目标是否都已填写（用于按钮样式）
  const checkAllObjectivesFilled = (): boolean => {
    const objectiveNames = ['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'];
    
    for (let i = 0; i < objectiveNames.length; i++) {
      const objective = data.objectives.find(o => o.title === objectiveNames[i]);
      
      // 检查目标是否存在或targetValue为空
      if (!objective || !objective.targetValue || objective.targetValue.trim() === '') {
        return false;
      }
      
      // 针对特定目标进行额外验证
      if (objectiveNames[i] === '守住库存健康') {
        const match = objective.targetValue.match(/≤\s*(\d+)\s*天/);
        if (!match || !match[1]) {
          return false;
        }
      }
      
      if (objectiveNames[i] === '提升盈利能力') {
        const match = objective.targetValue.match(/提升至\s*(.*?)\s*%/);
        if (!match || !match[1] || match[1].trim() === '') {
          return false;
        }
      }
      
      if (objectiveNames[i] === '实现销售目标') {
        const match = objective.targetValue.match(/销售目标\s*([\d,]+)\s*箱/);
        if (!match || !match[1] || match[1] === '0') {
          return false;
        }
      }
    }
    
    return true;
  };

  // 处理下一步点击
  const handleNextClick = () => {
    if (!data.authorizationConfirmed) {
      showMessage('error', '请先确认授权地图范围', '请确认下一财年您的授权覆盖区域后再继续。');
      return;
    }
    if (validateObjectives()) {
      onNext();
    }
  };



  const digitToChinese = (n: number): string => {
      if (isNaN(n)) return '';
      const fraction = ['角', '分'];
      const digit = [
          '零', '壹', '贰', '叁', '肆',
          '伍', '陆', '柒', '捌', '玖'
      ];
      const unit = [
          ['元', '万', '亿'],
          ['', '拾', '佰', '仟']
      ];
      const head = n < 0 ? '欠' : '';
      n = Math.abs(n);
      let s = '';
      for (let i = 0; i < unit[0].length && n > 0; i++) {
          let p = '';
          for (let j = 0; j < unit[1].length && n > 0; j++) {
              p = digit[n % 10] + unit[1][j] + p;
              n = Math.floor(n / 10);
          }
          s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
      }
      return head + s.replace(/(零.)*零元/, '元')
          .replace(/(零.)+/g, '零')
          .replace(/^整$/, '零元整') + '整';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative">
      {/* 顶部居中的验证错误提示 */}
      {validationError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-amber-500 text-white rounded-xl shadow-lg flex items-center animate-fade-in">
              <AlertCircle size={20} className="mr-2" />
              <span className="font-medium">{validationError}</span>
          </div>
      )}
      
      <div className="space-y-8">
        {/* Top: Menu / Templates - REMOVED as per requirement for mandatory default objectives */}
        {/* 
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
               <h3 className="text-xl font-bold text-slate-800">设定目标 (Goals)</h3>
               <p className="text-xs text-slate-500">GSMT 第一步：确立总体方向</p>
            </div>
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2 hide-scrollbar">
            {['all', 'growth', 'efficiency', 'branding', 'relationship'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab as any)}
                 className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                   activeTab === tab ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                 }`}
               >
                 {tab === 'all' ? '全部' : tab === 'growth' ? '增长' : tab === 'efficiency' ? '效率' : tab === 'branding' ? '品牌' : '关系'}
               </button>
            ))}
           </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => addObjective(template.id)}
                className="flex flex-col text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-brand-400 hover:shadow-md transition-all group h-full"
              >
                <div className="flex items-center space-x-2 text-slate-800 font-semibold mb-2 group-hover:text-brand-600">
                  <span className={`p-1.5 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600`}>
                     {getIcon(template.category)}
                  </span>
                  <span>{template.label}</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{template.description}</p>
                <div className="mt-auto pt-3 flex items-center text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={14} className="mr-1" /> 添加此目标
                </div>
              </button>
            ))}
          </div>
        </div>
        */}

        {/* Bottom: Selected List */}
        <div className="flex flex-col">
           <h2 className="text-2xl font-bold text-slate-800 mb-1">设定目标</h2>
           <p className="text-slate-500 mb-4">确立总体方向，明确下一财年要达成的核心目标。</p>

           {/* 授权地图范围确认模块 */}
           {true && (
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
             <div className="flex items-start justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                   <MapIcon className="text-emerald-600" size={20} />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">授权地图范围确认</h3>
                   <p className="text-sm text-slate-500">请确认下一财年您的授权覆盖区域</p>
                   <p className="text-[11px] text-slate-400 mt-1">若需调整授权区域，请返回第一个节点基本信息去编辑。</p>
                 </div>
               </div>
               
               {/* ========== 右侧：确认范围按钮 / 状态 ========== */}
               {data.authorizationConfirmed ? (
                 <div className="flex items-center gap-2 text-emerald-600">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                   </svg>
                   <span className="font-medium">范围已确认</span>
                 </div>
               ) : (
                 <button
                   onClick={() => {
                     updateData({ authorizationConfirmed: true });
                     showMessage('success', '范围已确认', '授权范围确认成功！');
                   }}
                   className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-sky-200 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                 >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                   </svg>
                   确认范围
                 </button>
               )}
             </div>

             {/* 高德地图展示 */}
             <div className="relative h-[450px] rounded-xl overflow-hidden border border-slate-200">
               <div ref={mapContainerRef} className="w-full h-full z-0 outline-none"></div>

              {/* ========== 编辑模式 ========== */}
              {false && (
                <>
                  {/* ✅ React 自定义删除确认弹窗 - 100% 不影响地图！ */}
                   {showDeleteConfirm && (
                     <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                       <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
                         <div className="text-center mb-5">
                           <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                             <Trash className="text-red-500" size={28} />
                           </div>
                           <h3 className="text-xl font-bold text-slate-800 mb-2">确认删除</h3>
                           <p className="text-slate-500">
                             确定要删除选中的 <span className="font-bold text-red-500">{pendingDeleteRef.current.length}</span> 个区域吗？
                             <br />
                             <span className="text-sm">此操作不可撤销</span>
                           </p>
                         </div>
                         <div className="flex gap-3">
                           <button
                             onClick={cancelDelete}
                             className="flex-1 px-4 py-3 rounded-xl font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                           >
                             取消
                           </button>
                           <button
                             onClick={confirmDelete}
                             className="flex-1 px-4 py-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
                           >
                             确认删除
                           </button>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* ✅ 通用消息弹窗 - 所有消息统一样式 */}
                   {messagePopup?.show && (
                     <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                       <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
                         <div className="text-center mb-5">
                           {/* 根据类型显示不同图标和颜色 */}
                           {messagePopup.type === 'success' && (
                             <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                               <svg className="text-emerald-500 w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                               </svg>
                             </div>
                           )}
                           {messagePopup.type === 'warning' && (
                             <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                               <svg className="text-amber-500 w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                               </svg>
                             </div>
                           )}
                           {messagePopup.type === 'error' && (
                             <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                               <svg className="text-red-500 w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                               </svg>
                             </div>
                           )}
                           {messagePopup.type === 'info' && (
                             <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-sky-100 flex items-center justify-center">
                               <svg className="text-sky-500 w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                               </svg>
                             </div>
                           )}
                           <h3 className="text-xl font-bold text-slate-800 mb-2">{messagePopup.title}</h3>
                           {messagePopup.message && (
                             <p className="text-slate-500 whitespace-pre-line text-sm leading-relaxed">
                               {messagePopup.message}
                             </p>
                           )}
                         </div>
                         <button
                           onClick={closeMessage}
                           className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
                             messagePopup.type === 'success' ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30' :
                             messagePopup.type === 'warning' ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/30' :
                             messagePopup.type === 'error' ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30' :
                             'bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/30'
                           }`}
                         >
                           知道了
                         </button>
                       </div>
                     </div>
                   )}

                  {/* ========== 顶部左侧：合并&分割&删除工具栏 */}
                    <div className="absolute top-4 left-4 z-20 flex gap-2 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-xl border border-slate-200">
                      <button
                        onClick={mergeSelectedPolygons}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                          selectedPolygons.length >= 2
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        disabled={splitMode}
                      >
                        <Merge size={16} />
                        合并
                      </button>
                      <button
                        onClick={toggleSplitMode}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all relative ${
                          splitMode
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        }`}
                      >
                        <Scissors size={16} />
                        {splitMode ? '分割中' : '分割'}
                        {splitMode && displayPointCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                            {displayPointCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={deleteSelectedPolygons}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                          selectedPolygons.length > 0 && !splitMode
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        disabled={splitMode}
                      >
                        <Trash size={16} />
                        删除
                      </button>
                    </div>

                    {/* ========== 顶部右侧：分割操作面板 ========== */}
                    {splitMode && (
                      <div className="absolute top-4 right-4 z-30">
                        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 px-6 py-4">
                          <div className="text-sm font-bold text-slate-700 mb-3 text-center">
                            ✂️ 分割操作
                            {displayPointCount > 0 && (
                              <span className="ml-2 text-amber-600">已添加 {displayPointCount} 个点</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={exitSplitMode}
                              className="px-5 py-2 rounded-lg font-medium text-sm bg-slate-200 text-slate-600 hover:bg-slate-300"
                            >
                              取消
                            </button>
                            {isDrawing && splitLinePointsRef.current.length >= 2 && (
                              <button
                                onClick={finishLineDrawing}
                                className="px-5 py-2 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700"
                              >
                                ✓ 完成画线
                              </button>
                            )}
                            <button
                              onClick={executeLineSplit}
                              className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                                splitLinePointsRef.current.length >= 2 && !isDrawing
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <Split size={16} className="inline mr-1" />
                              执行分割
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                   {/* 底部：取消 / 重置 / 保存 */}
                   <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                     <button
                       onClick={() => {
                         exitSplitMode();
                         setEditMode(false);
                         setSelectedPolygons([]);
                         // ✅ 取消 = 没修改，确认状态保持不变
                       }}
                       className="px-6 py-2.5 rounded-xl font-medium text-slate-600 bg-white hover:bg-slate-50 shadow-lg border border-slate-200"
                     >
                       取消
                     </button>
                     <button
                       onClick={async () => {
                         // ✅ 重置：清除所有多边形，动态加载 ditu.md 最新范围
                         const map = mapInstanceRef.current;
                         if (!map) return;

                         // 1. 移除地图上所有现有多边形
                         polygonsRef.current.forEach(({ polygon }) => polygon.setMap(null));
                         polygonsRef.current = [];
                         polygonIdCounter.current = 0;
                         setSelectedPolygons([]);
                         exitSplitMode();

                         // 2. 动态加载 ditu.md 最新范围（加时间戳绕缓存）
                         try {
                           const res = await fetch(`/ditu.md?t=${Date.now()}`);
                           const wktText = await res.text();
                           
                           const match = wktText.match(/POLYGON \(\((.*)\)\)/i);
                           if (match) {
                             const coordsText = match[1];
                             const path = coordsText.split(',').map((point: string) => {
                               const [lng, lat] = point.trim().split(' ').map(Number);
                               return [lng, lat];
                             });

                             const polygon = new AMap.Polygon({
                               path: path,
                               strokeColor: '#0ea5e9',
                               strokeWeight: 3,
                               strokeOpacity: 0.9,
                               fillColor: '#06b6d4',
                               fillOpacity: 0.25,
                               cursor: 'pointer',
                             });
                             polygon.setMap(map);

                             const polyId = polygonIdCounter.current++;
                             const turfFeature = convertAMapToTurf(path);
                             polygon.on('click', () => togglePolygonSelection(polyId));
                             polygon.on('click', (e: any) => {
                               if (splitMouseListenerRef.current) splitMouseListenerRef.current(e);
                             });
                             
                             polygonsRef.current.push({ polygon, turfFeature, id: polyId });
                             
                             // 手动计算视野（彻底避免 getBounds 错误）
                             let minLng = Infinity, maxLng = -Infinity;
                             let minLat = Infinity, maxLat = -Infinity;
                             path.forEach(([lng, lat]: [number, number]) => {
                               minLng = Math.min(minLng, lng);
                               maxLng = Math.max(maxLng, lng);
                               minLat = Math.min(minLat, lat);
                               maxLat = Math.max(maxLat, lat);
                             });
                             map.setCenter([(minLng + maxLng) / 2, (minLat + maxLat) / 2]);
                             map.setZoom(11);

                             // ✅ 重置后重新放置质心水印
                              if (data.distributorName) {
                                const features = polygonsRef.current.map(p => p.turfFeature);
                                const fc = turf.featureCollection(features);
                                const centroid = turf.centroid(fc);
                                const polyCenter = [centroid.geometry.coordinates[0], centroid.geometry.coordinates[1]];
                                
                                map.getAllOverlays('text').forEach((o: any) => {
                                  if (o.AM && o.AM.name === 'Text') o.setMap(null);
                                });
                                
                                const distributorText = new AMap.Text({
                                  text: data.distributorName,
                                  anchor: 'center',
                                  style: {
                                    'font-size': '24px',
                                    'font-weight': '600',
                                    'color': 'rgba(15, 23, 42, 0.18)',
                                    'border': 'none',
                                    'background': 'transparent',
                                    'transform': 'scale(1.5)',
                                    'pointer-events': 'none',
                                    'user-select': 'none',
                                    'letter-spacing': '2px'
                                  },
                                  zIndex: 1,
                                  position: polyCenter
                                });
                                distributorText.setMap(map);
                              }
                            }
                          } catch (e) {
                            console.warn('重置加载 ditu.md 失败');
                          }

                          setTimeout(() => showMessage('success', '已重置', '授权范围已恢复初始状态'), 100);
                        }}
                        className="px-6 py-2.5 rounded-xl font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 shadow-lg border border-amber-200"
                      >
                        🔄 重置
                      </button>
                     <button
                       onClick={() => {
                         exitSplitMode();
                         setEditMode(false);
                         setSelectedPolygons([]);
                         
                         const map = mapInstanceRef.current;
                         
                         // ✅ 序列化所有多边形坐标，持久化保存到 data
                         const polygonsData = polygonsRef.current.map(p => ({
                           coordinates: p.turfFeature.geometry.coordinates
                         }));
                         
                         // ✅ 只有真正保存修改了，才需要重新确认
                         updateData({ 
                           authorizationPolygons: polygonsData,
                           authorizationConfirmed: false 
                         });
                         
                         // ✅ 重新计算并更新水印位置到新的质心
                         if (map && data.distributorName && polygonsRef.current.length > 0) {
                           const features = polygonsRef.current.map(p => p.turfFeature);
                           const fc = turf.featureCollection(features);
                           const centroid = turf.centroid(fc);
                           const polyCenter = [centroid.geometry.coordinates[0], centroid.geometry.coordinates[1]];
                           
                           // 清除旧文字，重新创建新位置的水印
                           map.getAllOverlays('text').forEach((o: any) => {
                             if (o.AM && o.AM.name === 'Text') o.setMap(null);
                           });
                           
                           const distributorText = new AMap.Text({
                             text: data.distributorName,
                             anchor: 'center',
                             style: {
                               'font-size': '24px',
                               'font-weight': '600',
                               'color': 'rgba(15, 23, 42, 0.18)',
                               'border': 'none',
                               'background': 'transparent',
                               'transform': 'scale(1.5)',
                               'pointer-events': 'none',
                               'user-select': 'none',
                               'letter-spacing': '2px'
                             },
                             zIndex: 1,
                             position: polyCenter
                           });
                           distributorText.setMap(map);
                         }
                         
                         setTimeout(() => showMessage('success', '保存成功', '授权区域已保存！请重新确认范围'), 100);
                       }}
                       className="px-8 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-sky-200 hover:shadow-xl"
                     >
                       保存修改
                     </button>
                   </div>
                 </>
               )}


             </div>
           </div>
           )}

           <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex-1 min-h-[400px]">
             {data.objectives.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <Target size={48} className="mb-4 opacity-50" />
                 <p>暂无目标</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {data.objectives.map((obj, idx) => (
                   <div key={obj.id} className="bg-white rounded-xl shadow-sm border border-slate-200 animate-slide-in-right overflow-hidden">
                     <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-semibold text-slate-800 flex items-center">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center mr-2">{idx + 1}</span>
                            {obj.title}
                          </span>
                          {/* Delete button removed for mandatory objectives */}
                          {/* 
                          <button onClick={() => removeObjective(obj.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                          */}
                        </div>
                        <div>
                          {obj.title === '达成进货承诺' ? (
                            <div className="flex gap-2">
                              <div className="flex-grow text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                              为保障市场供应并深化战略协作，我司承诺在 <span className="font-medium">元气森林2027财年（2026年12月1日至2027年11月30日）</span> 内，根据双方共同确认的滚动预测，完成总计 
                              <span className="font-bold mx-1 text-brand-700">
                                {(() => {
                                  // 提取括号内的数值和单位
                                  const newMatch = obj.targetValue.match(/（([\d,.]+)万元）/);
                                  const oldMatch = obj.targetValue.match(/¥([\d,.]+)/);
                                  if (newMatch && newMatch[1]) {
                                    const wanNum = parseInt(newMatch[1].replace(/[,]/g, ''), 10);
                                    if (!isNaN(wanNum)) return digitToChinese(wanNum * 10000).replace(/元整$/, '万元整');
                                  }
                                  if (oldMatch && oldMatch[1]) {
                                    const yuanNum = parseInt(oldMatch[1].replace(/[,]/g, ''), 10);
                                    if (!isNaN(yuanNum)) return digitToChinese(yuanNum).replace(/元整$/, '万元整');
                                  }
                                  return '零万元整';
                                })()}
                              </span>
                              （
                              <input
                                type="text"
                                value={(() => {
                                  const newMatch = obj.targetValue.match(/（([\d,.]+)万元）/);
                                  if (newMatch && newMatch[1]) {
                                    const wanNum = parseInt(newMatch[1].replace(/[,]/g, ''), 10);
                                    if (!isNaN(wanNum)) return wanNum.toLocaleString();
                                  }
                                  const oldMatch = obj.targetValue.match(/¥([\d,.]+)/);
                                  if (oldMatch && oldMatch[1]) {
                                    const yuanNum = parseInt(oldMatch[1].replace(/[,]/g, ''), 10);
                                    if (!isNaN(yuanNum)) return (yuanNum / 10000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                                  }
                                  return '';
                                })()}
                                onFocus={(e) => {
                                    if (e.target.value === '0' || e.target.value === '') {
                                        e.target.value = '';
                                        const newText = `为保障市场供应并深化战略协作，我司承诺在 元气森林2027财年（2026年12月1日至2027年11月30日） 内，根据双方共同确认的滚动预测，完成总计 人民币零万元整（万元） 的 Sell-in进货。该目标旨在确保核心产品对渠道的充足供应，为终端销售增长奠定基础。`;
                                        updateObjectiveTarget(obj.id, newText);
                                    }
                                }}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d.]/g, '');
                                  const wan = parseFloat(val);
                                  const num = isNaN(wan) ? 0 : Math.round(wan * 10000);

                                  const chineseAmount = num === 0 ? '零万元整' : digitToChinese(num).replace(/元整$/, '万元整');
                                  const formattedWan = num === 0 ? '' : wan.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

                                  const newPurchaseText = `为保障市场供应并深化战略协作，我司承诺在 元气森林2027财年（2026年12月1日至2027年11月30日） 内，根据双方共同确认的滚动预测，完成总计 人民币${chineseAmount}（${formattedWan}万元） 的 Sell-in进货。该目标旨在确保核心产品对渠道的充足供应，为终端销售增长奠定基础。`;
                                  
                                  // Update Purchase Target
                                  let newObjectives = data.objectives.map(o => o.id === obj.id ? { ...o, targetValue: newPurchaseText } : o);

                                  // Calculate Sales Target
                                  // Cases = Purchase Target / 45 (rounded)
                                  // Amount = Purchase Target / (1 - 0.19) (rounded)
                                  if (!isNaN(num)) {
                                      const salesCases = Math.round(num / 45);
                                      const salesCasesFormatted = salesCases.toLocaleString();
                                      const salesAmount = Math.round(num / (1 - 0.19));
                                      const salesAmountFormatted = salesAmount.toLocaleString();
                                      
                                      const newSalesText = `为共同扩大市场份额，我司承诺在 元气森林2027财年（2026年12月1日至2027年11月30日） 内，通过全渠道精细化运营，达成终端市场 Sell-out 销售目标 ${salesCasesFormatted} 箱（约合人民币 ${salesAmountFormatted} 元），并提升核心单品在辖区的渗透率。`;

                                      newObjectives = newObjectives.map(o => o.title === '实现销售目标' ? { ...o, targetValue: newSalesText } : o);
                                  }

                                  updateData({ objectives: newObjectives });
                                }}
                                className="w-24 text-center border-b border-slate-300 focus:border-brand-500 outline-none bg-transparent font-bold text-brand-600 px-1"
                                placeholder="输入金额"
                              />
                              万元） 的 Sell-in进货。该目标旨在确保核心产品对渠道的充足供应，为终端销售增长奠定基础。
                              </div>
                            </div>
                          ) : obj.title === '实现销售目标' ? (
                            <div className="flex gap-2">
                              <div className="flex-grow text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                              为共同扩大市场份额，我司承诺在 <span className="font-medium">元气森林2027财年（2026年12月1日至2027年11月30日）</span> 内，通过全渠道精细化运营，达成终端市场 Sell-out 销售目标 
                              <input
                                type="text"
                                value={(() => {
                                  const match = obj.targetValue.match(/销售目标\s*([\d,]+)\s*箱/);
                                  return match ? match[1] : '';
                                })()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d]/g, '');
                                  
                                  // 如果输入为空，清空targetValue，让placeholder显示
                                  if (!val || val === '') {
                                    updateObjectiveTarget(obj.id, '');
                                    return;
                                  }
                                  
                                  const cases = parseInt(val, 10);
                                  const casesFormatted = cases.toLocaleString();
                                  
                                  // Recalculate auxiliary amount based on cases if manually edited
                                  // Ratio: Amount = Cases * (45 / 0.81) = Cases * 55.555...
                                  const amount = Math.round(cases * (45 / 0.81));
                                  const amountFormatted = amount.toLocaleString();

                                  const newText = `为共同扩大市场份额，我司承诺在 元气森林2027财年（2026年12月1日至2027年11月30日） 内，通过全渠道精细化运营，达成终端市场 Sell-out 销售目标 ${casesFormatted} 箱（约合人民币 ${amountFormatted} 元），并提升核心单品在辖区的渗透率。`;
                                  updateObjectiveTarget(obj.id, newText);
                                }}
                                className="w-24 text-center border-b border-slate-300 focus:border-brand-500 outline-none bg-transparent font-bold text-brand-600 px-1"
                                placeholder="输入箱数"
                              />
                              箱（约合人民币 
                              <span className="font-bold mx-1 text-slate-600">
                                {(() => {
                                  const match = obj.targetValue.match(/销售目标\s*([\d,]+)\s*箱/);
                                  if (!match || !match[1] || match[1] === '0') return '';
                                  const cases = parseInt(match[1].replace(/,/g, ''), 10);
                                  const amount = Math.round(cases * (45 / 0.81));
                                  return amount.toLocaleString();
                                })()}
                              </span>
                              元），并提升核心单品在辖区的渗透率。
                              </div>
                            </div>
                          ) : obj.title === '守住库存健康' ? (
                            <div className="flex gap-2">
                              <div className="flex-grow text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                              为提升资金使用效率、保障产品新鲜度并实现可持续增长，我司承诺在 <span className="font-medium">元气森林2027财年（2026年12月1日至2027年11月30日）</span> 内，将所经销元气森林产品的平均库存周转天数优化至 ≤ 
                              <input
                                type="text"
                                value={(() => {
                                  const match = obj.targetValue.match(/≤\s*(\d+)\s*天/);
                                  return match ? match[1] : '';
                                })()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d]/g, '');
                                  const newText = `为提升资金使用效率、保障产品新鲜度并实现可持续增长，我司承诺在 元气森林2027财年（2026年12月1日至2027年11月30日） 内，将所经销元气森林产品的平均库存周转天数优化至 ≤ ${val} 天。通过精细化的进销存协同管理，实现更敏捷的市场响应。`;
                                  updateObjectiveTarget(obj.id, newText);
                                }}
                                className="w-20 text-center border-b border-slate-300 focus:border-brand-500 outline-none bg-transparent font-bold text-brand-600 px-1 mx-1"
                                placeholder="输入天数"
                              />
                              天。通过精细化的进销存协同管理，实现更敏捷的市场响应。
                              </div>
                            </div>
                          ) : obj.title === '提升盈利能力' ? (
                            <div className="flex gap-2">
                              <div className="flex-grow text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                              为确保生意长期健康发展，品牌方与我司协力，在 <span className="font-medium">元气森林2027财年（2026年12月1日至2027年11月30日）</span> 内，通过共推高毛利产品、共投精准营销与共管运营效率，将联合生意的年度经营利润率提升至 
                              <input
                                type="text"
                                value={(() => {
                                  const match = obj.targetValue.match(/提升至\s*(.*?)\s*%/);
                                  return match ? match[1] : '';
                                })()}
                                onFocus={(e) => {
                                    if (e.target.value === '[输入百分比]') {
                                        e.target.value = '';
                                        const newText = `为确保生意长期健康发展，品牌方与我司协力，在元气森林2027财年（2026年12月1日至2027年11月30日）内，通过共推高毛利产品、共投精准营销与共管运营效率，将联合生意的年度经营利润率提升至 %，实现有质量的增长。`;
                                        updateObjectiveTarget(obj.id, newText);
                                    }
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newText = `为确保生意长期健康发展，品牌方与我司协力，在元气森林2027财年（2026年12月1日至2027年11月30日）内，通过共推高毛利产品、共投精准营销与共管运营效率，将联合生意的年度经营利润率提升至 ${val}%，实现有质量的增长。`;
                                  updateObjectiveTarget(obj.id, newText);
                                }}
                                className="w-24 text-center border-b border-slate-300 focus:border-brand-500 outline-none bg-transparent font-bold text-brand-600 px-1 mx-1"
                                placeholder="输入百分比"
                              />
                              %，实现有质量的增长。
                              </div>
                            </div>
                          ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={obj.targetValue}
                              onChange={(e) => updateObjectiveTarget(obj.id, e.target.value)}
                              placeholder="例如：1200万 / 85%"
                              className="flex-grow text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none"
                            />
                          </div>
                          )}
                        </div>
                     </div>
                     

                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-slate-100">
        <button onClick={onBack} className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          上一步
        </button>
        <button
          onClick={handleNextClick}
          className={`px-8 py-2.5 rounded-xl text-white font-medium shadow-lg transition-all ${
            !data.authorizationConfirmed
              ? 'bg-slate-300 text-slate-400 cursor-not-allowed shadow-none'
              : checkAllObjectivesFilled()
                ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-200'
                : 'bg-slate-400 hover:bg-slate-500 shadow-slate-200'
          }`}
          title={!data.authorizationConfirmed ? '请先确认授权地图范围' : undefined}
        >
          下一步：策略与衡量 (S&M)
        </button>
      </div>
    </div>
  );
};

export default ObjectiveStep;