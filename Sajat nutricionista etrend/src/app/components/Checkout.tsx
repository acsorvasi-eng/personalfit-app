import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  ShoppingCart,
  MapPin,
  Clock,
  CreditCard,
  CheckCircle2,
  Truck,
  ChevronRight,
  Package,
  Sparkles,
  Shield,
  Plus,
  Minus,
  Trash2,
  Home,
  Building2,
  Phone,
  User,
  Calendar,
  CircleDollarSign,
  PartyPopper,
  Store,
  BadgeCheck,
  ReceiptText,
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Product, calculateNutrition } from "../data/productDatabase";
import { useCalorieTracker } from "../hooks/useCalorieTracker";
import { useLanguage, getLocale } from "../contexts/LanguageContext";

interface ShoppingItem {
  product: Product;
  quantity: number;
  checked: boolean;
}

interface DeliveryAddress {
  name: string;
  phone: string;
  city: string;
  zip: string;
  street: string;
  floor: string;
  notes: string;
}

interface DeliverySlot {
  id: string;
  date: string;
  dayName: string;
  timeRange: string;
  fee: number;
  express: boolean;
}

type CheckoutStep = "cart" | "address" | "timeslot" | "payment" | "confirmation";

const STEPS: { key: CheckoutStep; label: string; icon: React.ElementType }[] = [
  { key: "cart", label: "Kosár", icon: ShoppingCart },
  { key: "address", label: "Szállítás", icon: MapPin },
  { key: "timeslot", label: "Időpont", icon: Clock },
  { key: "payment", label: "Fizetés", icon: CreditCard },
  { key: "confirmation", label: "Kész", icon: CheckCircle2 },
];

function generateOrderId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "MV-";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function generateDeliverySlots(locale: string): DeliverySlot[] {
  const slots: DeliverySlot[] = [];
  const timeRanges = [
    { range: "08:00 - 10:00", fee: 14.99 },
    { range: "10:00 - 12:00", fee: 12.99 },
    { range: "12:00 - 14:00", fee: 9.99 },
    { range: "14:00 - 16:00", fee: 9.99 },
    { range: "16:00 - 18:00", fee: 12.99 },
    { range: "18:00 - 20:00", fee: 14.99 },
  ];

  for (let d = 0; d < 5; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d + 1);
    const dateStr = date.toLocaleDateString(locale, { month: "short", day: "numeric" });
    const dayName = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);

    timeRanges.forEach((t, idx) => {
      slots.push({
        id: `${d}-${idx}`,
        date: dateStr,
        dayName,
        timeRange: t.range,
        fee: d === 0 ? t.fee + 5 : t.fee,
        express: d === 0,
      });
    });
  }
  return slots;
}

