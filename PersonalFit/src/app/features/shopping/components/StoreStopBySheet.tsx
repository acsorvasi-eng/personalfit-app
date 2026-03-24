import { DSMBottomSheet } from "../../../components/dsm/ux-patterns";
import { StoreInfo } from "../../../data/productDatabase";
import { ShoppingItem } from "../types";
import { buildMapsUrl } from "../../../utils/storeRecommendation";
import { useLanguage } from "../../../contexts/LanguageContext";

interface Props {
  open: boolean;
  onClose: () => void;
  store: StoreInfo | null;
  allUncheckedItems: ShoppingItem[];
}

export function StoreStopBySheet({ open, onClose, store, allUncheckedItems }: Props) {
  const { t } = useLanguage();
  if (!store) return null;

  const available = allUncheckedItems.filter((i) => i.product.store === store.name);
  const missing = allUncheckedItems.filter((i) => i.product.store !== store.name);
  const estimatedTotal = available.reduce((sum, i) => sum + i.product.price, 0);

  const handleShare = async () => {
    const lines = [
      `${store.name} — bevásárlólista`,
      ...available.map((i) => `• ${i.product.name} — ${i.product.price.toFixed(2)} lei`),
    ];
    if (missing.length > 0) {
      lines.push("", `${t('store.notAvailable')}: ${missing.map((i) => i.product.name).join(", ")}`);
    }
    const text = lines.join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `${store.name} lista`, text });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <DSMBottomSheet
      open={open}
      onClose={onClose}
      title={`${store.logo} ${store.name} lista`}
      snapPoint="full"
    >
      <div className="px-4 pb-6">
        <p className="text-xs text-gray-400 mb-4">
          {available.length} {t('store.productSuffix')} · ~{estimatedTotal.toFixed(0)} {t('store.estimated')}
        </p>

        <div className="flex flex-col gap-2 mb-6">
          {available.map((item) => (
            <div
              key={item.product.id}
              className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5"
            >
              <span className="text-sm text-gray-700">{item.product.name}</span>
              <span className="text-sm font-bold text-gray-800">
                {item.product.price.toFixed(2)} lei
              </span>
            </div>
          ))}

          {missing.map((item) => (
            <div
              key={item.product.id}
              className="flex justify-between items-center bg-red-50 rounded-xl px-3 py-2.5 border border-red-100"
            >
              <span className="text-sm text-gray-400">⚠️ {item.product.name}</span>
              <span className="text-xs text-red-400 font-medium">
                {t('store.notInStore').replace('{store}', store.name)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 active:scale-95 transition-all"
          >
            📤 {t('store.share')}
          </button>
          <button
            onClick={() => window.open(buildMapsUrl(store), "_blank")}
            className="flex-1 py-3 bg-teal-600 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all"
          >
            🗺️ {t('store.directions')}
          </button>
        </div>
      </div>
    </DSMBottomSheet>
  );
}
