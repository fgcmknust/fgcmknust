// Tree-shaken Lucide icons.
//
// Previously the *entire* Lucide library (hundreds of icons) was downloaded
// from the unpkg CDN on every page load — a large third-party script for the
// ~34 icons this app actually uses, hurting mobile load time (Cloudflare Web
// Analytics flagged high Processing time on mobile).
//
// Instead we import only the icons referenced via `data-lucide` anywhere in the
// app and let Vite bundle just those. We then expose the exact same
// `window.lucide.createIcons(...)` API the call sites already use, so none of
// the ~30 call sites need to change.
//
// Note: Lucide's createIcons only accepts { icons, nameAttr, attrs } and always
// scans the whole document — it never supported the `{ root }` option the call
// sites pass, so spreading those options through is a harmless no-op and keeps
// behaviour identical to the old CDN global.
import {
  createIcons,
  AlertCircle, ArrowRight, Calendar, CalendarDays, CalendarX, Check,
  CheckCircle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck,
  Clock, Inbox, Info, KeyRound, LayoutDashboard, Lock, LogOut, Mail,
  MapPin, Menu, Phone, Plus, Quote, Receipt, RefreshCw, ShieldAlert,
  ShoppingBag, ShoppingCart, Trash2, UserRound, X, XCircle, UploadCloud,
  User, Users, UserCheck, UserPlus, Boxes, HandCoins, HeartHandshake,
  BarChart3, Search, Bell, Download, TrendingUp, TrendingDown,
  Settings, CalendarClock, CalendarCheck, Ellipsis, CircleCheck, CircleAlert,
  Eye, EyeOff, QrCode
} from 'lucide';

// Keys must be PascalCase: Lucide converts a `data-lucide="shopping-cart"`
// attribute to `ShoppingCart` and looks it up here. Keep this object in sync
// with the data-lucide values used across the app.
const icons = {
  AlertCircle, ArrowRight, Calendar, CalendarDays, CalendarX, Check,
  CheckCircle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck,
  Clock, Inbox, Info, KeyRound, LayoutDashboard, Lock, LogOut, Mail,
  MapPin, Menu, Phone, Plus, Quote, Receipt, RefreshCw, ShieldAlert,
  ShoppingBag, ShoppingCart, Trash2, UserRound, X, XCircle, UploadCloud,
  User, Users, UserCheck, UserPlus, Boxes, HandCoins, HeartHandshake,
  BarChart3, Search, Bell, Download, TrendingUp, TrendingDown,
  Settings, CalendarClock, CalendarCheck, Ellipsis, CircleCheck, CircleAlert,
  Eye, EyeOff, QrCode
};

window.lucide = {
  createIcons: (options = {}) => createIcons({ icons, ...options })
};