export function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeName = searchParams.get("store") || "Bolt";
  const { consumed, target } = useCalorieTracker();
  const { language, t } = useLanguage();

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [cartItems, setCartItems] = useState<ShoppingItem[]>([]);
  const [address, setAddress] = useState<DeliveryAddress>(() => {
    const saved = localStorage.getItem("deliveryAddress");
    if (saved) try { return JSON.parse(saved); } catch { /* ignore */ }
    return { name: "", phone: "+40 ", city: "Marosvásárhely", zip: "", street: "", floor: "", notes: "" };
  });
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [tipAmount, setTipAmount] = useState(0);

  const localizedSteps = [
    { key: "cart" as CheckoutStep, label: t("checkout.stepCart"), icon: ShoppingCart },
    { key: "address" as CheckoutStep, label: t("checkout.stepDelivery"), icon: MapPin },
    { key: "timeslot" as CheckoutStep, label: t("checkout.stepTime"), icon: Clock },
    { key: "payment" as CheckoutStep, label: t("checkout.stepPayment"), icon: CreditCard },
    { key: "confirmation" as CheckoutStep, label: t("checkout.stepDone"), icon: CheckCircle2 },
  ];

  const deliverySlots = generateDeliverySlots(getLocale(language));

  // Load checked shopping items from localStorage into the cart
  // If no items are checked, load ALL items so the user can still order
  useEffect(() => {
    const saved = localStorage.getItem("shoppingItems");
    if (saved) {
      try {
        const items: ShoppingItem[] = JSON.parse(saved);
        const checkedItems = items.filter((i) => i.checked);
        // If user has checked items, use those; otherwise use all items
        setCartItems(checkedItems.length > 0 ? checkedItems : items);
      } catch { /* ignore */ }
    }
  }, []);

  const updateCartItem = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((_, i) => i !== index));
    } else {
      setCartItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, quantity } : item))
      );
    }
  };

  const removeCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + item.product.price * (item.quantity / item.product.defaultQuantity) * 100
  }, 0) / 100;

  const deliveryFee = selectedSlot?.fee || 0;
  const serviceFee = Math.round(subtotal * 5) / 100;
  const total = Math.round((subtotal + deliveryFee + serviceFee + tipAmount) * 100) / 100;

  const stepIndex = localizedSteps.findIndex((s) => s.key === step);

  const canProceed = () => {
    switch (step) {
      case "cart":
        return cartItems.length > 0;
      case "address":
        return !!(address.name && address.phone.length > 4 && address.city && address.zip.length >= 5 && address.street);
      case "timeslot":
        return !!selectedSlot;
      case "payment":
        return paymentMethod === "cash" || (cardNumber.length >= 16 && cardExpiry.length >= 4 && cardCvc.length >= 3);
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (step === "payment") {
      setIsProcessing(true);
      await new Promise((r) => setTimeout(r, 2500));
      const id = generateOrderId();
      setOrderId(id);
      // Save order to localStorage
      const orders = JSON.parse(localStorage.getItem("orders") || "[]");
      orders.push({
        id,
        store: storeName,
        items: cartItems,
        address,
        slot: selectedSlot,
        paymentMethod,
        subtotal: Math.round(subtotal),
        deliveryFee,
        serviceFee,
        tip: tipAmount,
        total,
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("orders", JSON.stringify(orders));
      // Save address for future
      localStorage.setItem("deliveryAddress", JSON.stringify(address));
      // Remove ordered items from shopping list
      const saved = localStorage.getItem("shoppingItems");
      if (saved) {
        try {
          const allItems: ShoppingItem[] = JSON.parse(saved);
          const orderedIds = new Set(cartItems.map((c) => c.product.id));
          const remaining = allItems.filter((item) => !orderedIds.has(item.product.id));
          localStorage.setItem("shoppingItems", JSON.stringify(remaining));
        } catch { /* ignore */ }
      }
      setIsProcessing(false);
      setStep("confirmation");
      return;
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) {
      setStep(STEPS[nextIdx].key);
    }
  };

  const handleBack = () => {
    if (step === "cart") {
      navigate("/shopping");
      return;
    }
    if (step === "confirmation") return;
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setStep(STEPS[prevIdx].key);
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const totalNutrition = cartItems.reduce(
    (acc, item) => {
      const n = calculateNutrition(item.product, item.quantity);
      return {
        calories: acc.calories + n.calories,
        protein: acc.protein + n.protein,
        carbs: acc.carbs + n.carbs,
        fat: acc.fat + n.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="flex-shrink-0">
        <PageHeader
          iconElement={
            step !== "confirmation" ? (
              <button onClick={handleBack} className="w-full h-full flex items-center justify-center">
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
            ) : (
              <PartyPopper className="w-6 h-6 text-white" />
            )
          }
          title={step === "confirmation" ? t("checkout.orderPlaced") : `${t("checkout.orderTitle")} - ${storeName}`}
          subtitle={step === "confirmation" ? `#${orderId}` : localizedSteps[stepIndex]?.label}
          gradientFrom="from-blue-500"
          gradientVia="via-indigo-500"
          gradientTo="to-purple-600"
          stats={[
            {
              label: `${consumed} / ${target} kcal`,
              value: consumed,
              suffix: "kcal",
            },
            {
              label: t("checkout.stepCart"),
              value: cartItems.length,
              suffix: t("checkout.pcs"),
            },
            {
              label: t("checkout.subtotal"),
              value: `${subtotal.toFixed(2)}`,
              suffix: "lei",
            },
          ]}
        />
      </div>

      {/* Progress Steps */}
      {step !== "confirmation" && (
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {localizedSteps.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = i === stepIndex;
              const isDone = i < stepIndex;
              return (
                <div key={s.key} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isDone
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-indigo-500 text-white shadow-lg ring-4 ring-indigo-100"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        isActive ? "text-indigo-600" : isDone ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-6 h-0.5 mx-1 mt-[-12px] ${
                        i < stepIndex ? "bg-green-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ========== STEP 1: CART REVIEW ========== */}
        {step === "cart" && (
          <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
            {/* Store badge */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-4 text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-white/70 text-xs font-bold">{t("checkout.selectedStore")}</div>
                <div className="text-xl" style={{ fontWeight: 800 }}>{storeName}</div>
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                {cartItems.length} {t("checkout.productCount")}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg text-gray-900" style={{ fontWeight: 800 }}>{t("checkout.cartContent")}</h2>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>{t("checkout.emptyCart")}</h3>
                <p className="text-gray-500 mb-2">{t("checkout.emptyCartDesc1")}</p>
                <p className="text-gray-500 mb-6">{t("checkout.emptyCartDesc2")}</p>
                <button
                  onClick={() => navigate("/shopping")}
                  className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-all active:scale-95"
                >
                  {t("checkout.backToList")}
                </button>
              </div>
            ) : (
              <>
                {cartItems.map((item, index) => {
                  const nutrition = calculateNutrition(item.product, item.quantity);
                  const itemPrice = Math.round(
                    item.product.price * (item.quantity / item.product.defaultQuantity) * 100
                  ) / 100;
                  return (
                    <div
                      key={`${item.product.id}-${index}`}
                      className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-4xl flex-shrink-0">{item.product.image}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-gray-900" style={{ fontWeight: 700 }}>{item.product.name}</div>
                              <div className="text-sm text-gray-500">{item.product.brand}</div>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                                {item.product.store}
                              </span>
                            </div>
                            <button
                              onClick={() => removeCartItem(index)}
                              className="text-red-400 hover:text-red-600 p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200">
                              <button
                                onClick={() =>
                                  updateCartItem(
                                    index,
                                    item.quantity - (item.product.unit === "db" ? 1 : 100)
                                  )
                                }
                                className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-xl transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="px-3 text-sm" style={{ fontWeight: 800 }}>
                                {item.quantity} {item.product.unit}
                              </span>
                              <button
                                onClick={() =>
                                  updateCartItem(
                                    index,
                                    item.quantity + (item.product.unit === "db" ? 1 : 100)
                                  )
                                }
                                className="w-9 h-9 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-r-xl transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex-1 text-right">
                              <span className="text-lg text-indigo-600" style={{ fontWeight: 800 }}>
                                {itemPrice.toFixed(2)} lei
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                              {nutrition.calories} kcal
                            </span>
                            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
                              {nutrition.protein}g {t("checkout.protein")}
                            </span>
                            <span className="text-[10px] bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-bold">
                              {nutrition.carbs}g {t("checkout.carbs")}
                            </span>
                            <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                              {nutrition.fat}g {t("checkout.fat")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Nutrition total */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200">
                  <h3 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    {t("checkout.totalNutrition")}
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="text-lg text-orange-600" style={{ fontWeight: 800 }}>{Math.round(totalNutrition.calories)}</div>
                      <div className="text-[10px] text-gray-500 font-bold">kcal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg text-red-600" style={{ fontWeight: 800 }}>{Math.round(totalNutrition.protein)}g</div>
                      <div className="text-[10px] text-gray-500 font-bold">{t("checkout.protein")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg text-yellow-600" style={{ fontWeight: 800 }}>{Math.round(totalNutrition.carbs)}g</div>
                      <div className="text-[10px] text-gray-500 font-bold">{t("menu.carbs")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg text-purple-600" style={{ fontWeight: 800 }}>{Math.round(totalNutrition.fat)}g</div>
                      <div className="text-[10px] text-gray-500 font-bold">{t("checkout.fat")}</div>
                    </div>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-200">
                  <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-indigo-500" />
                    {t("checkout.priceSummary")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("checkout.productsLabel")} ({cartItems.length} {t("checkout.pcs")})</span>
                      <span className="text-gray-900" style={{ fontWeight: 600 }}>
                        {subtotal.toFixed(2)} lei
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>{t("checkout.deliveryFee")}</span>
                      <span>{t("checkout.inNextStep")}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>{t("checkout.serviceFee")} (5%)</span>
                      <span>{serviceFee.toFixed(2)} lei</span>
                    </div>
                    <div className="border-t border-indigo-200 pt-3 mt-3 flex justify-between items-end">
                      <span className="text-gray-900" style={{ fontWeight: 800 }}>{t("checkout.subtotal")}</span>
                      <span className="text-2xl text-indigo-600" style={{ fontWeight: 800 }}>
                        {(subtotal + serviceFee).toFixed(2)} lei
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========== STEP 2: DELIVERY ADDRESS ========== */}
        {step === "address" && (
          <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg text-gray-900" style={{ fontWeight: 800 }}>{t("checkout.deliveryAddress")}</h2>
            </div>

            {/* Address Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 flex items-center gap-3">
                <Home className="w-5 h-5 text-indigo-500" />
                <span className="font-bold text-indigo-700">{t("checkout.home")}</span>
              </button>
              <button className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-200 transition-all">
                <Building2 className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-gray-500">{t("checkout.office")}</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  {t("checkout.nameLabel")} *
                </label>
                <input
                  type="text"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  placeholder={t("checkout.fullName")}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {t("checkout.phone")} *
                </label>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="+40 7XX XXX XXX"
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-gray-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("checkout.city")} *</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="Marosvásárhely"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("checkout.zipCode")} *</label>
                  <input
                    type="text"
                    value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    placeholder="540001"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {t("checkout.street")} *
                </label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="Str. Bolyai Farkas 12."
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t("checkout.floorDoor")}</label>
                <input
                  type="text"
                  value={address.floor}
                  onChange={(e) => setAddress({ ...address, floor: e.target.value })}
                  placeholder={t("checkout.floorPlaceholder")}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t("checkout.courierNote")}</label>
                <textarea
                  value={address.notes}
                  onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                  placeholder={t("checkout.courierNotePlaceholder")}
                  rows={2}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none text-gray-900"
                />
              </div>
            </div>

            {/* Info card */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-bold">{t("checkout.dataSecure")}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {t("checkout.dataSecureDesc")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 3: DELIVERY TIME SLOT ========== */}
        {step === "timeslot" && (
          <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg text-gray-900" style={{ fontWeight: 800 }}>{t("checkout.deliveryTime")}</h2>
            </div>

            {/* Delivery destination summary */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-bold">{t("checkout.deliveryAddr")}</div>
                <div className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>
                  {address.zip} {address.city}, {address.street}
                </div>
              </div>
              <BadgeCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>

            {/* Group slots by day */}
            {(() => {
              const grouped: Record<string, DeliverySlot[]> = {};
              deliverySlots.forEach((slot) => {
                const key = `${slot.dayName}, ${slot.date}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(slot);
              });

              return Object.entries(grouped).map(([dayLabel, slots]) => (
                <div key={dayLabel}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <h3 className="font-bold text-gray-700 text-sm">{dayLabel}</h3>
                    {slots[0].express && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                        {t("checkout.express")} +5 lei
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? "border-indigo-400 bg-indigo-50 ring-4 ring-indigo-100"
                              : "border-gray-200 bg-white hover:border-indigo-200"
                          }`}
                        >
                          <div className={`text-sm ${isSelected ? "text-indigo-700" : "text-gray-700"}`} style={{ fontWeight: 700 }}>
                            {slot.timeRange}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Truck className="w-3 h-3 text-gray-400" />
                            <span
                              className={`text-xs ${isSelected ? "text-indigo-500" : "text-gray-500"}`}
                              style={{ fontWeight: 600 }}
                            >
                              {slot.fee.toFixed(2)} lei
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}

            {selectedSlot && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-green-800">{t("checkout.selectedSlot")}</span>
                </div>
                <p className="text-sm text-green-700">
                  {selectedSlot.dayName}, {selectedSlot.date} — {selectedSlot.timeRange}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {t("checkout.deliveryFee")}: {selectedSlot.fee.toFixed(2)} lei
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========== STEP 4: PAYMENT ========== */}
        {step === "payment" && (
          <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg text-gray-900" style={{ fontWeight: 800 }}>{t("checkout.payment")}</h2>
            </div>

            {/* Order summary card */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-bold">{storeName}</div>
                <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                  {cartItems.length} termék — {selectedSlot?.dayName}, {selectedSlot?.timeRange}
                </div>
              </div>
              <BadgeCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("card")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === "card"
                    ? "border-indigo-400 bg-indigo-50 ring-4 ring-indigo-100"
                    : "border-gray-200 hover:border-indigo-200"
                }`}
              >
                <CreditCard className={`w-7 h-7 ${paymentMethod === "card" ? "text-indigo-500" : "text-gray-400"}`} />
                <span className={`text-sm ${paymentMethod === "card" ? "text-indigo-700" : "text-gray-600"}`} style={{ fontWeight: 700 }}>
                  {t("checkout.bankCard")}
                </span>
              </button>
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === "cash"
                    ? "border-indigo-400 bg-indigo-50 ring-4 ring-indigo-100"
                    : "border-gray-200 hover:border-indigo-200"
                }`}
              >
                <CircleDollarSign className={`w-7 h-7 ${paymentMethod === "cash" ? "text-indigo-500" : "text-gray-400"}`} />
                <span className={`text-sm ${paymentMethod === "cash" ? "text-indigo-700" : "text-gray-600"}`} style={{ fontWeight: 700 }}>
                  {t("checkout.cash")}
                </span>
              </button>
            </div>

            {/* Card Form */}
            {paymentMethod === "card" && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-bold tracking-widest">{t("checkout.cardBrand")}</span>
                  <div className="flex gap-2">
                    <div className="w-8 h-5 bg-yellow-400 rounded-sm" />
                    <div className="w-8 h-5 bg-red-500 rounded-sm opacity-70" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-bold">{t("checkout.cardNumber")}</label>
                  <input
                    type="text"
                    value={formatCardNumber(cardNumber)}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 tracking-widest"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-bold">{t("checkout.cardExpiry")}</label>
                    <input
                      type="text"
                      value={formatExpiry(cardExpiry)}
                      onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder={t("checkout.cardExpiryPlaceholder")}
                      className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 tracking-widest"
                      style={{ fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-bold">CVC</label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="123"
                      className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 tracking-widest"
                      style={{ fontWeight: 600 }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Shield className="w-4 h-4" />
                  <span>{t("checkout.sslEncrypted")}</span>
                </div>
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-200 dark:border-amber-500/20">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-bold">{t("checkout.cashPayment")}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  {t("checkout.cashPaymentDesc")}
                </p>
              </div>
            )}

            {/* Tip */}
            <div>
              <h3 className="font-bold text-gray-700 text-sm mb-2">{t("checkout.courierTip")}</h3>
              <div className="flex gap-2">
                {[0, 2, 5, 10].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTipAmount(amount)}
                    className={`flex-1 py-3 rounded-xl text-sm transition-all ${
                      tipAmount === amount
                        ? "bg-indigo-500 text-white shadow-lg"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={{ fontWeight: 700 }}
                  >
                    {amount === 0 ? t("checkout.noTip") : `${amount} lei`}
                  </button>
                ))}
              </div>
            </div>

            {/* Final Order Summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-indigo-500" />
                {t("checkout.orderSummary")}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("checkout.productsLabel")} ({cartItems.length} db)</span>
                  <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} lei</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("checkout.deliveryFee")}</span>
                  <span style={{ fontWeight: 600 }}>{deliveryFee.toFixed(2)} lei</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("checkout.serviceFee")} (5%)</span>
                  <span style={{ fontWeight: 600 }}>{serviceFee.toFixed(2)} lei</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-indigo-600">
                    <span>{t("checkout.tip")}</span>
                    <span style={{ fontWeight: 600 }}>{tipAmount.toFixed(2)} lei</span>
                  </div>
                )}
                <div className="border-t border-indigo-200 pt-3 mt-3 flex justify-between items-end">
                  <span className="text-gray-900" style={{ fontWeight: 800 }}>{t("checkout.total")}</span>
                  <span className="text-2xl text-indigo-600" style={{ fontWeight: 800 }}>
                    {total.toFixed(2)} lei
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 5: CONFIRMATION ========== */}
        {step === "confirmation" && (
          <div className="px-4 py-8 space-y-6 max-w-2xl mx-auto">
            {/* Success Animation */}
            <div className="flex justify-center">
              <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl ring-8 ring-green-100">
                <CheckCircle2 className="w-14 h-14 text-white" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 800 }}>{t("checkout.orderSuccess")}</h2>
              <p className="text-gray-600">
                {t("checkout.orderReceivedAt")}
              </p>
            </div>

            {/* Order ID */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-200 inline-block">
                <div className="text-xs text-gray-500 font-bold mb-1">{t("checkout.orderNumber")}</div>
                <div className="text-2xl text-indigo-600 tracking-wider" style={{ fontWeight: 800 }}>
                  {orderId}
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t("checkout.deliveryAddress")}</div>
                  <div className="text-sm text-gray-600">
                    {address.zip} {address.city}, {address.street}
                    {address.floor ? ` (${address.floor})` : ""}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t("checkout.deliveryTime")}</div>
                  <div className="text-sm text-gray-600">
                    {selectedSlot?.dayName}, {selectedSlot?.date} — {selectedSlot?.timeRange}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t("checkout.paymentMethod")}</div>
                  <div className="text-sm text-gray-600">
                    {paymentMethod === "card" ? `${t("checkout.cardEnding")} ****${cardNumber.slice(-4)}` : t("checkout.cashOnDelivery")}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t("checkout.orderValue")}</div>
                  <div className="text-lg text-indigo-600" style={{ fontWeight: 800 }}>
                    {total.toFixed(2)} lei
                  </div>
                </div>
              </div>
            </div>

            {/* Ordered Items */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-500" />
                {t("checkout.orderedProducts")} ({cartItems.length})
              </h3>
              <div className="space-y-2">
                {cartItems.map((item, index) => (
                  <div key={`${item.product.id}-${index}`} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-2xl">{item.product.image}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{item.product.name}</div>
                      <div className="text-xs text-gray-500">{item.quantity} {item.product.unit}</div>
                    </div>
                    <div className="text-sm text-indigo-600" style={{ fontWeight: 700 }}>
                      {(item.product.price * (item.quantity / item.product.defaultQuantity)).toFixed(2)} lei
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracker */}
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Truck className="w-6 h-6" />
                <span style={{ fontWeight: 700 }}>{t("checkout.orderStatus")}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span className="text-sm text-white/90">{t("checkout.statusProcessing")}</span>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-3 h-3 bg-white/50 rounded-full" />
                  <span className="text-sm text-white/70">{t("checkout.statusAssembling")}</span>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-3 h-3 bg-white/50 rounded-full" />
                  <span className="text-sm text-white/70">{t("checkout.statusCourier")}</span>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-3 h-3 bg-white/50 rounded-full" />
                  <span className="text-sm text-white/70">{t("checkout.statusDelivery")}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pb-8">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                style={{ fontWeight: 700 }}
              >
                {t("checkout.backToHome")}
              </button>
              <button
                onClick={() => navigate("/shopping")}
                className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                style={{ fontWeight: 700 }}
              >
                {t("checkout.shoppingListBtn")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar - Fixed */}
      {step !== "confirmation" && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleNext}
              disabled={!canProceed() || isProcessing}
              className={`w-full py-4 rounded-2xl text-white flex items-center justify-center gap-3 transition-all shadow-lg ${
                canProceed() && !isProcessing
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-xl active:scale-[0.98]"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
              style={{ fontWeight: 700 }}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("checkout.processingPayment")}
                </>
              ) : (
                <>
                  {step === "payment" ? (
                    <>
                      <Shield className="w-5 h-5" />
                      {t("checkout.payAmount")} — {total.toFixed(2)} lei
                    </>
                  ) : (
                    <>
                      {t("checkout.next")}
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}