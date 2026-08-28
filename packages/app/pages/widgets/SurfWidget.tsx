// 文件路径: app/pages/widgets/SurfWidget.tsx
// 首页自定义 Widget —— 冲浪卡片（明日浪况）。
// 展示明日（Asia/Shanghai）当前用户配置浪点（默认双月湾）三个时段（晨/午/暮）的
// 浪高、涌浪周期、涌向、风速/阵风、潮汐状态。数据源 A（Open-Meteo）前端直连；
// 潮汐走服务端 SG 代理。编辑态（isEditing）提供「设置」入口配置个人浪点。
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuWaves, LuWind, LuRefreshCw, LuSettings, LuX, LuCheck } from "react-icons/lu";
import { useSessionSnapshot } from "app/sessionSnapshot";
import {
  SURF_SPOT,
  SURF_TIMEZONE,
  SURF_PERIODS,
  formatFetchedAt,
  normalizeBeachOrientation,
  recommendPeriod,
  tideStateLabelKey,
  validateSurfSpotConfig,
  type SurfSpotConfig,
} from "./surfForecast";
import { readSurfSpotConfig, writeSurfSpotConfig } from "./surfSpotConfig";
import { useSurfForecast } from "./useSurfForecast";
import "./SurfWidget.css";

interface SurfWidgetProps {
  isEditing?: boolean;
}

const num = (v: number | null, digits = 1): string =>
  v == null || Number.isNaN(v) ? "—" : v.toFixed(digits);

/** windRelation.kind → 中文 fallback（无 i18n 资源时用；有资源走 labelKey）。 */
const WIND_RELATION_FALLBACK: Record<string, string> = {
  onshore: "向岸风",
  offshore: "离岸风",
  "cross-shore-left": "左侧风",
  "cross-shore-right": "右侧风",
  unknown: "风况未知",
};
const windRelationFallback = (kind: string): string => WIND_RELATION_FALLBACK[kind] ?? "";

const PERIOD_LABEL_KEYS: Record<string, string> = {
  morning: "widgets.surf.period.morning",
  midday: "widgets.surf.period.midday",
  dusk: "widgets.surf.period.dusk",
};

