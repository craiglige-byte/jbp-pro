import React, { useState, useEffect, useRef } from 'react';
import { JBPData } from '../types';
import { Building2, User, Calendar, FileText, ExternalLink, X, ChevronDown, MapPin, Edit3, RefreshCw } from 'lucide-react';

interface InfoStepProps {
  data: JBPData;
  updateData: (updates: Partial<JBPData>) => void;
  onNext: () => void;
  onNavigateToMap: () => void;
  planVersion?: 'large' | 'small';
}

// 高德地图密钥
const AMAP_KEY = "09706e6d3502770b99148345f3b1dc47";
const AMAP_SECURITY_CODE = "5dcb0e9a91f058b3e3d40d73200d5f89";

if (typeof window !== 'undefined') {
  (window as any)._AMapSecurityConfig = {
    securityJsCode: AMAP_SECURITY_CODE
  };
}

// 解析 WKT 格式
const parseWKT = (wktText: string): number[][] | null => {
  const match = wktText.match(/POLYGON \(\((.*)\)\)/i);
  if (match) {
    const coordsText = match[1];
    return coordsText.split(',').map((point: string) => {
      const [lng, lat] = point.trim().split(' ').map(Number);
      return [lng, lat];
    });
  }
  return null;
};

const InfoStep: React.FC<InfoStepProps> = ({ data, updateData, onNext, onNavigateToMap, planVersion = 'large' }) => {
  const [showExample, setShowExample] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonsRef = useRef<any[]>([]);

  // 三个基本信息字段均为固定值，无需验证
  const isValid = true;

  // 初始化地图预览
  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
      if (mapInstanceRef.current) return;
      if (!mapContainerRef.current) {
        setTimeout(initMap, 100);
        return;
      }

      const renderPolygons = async (map: any) => {
        let polygonList: any[] = [];

        // 优先加载已保存的授权范围
        if (data.authorizationPolygons && data.authorizationPolygons.length > 0) {
          polygonList = data.authorizationPolygons.map((p: any) => {
            if (p.coordinates) return p.coordinates[0];
            return p;
          });
        } else {
          // 加载默认 ditu.md
          try {
            const res = await fetch(`/ditu.md?t=${Date.now()}`);
            const wktText = await res.text();
            const path = parseWKT(wktText);
            if (path) polygonList = [path];
          } catch (e) {
            console.warn('加载默认地图范围失败');
          }
        }

        if (polygonList.length === 0) return;

        // 清除旧多边形
        polygonsRef.current.forEach((p: any) => p.setMap(null));
        polygonsRef.current = [];

        let minLng = Infinity, maxLng = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;

        polygonList.forEach((path: number[][], index: number) => {
          const polygon = new (window as any).AMap.Polygon({
            path: path,
            strokeColor: '#3b82f6',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            zIndex: 100 + index,
          });
          polygon.setMap(map);
          polygonsRef.current.push(polygon);

          path.forEach(([lng, lat]: [number, number]) => {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          });
        });

        // 设置视野
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
      };

      try {
        if ((window as any).AMap) {
          const map = new (window as any).AMap.Map(mapContainerRef.current, {
            center: [118.5, 40.8],
            zoom: 5,
            viewMode: '2D',
            showIndoorMap: false,
          });
          mapInstanceRef.current = map;
          renderPolygons(map);
          return;
        }

        // 动态加载高德地图 SDK
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
        script.onload = () => {
          if (!isMounted || !mapContainerRef.current) return;
          const map = new (window as any).AMap.Map(mapContainerRef.current, {
            center: [118.5, 40.8],
            zoom: 5,
            viewMode: '2D',
            showIndoorMap: false,
          });
          mapInstanceRef.current = map;
          renderPolygons(map);
        };
        document.head.appendChild(script);
      } catch (e) {
        console.warn('地图初始化失败', e);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [data.authorizationPolygons, refreshKey]);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">开始您的联合生意规划 (JBP)</h2>
        <p className="text-slate-500 mt-2">以下是合作伙伴的基本信息</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        {/* 经销商名称 - 固定显示 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">经销商名称</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 text-slate-400" size={20} />
            <div className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
              {data.distributorName}
            </div>
          </div>
        </div>

        {/* 城市经理/负责人 - 固定显示 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">城市经理 / 负责人</label>
          <div className="relative">
            <User className="absolute left-3 top-3 text-slate-400" size={20} />
            <div className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
              {data.managerName}
            </div>
          </div>
        </div>

        {/* 规划周期 - 固定为 2027 全财年 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">规划周期</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 text-slate-400" size={20} />
            <div className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
              2027 全财年
            </div>
          </div>
        </div>

        {/* 授权区域范围 - 地图预览 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">授权区域范围</label>
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            {/* 地图容器 */}
            <div
              ref={mapContainerRef}
              className="w-full h-[280px] z-0"
            />

            {/* 右上角按钮组 */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="px-3 py-1.5 rounded-lg font-medium text-sm text-slate-600 bg-white/95 hover:bg-white shadow-md border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 backdrop-blur-sm"
                title="刷新地图"
              >
                <RefreshCw size={14} />
                刷新
              </button>
              <button
                onClick={onNavigateToMap}
                className="px-3 py-1.5 rounded-lg font-medium text-sm text-slate-600 bg-white/95 hover:bg-white shadow-md border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 backdrop-blur-sm"
                title="编辑授权区域"
              >
                <Edit3 size={14} />
                查看/调整授权区域
              </button>
            </div>

            {/* 底部区域信息 */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-2 bg-gradient-to-t from-black/40 to-transparent">
              <div className="flex items-center gap-1.5 text-white text-sm">
                <MapPin size={14} />
                <span>
                  {data.authorizationPolygons && data.authorizationPolygons.length > 0
                    ? `已配置 ${data.authorizationPolygons.length} 个授权区域`
                    : '点击编辑配置授权区域'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={onNext}
            disabled={!isValid}
            className={`w-full py-3 rounded-xl text-white font-medium text-lg transition-all transform active:scale-[0.99] ${
              isValid ? 'bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-200' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            开始规划
          </button>
        </div>
      </div>

      {/* 参考案例区域 */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <button
          onClick={() => setShowExample(!showExample)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="text-brand-600" size={20} />
            <div>
              <h3 className="font-medium text-slate-800">参考案例</h3>
              <p className="text-sm text-slate-500">查看完整的 JBP 规划示例</p>
            </div>
          </div>
          <ChevronDown
            className={`text-slate-400 transition-transform ${showExample ? 'rotate-180' : ''}`}
            size={20}
          />
        </button>

        {showExample && (
          <div className="px-6 pb-4 border-t border-slate-100">
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="text-brand-600" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-800">小黄鸭商贸有限公司 - 2027 FY</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    这是一个完整的联合生意规划示例，包含年度回顾、目标设定、策略拆解、行动战术等全部内容。
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const url = planVersion === 'small'
                      ? 'https://craiglige-byte.github.io/jbp-pro/JBP_Pro_小版本_小于500万.html'
                      : 'https://craiglige-byte.github.io/jbp-pro/JBP_Pro_大版本_大于等于500万.html';
                    window.open(url, '_blank');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink size={16} />
                  在新窗口打开
                </button>
                <button
                  onClick={() => setShowExample(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                >
                  <X size={16} />
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoStep;
