import { Link } from "react-router";
import { Home } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🍽️</span>
        </div>
        <h1 className="text-4xl text-foreground mb-2" style={{ fontWeight: 700 }}>404</h1>
        <h2 className="text-xl text-foreground mb-4" style={{ fontWeight: 600 }}>{t("notFound.title")}</h2>
        <p className="text-foreground/70 mb-8 max-w-md">
          {t("notFound.desc")}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          style={{ fontWeight: 500 }}
        >
          <Home className="w-5 h-5" />
          {t("notFound.backHome")}
        </Link>
      </div>
    </div>
  );
}