const SurfWidget: React.FC<SurfWidgetProps> = ({ isEditing = false }) => {
  const { t } = useTranslation();
  const { userId } = useSessionSnapshot();

  // 当前生效的浪点配置：默认读取用户已存配置（未存则默认双月湾）。
  const [spot, setSpot] = useState<SurfSpotConfig>(() => readSurfSpotConfig(userId));
  // 设置表单是否打开；打开时从当前 spot 拷贝草稿，避免直接改生效值。
  const [formOpen, setFormOpen] = useState(false);
  const [draftName, setDraftName] = useState(spot.name);
  const [draftLat, setDraftLat] = useState(String(spot.latitude));
  const [draftLng, setDraftLng] = useState(String(spot.longitude));
  const [draftOrientation, setDraftOrientation] = useState(String(spot.beachOrientation));
  const [formError, setFormError] = useState<string | null>(null);

  // HIGH-1 账号切换隔离：spot 不能在 mount 时一次性固化，必须随 userId 变化重载。
  // 切换账号后重新读取新账号的已存浪点，并重置表单草稿/关闭表单，避免
  // 旧账号 spot 被误写进新账号 key、或草稿串到新账号。
  useEffect(() => {
    const next = readSurfSpotConfig(userId);
    setSpot(next);
    setDraftName(next.name);
    setDraftLat(String(next.latitude));
    setDraftLng(String(next.longitude));
    setDraftOrientation(String(next.beachOrientation));
    setFormError(null);
    setFormOpen(false);
  }, [userId]);

  const { state, profile, tideUnavailable, refresh } = useSurfForecast(spot);

  const title = t("widgets.surf.title", "冲浪");

  const openForm = () => {
    setDraftName(spot.name);
    setDraftLat(String(spot.latitude));
    setDraftLng(String(spot.longitude));
    setDraftOrientation(String(spot.beachOrientation));
    setFormError(null);
    setFormOpen(true);
  };

  const cancelForm = () => {
    setFormOpen(false);
    setFormError(null);
  };

  const saveForm = () => {
    // NIT: 保存前 trim 名称，避免空白字符串进入配置/cache key。
    // beachOrientation：用户输入非法时归一化为默认 90（损坏回退，保留 name/coords）。
    const next: SurfSpotConfig = {
      name: draftName.trim(),
      latitude: Number(draftLat),
      longitude: Number(draftLng),
      beachOrientation: normalizeBeachOrientation(draftOrientation),
    };
    if (!validateSurfSpotConfig(next)) {
      setFormError(t("widgets.surf.settings.invalid", "名称不能为空，纬度 ∈ [-90,90]，经度 ∈ [-180,180]"));
      return;
    }
    writeSurfSpotConfig(userId, next);
    setSpot(next);
    setFormOpen(false);
    setFormError(null);
  };

  const dateLabel = useMemo(() => {
    if (!profile) return "";
    const [, m, d] = profile.dateKey.split("-");
    return `${m}/${d}`;
  }, [profile]);

  // M1.1d-a：规则型推荐时段（纯函数，非 AI）。profile 存在时计算，缺数据返回 null。
  const recommended = useMemo(() => (profile ? recommendPeriod(profile) : null), [profile]);
  const fetchedLabel = useMemo(
    () => (profile ? formatFetchedAt(profile.fetchedAt) : null),
    [profile]
  );

  // 编辑态：在卡片头部右上角放设置入口（非编辑态不渲染）。
  // WARNING: formOpen 打开时隐藏齿轮，避免点击重置未提交草稿。
  const renderSettingsEntry = isEditing && !formOpen && (
    <button
      type="button"
      className="surf-widget__settings-btn"
      onClick={openForm}
      aria-label={t("widgets.surf.settings.open", "设置浪点")}
      title={t("widgets.surf.settings.open", "设置浪点")}
    >
      <LuSettings size={14} aria-hidden="true" />
    </button>
  );

  const periodLabel = (key: string): string =>
    t(PERIOD_LABEL_KEYS[key] ?? "widgets.surf.period.morning", "晨");

  const hoursFor = (key: string): string => {
    const def = SURF_PERIODS.find((p) => p.key === key);
    return def ? `${def.startHour}-${def.endHour}` : "";
  };

  // HIGH-2 统一卡片结构：header + 设置表单/正文始终在同一张卡片里渲染。
  // 不再对 loading/error 且 profile==null 的状态 early return 挡住 formOpen——
  // 无论请求失败/离线/坏坐标，只要用户打开了设置表单，表单都会渲染并可保存。
  const showForm = formOpen;
  const showForecast = !formOpen && profile != null;
  const showMessage = !formOpen && profile == null;

  return (
    <div className="surf-widget" aria-label={title}>
      <header className="surf-widget__header">
        <span className="surf-widget__title">
          <LuWaves size={15} aria-hidden="true" />
          {t("widgets.surf.title", "冲浪")}
          <span className="surf-widget__spot">{profile ? profile.spotName : spot.name}</span>
        </span>
        <span className="surf-widget__header-right">
          <span className="surf-widget__date">
            {profile ? `${t("widgets.surf.tomorrow", "明日")} ${dateLabel}` : ""}
          </span>
          {renderSettingsEntry}
        </span>
      </header>

      {showForm && (
        <div className="surf-widget__settings" role="group" aria-label={t("widgets.surf.settings.title", "浪点设置")}>
          <label className="surf-widget__field">
            <span>{t("widgets.surf.settings.name", "浪点名称")}</span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onInput={(e) => setDraftName((e.target as HTMLInputElement).value)}
              placeholder={SURF_SPOT.name}
            />
          </label>
          <label className="surf-widget__field">
            <span>{t("widgets.surf.settings.lat", "纬度")}</span>
            <input
              type="number"
              value={draftLat}
              step="any"
              onChange={(e) => setDraftLat(e.target.value)}
              onInput={(e) => setDraftLat((e.target as HTMLInputElement).value)}
              placeholder="22.635455"
            />
          </label>
          <label className="surf-widget__field">
            <span>{t("widgets.surf.settings.lng", "经度")}</span>
            <input
              type="number"
              value={draftLng}
              step="any"
              onChange={(e) => setDraftLng(e.target.value)}
              onInput={(e) => setDraftLng((e.target as HTMLInputElement).value)}
              placeholder="114.927943"
            />
          </label>
          <label className="surf-widget__field">
            <span>{t("widgets.surf.settings.orientation", "海滩朝向（°）")}</span>
            <input
              type="number"
              min={0}
              max={360}
              value={draftOrientation}
              onChange={(e) => setDraftOrientation(e.target.value)}
              onInput={(e) => setDraftOrientation((e.target as HTMLInputElement).value)}
              placeholder={String(SURF_SPOT.beachOrientation)}
            />
            <em className="surf-widget__hint">
              {t(
                "widgets.surf.settings.orientationHint",
                "面向海面的看海方向：北=0 东=90 南=180 西=270（双月湾面东=90）"
              )}
            </em>
          </label>
          {formError && <p className="surf-widget__settings-error">{formError}</p>}
          <div className="surf-widget__settings-actions">
            <button type="button" className="surf-widget__settings-save" onClick={saveForm}>
              <LuCheck size={13} aria-hidden="true" />
              {t("common.save", "保存")}
            </button>
            <button type="button" className="surf-widget__settings-cancel" onClick={cancelForm}>
              <LuX size={13} aria-hidden="true" />
              {t("common.cancel", "取消")}
            </button>
          </div>
        </div>
      )}

      {showMessage && state === "loading" && (
        <div className="surf-widget__message">{t("widgets.surf.loading", "浪况加载中…")}</div>
      )}
      {showMessage && state === "error" && (
        <div className="surf-widget__message surf-widget__message--error">
          <span>{t("widgets.surf.error", "浪况获取失败")}</span>
          <button type="button" className="surf-widget__retry" onClick={refresh}>
            <LuRefreshCw size={14} aria-hidden="true" />
            {t("widgets.surf.retry", "重试")}
          </button>
        </div>
      )}

      {showForecast && (
        <div className="surf-widget__periods">
          {profile.periods.map((p) => (
            <div className="surf-widget__period" key={p.periodKey}>
              <div className="surf-widget__period-head">
                <span className="surf-widget__period-name">
                  {periodLabel(p.periodKey)}
                  <span className="surf-widget__period-hours">{hoursFor(p.periodKey)}</span>
                </span>
                <span className="surf-widget__tide">
                  {p.tideState ? t(tideStateLabelKey(p.tideState), "") : ""}
                </span>
              </div>
              <div className="surf-widget__rows">
                <span className="surf-widget__row">
                  <LuWaves size={13} aria-hidden="true" />
                  <span>{t("widgets.surf.field.wave", "浪高")}</span>
                  <b>{num(p.waveHeight)}</b>
                  <em>m</em>
                  <span className="surf-widget__sub">{p.swellDirection ?? "—"}</span>
                </span>
                <span className="surf-widget__row">
                  <LuWaves size={13} aria-hidden="true" />
                  <span>{t("widgets.surf.field.period", "涌期")}</span>
                  <b>{num(p.swellPeriod, 0)}</b>
                  <em>s</em>
                  <span className="surf-widget__sub">{p.swellDirection ?? "—"}</span>
                </span>
                <span className="surf-widget__row">
                  <LuWind size={13} aria-hidden="true" />
                  <span>{t("widgets.surf.field.wind", "风")}</span>
                  <b>{num(p.windSpeed, 0)}</b>
                  <em>km/h</em>
                  <span className="surf-widget__sub">
                    {p.windDirection
                      ? `${p.windDirection}风 · ${t(p.windRelation.labelKey, windRelationFallback(p.windRelation.kind))}`
                      : "—"}
                  </span>
                </span>
                <span className="surf-widget__row surf-widget__row--gust">
                  <LuWind size={13} aria-hidden="true" />
                  <span>{t("widgets.surf.field.gust", "阵风")}</span>
                  <b>{num(p.windGust, 0)}</b>
                  <em>km/h</em>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!formOpen && profile && recommended && (
        <div className="surf-widget__recommend">
          <span className="surf-widget__recommend-label">
            {t("widgets.surf.recommend", "推荐")}：
          </span>
          <span className="surf-widget__recommend-value">
            {periodLabel(recommended)}
            <span className="surf-widget__period-hours">{hoursFor(recommended)}</span>
          </span>
        </div>
      )}
      {!formOpen && profile && !recommended && (
        <div className="surf-widget__recommend surf-widget__recommend--na">
          {t("widgets.surf.recommend.na", "暂无可靠推荐")}
        </div>
      )}

      {!formOpen && tideUnavailable && profile && (
        <div className="surf-widget__tide-na">
          {t("widgets.surf.tide.na", "暂无潮汐数据")}
        </div>
      )}
      {!formOpen && profile && (
        <footer className="surf-widget__footer">
          <span className="surf-widget__timezone">{SURF_TIMEZONE}</span>
          <span className="surf-widget__updated">
            {fetchedLabel
              ? `${t("widgets.surf.updated", "数据更新于")} ${fetchedLabel}`
              : t("widgets.surf.updated.na", "数据不足")}
          </span>
          <button
            type="button"
            className="surf-widget__retry"
            onClick={refresh}
            aria-label={t("widgets.surf.retry", "重试")}
          >
            <LuRefreshCw size={13} aria-hidden="true" />
          </button>
        </footer>
      )}
    </div>
  );
};

export default SurfWidget;
