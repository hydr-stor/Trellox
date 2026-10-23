import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpLeft,
  Check,
  Loader2,
  PackageOpen,
  X,
  Sun,
  Moon,
  ShoppingBag,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { brand } from "../../shared/brand";
import { useTheme } from "../context";
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="logo" aria-label={`${brand.name} — الرئيسية`}>
      <span className="logo-mark">
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span>
          {brand.name}
          <small>{brand.latin.toUpperCase()}</small>
        </span>
      )}
    </Link>
  );
}
export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      className="icon-button"
      onClick={toggle}
      aria-label={dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
export function Button({
  children,
  busy,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      className={`button ${className}`}
      disabled={props.disabled || busy}
    >
      {busy && <Loader2 className="spin" size={17} />} {children}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Alert({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <div
      className={`alert ${success ? "success" : ""}`}
      role={success ? "status" : "alert"}
    >
      {success && <Check size={17} />}
      <span>{children}</span>
    </div>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <PackageOpen size={42} strokeWidth={1.2} />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" />
      <span>نجهّز مساحتك…</span>
    </div>
  );
}
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="title-actions">{children}</div>
    </header>
  );
}
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="sheet-title"
    >
      <div className="sheet-content">
        <header>
          <h2 id="sheet-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ type: "spring", stiffness: 130, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}
export function ProductImage({
  src,
  title,
  className = "",
}: {
  src: string | null;
  title: string;
  className?: string;
}) {
  return src ? (
    <img
      className={`product-image ${className}`}
      src={src}
      alt={title}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div className={`product-image product-placeholder ${className}`}>
      <ShoppingBag strokeWidth={0.8} size={60} />
      <span>صورة المنتج</span>
    </div>
  );
}
export function Arrow() {
  return <ArrowUpLeft size={19} />;
}
