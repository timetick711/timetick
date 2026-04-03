-- تفعيل ميزة المزامنة اللحظية (Realtime) لجدول المنتجات
-- هذا الأمر يجعل قاعدة البيانات ترسل إشعاراً فورياً للمتجر عند إضافة، تعديل، أو حذف أي منتج.

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
