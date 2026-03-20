import { useNavigate } from "react-router";
import { DSMBottomSheet } from "../../../components/dsm/ux-patterns";
import {
  StoreRecommendation,
  TwoStoreRecommendation,
} from "../../../utils/storeRecommendation";

interface Props {
  open: boolean;
  onClose: () => void;
  topRecommendation: StoreRecommendation | null;
  twoStoreCombo: TwoStoreRecommendation | null;
}

export function OrderDeliverySheet({ open, onClose, topRecommendation, twoStoreCombo }: Props) {
  const navigate = useNavigate();

  const deliveryRec = topRecommendation?.store.hasDelivery ? topRecommendation : null;
  const comboAvailable =
    twoStoreCombo &&
    twoStoreCombo.primary.store.hasDelivery &&
    twoStoreCombo.secondary.store.hasDelivery;

  const handleOrder = (storeName: string) => {
    onClose();
    navigate(`/checkout?store=${encodeURIComponent(storeName)}`);
  };

  return (
    <DSMBottomSheet open={open} onClose={onClose} title="Honnan rendeled?" snapPoint="full">
      <div className="px-4 pb-6">
        <p className="text-xs text-gray-400 mb-4">
          Válassz 1 vagy 2 boltot. 2 bolt = 2 futárdíj.
        </p>

        {!deliveryRec && !comboAvailable && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Sajnos a listádon lévő termékekhez nem elérhető házhozszállítás.
          </div>
        )}

        <div className="flex flex-col gap-3 mb-5">
          {deliveryRec && (
            <div className="bg-teal-50 rounded-2xl p-3 border-2 border-teal-600">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold text-gray-800">
                    {deliveryRec.store.name}
                    {deliveryRec.isPreferred && (
                      <span className="ml-1.5 text-2xs text-amber-500 font-semibold">⭐ Megszokott</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {deliveryRec.matchCount}/{deliveryRec.totalItems} termék ·{" "}
                    {deliveryRec.store.deliveryPartner} · {deliveryRec.store.deliveryFee} lei futár
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-teal-600">
                    ~{(deliveryRec.estimatedTotal + (deliveryRec.store.deliveryFee ?? 0)).toFixed(0)} lei
                  </div>
                  <div className="text-2xs text-gray-400">termék + futár</div>
                </div>
              </div>
              {deliveryRec.missingItems.length > 0 && (
                <div className="text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1 inline-block">
                  ⚠️ {deliveryRec.missingItems.map((i) => i.product.name).join(", ")} nem elérhető
                </div>
              )}
            </div>
          )}

          {comboAvailable && (
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {twoStoreCombo!.primary.store.name} + {twoStoreCombo!.secondary.store.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {twoStoreCombo!.combinedMatchCount}/{twoStoreCombo!.primary.totalItems} termék · 2 futár
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-gray-700">
                    ~{(twoStoreCombo!.combinedTotal + twoStoreCombo!.combinedDeliveryFee).toFixed(0)} lei
                  </div>
                  <div className="text-2xs text-red-400">
                    +{twoStoreCombo!.combinedDeliveryFee.toFixed(2)} lei futár (2×)
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Minden termék elérhető, de drágább a szállítás
              </div>
            </div>
          )}
        </div>

        {deliveryRec && (
          <button
            onClick={() => handleOrder(deliveryRec.store.name)}
            className="w-full py-3.5 bg-teal-600 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
          >
            Megrendelés → {deliveryRec.store.name} ({deliveryRec.store.deliveryPartner})
          </button>
        )}
      </div>
    </DSMBottomSheet>
  );
}
